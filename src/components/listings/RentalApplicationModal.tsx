import React, { useState, useEffect } from 'react';
import { Property, RentalApplication, NotificationItem } from '../../types';
import { db } from '../../db/db';
import { db as firestoreDb, sanitizeForFirestore } from '../../db/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { offlineSyncService } from '../../services/offlineSync';
import { useAuth } from '../../context/AuthContext';
import { X, CheckCircle2, MessageCircle } from 'lucide-react';

interface RentalApplicationModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RentalApplicationModal: React.FC<RentalApplicationModalProps> = ({
  property,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();

  const [applicantName, setApplicantName] = useState(currentUser?.name || '');
  const [applicantPhone, setApplicantPhone] = useState(
    currentUser?.whatsappNumber || currentUser?.phone || ''
  );
  const [applicantEmail, setApplicantEmail] = useState(
    currentUser?.email && !currentUser.email.includes('guest@') ? currentUser.email : ''
  );
  const [moveInDate, setMoveInDate] = useState('');
  const [occupantsCount, setOccupantsCount] = useState(1);
  const [monthlyIncomeUsd, setMonthlyIncomeUsd] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [message, setMessage] = useState(
    `Hello ${property.landlordName}, I would like to formally apply to rent your property "${property.name}" in ${property.suburb}, ${property.city}.`
  );
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic Landlord Contact Synchronization
  const [activeLandlordPhone, setActiveLandlordPhone] = useState(property.landlordPhone);

  useEffect(() => {
    let isMounted = true;
    const fetchLatestLandlordPhone = async () => {
      try {
        const localLandlord = await db.users.get(property.landlordId);
        if (localLandlord && (localLandlord.whatsappNumber || localLandlord.phone)) {
          if (isMounted) setActiveLandlordPhone(localLandlord.whatsappNumber || localLandlord.phone);
          return;
        }

        const userSnap = await getDoc(doc(firestoreDb, 'users', property.landlordId));
        if (userSnap.exists()) {
          const data = userSnap.data();
          const phone = data.whatsappNumber || data.phone;
          if (phone && isMounted) {
            setActiveLandlordPhone(phone);
          }
        }
      } catch (e) {
        console.warn('Could not fetch landlord current WhatsApp line:', e);
      }
    };

    fetchLatestLandlordPhone();
    return () => {
      isMounted = false;
    };
  }, [property.landlordId, property.landlordPhone]);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser && currentUser.id !== 'user_guest' && currentUser.id !== 'guest_explorer') {
      if (!applicantName) setApplicantName(currentUser.name);
      if (!applicantPhone) setApplicantPhone(currentUser.whatsappNumber || currentUser.phone);
      if (!applicantEmail && !currentUser.email.includes('guest@')) setApplicantEmail(currentUser.email);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate mandatory fields
    if (!applicantName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!applicantPhone.trim()) {
      setFormError('Please enter your phone number for communications.');
      return;
    }
    if (!applicantEmail.trim()) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!moveInDate.trim()) {
      setFormError('Please select your proposed move-in date.');
      return;
    }
    if (!occupantsCount || occupantsCount < 1) {
      setFormError('Please enter a valid occupants count (minimum 1).');
      return;
    }
    if (!employmentStatus.trim()) {
      setFormError('Please choose your employment status / profession.');
      return;
    }
    if (!message.trim()) {
      setFormError('Please provide a message or intro for the landlord.');
      return;
    }

    const incomeValue = monthlyIncomeUsd ? Number(monthlyIncomeUsd) : undefined;
    const applicantId = currentUser?.id && currentUser.id !== 'user_guest' && currentUser.id !== 'guest_explorer'
      ? currentUser.id
      : `guest_applicant_${Date.now()}`;

    const newApplication: RentalApplication = {
      id: `app_${Date.now()}`,
      propertyId: property.id,
      propertyName: property.name,
      landlordId: property.landlordId,
      applicantId,
      applicantName: applicantName.trim(),
      applicantPhone: applicantPhone.trim(),
      applicantEmail: applicantEmail.trim(),
      proposedMoveInDate: moveInDate,
      occupantsCount: Number(occupantsCount),
      employmentStatus: employmentStatus.trim(),
      monthlyIncomeUsd: incomeValue,
      message: message.trim(),
      status: 'pending',
      appliedAt: Date.now(),
    };

    const cleanApplication = sanitizeForFirestore(newApplication);

    // 1. Save application into IndexedDB applications table
    await db.applications.put(cleanApplication);

    // 2. Persist application to Firestore applications collection or queue
    try {
      await setDoc(doc(firestoreDb, 'applications', newApplication.id), cleanApplication);
    } catch (err) {
      console.warn('Could not post application to Firestore online, enqueued:', err);
      await offlineSyncService.enqueueAction('submit_application', cleanApplication);
    }

    // 3. Create real-time in-app notification for the landlord
    const notifId = `notif_${Date.now()}`;
    const landlordNotification: NotificationItem = {
      id: notifId,
      userId: property.landlordId,
      title: `New Rental Application for ${property.name}`,
      message: `${applicantName.trim()} applied for "${property.name}". Move-in: ${moveInDate}. Employment: ${employmentStatus.trim()}. Occupants: ${occupantsCount}. Contact: ${applicantPhone.trim()}${incomeValue ? `, Income: $${incomeValue} USD` : ''}. Message: "${message.trim()}".`,
      type: 'application_update',
      read: false,
      timestamp: Date.now(),
      actionUrl: 'landlord',
    };

    // Save locally to IndexedDB notifications table
    await db.notifications.put(landlordNotification);

    // Persist in-app notification to Firestore so the landlord's device receives real-time alert
    try {
      await setDoc(doc(firestoreDb, 'notifications', notifId), sanitizeForFirestore(landlordNotification));
    } catch (notifErr) {
      console.warn('Could not post notification to Firestore:', notifErr);
    }

    // 4. Format WhatsApp message with full applicant and tenancy dossier
    const rentBasisLabel = property.rentBasis ? ` ${property.rentBasis}` : '/month';
    const waText =
      `*Rental Application - Comfort Housing Hub Zimbabwe*\n\n` +
      `*Property:* ${property.name}\n` +
      `*Address:* ${property.address}, ${property.suburb}, ${property.city}\n` +
      `*Rent:* $${property.rentUsd} USD${rentBasisLabel}\n` +
      `*Deposit:* $${property.depositUsd} USD\n\n` +
      `*--- Tenant Application Details ---*\n` +
      `*Applicant Name:* ${applicantName.trim()}\n` +
      `*Contact Phone:* ${applicantPhone.trim()}\n` +
      `*Email Address:* ${applicantEmail.trim()}\n` +
      `*Proposed Move-In Date:* ${moveInDate}\n` +
      `*Number of Occupants:* ${occupantsCount}\n` +
      `*Employment / Profession:* ${employmentStatus.trim()}\n` +
      `*Monthly Income:* ${incomeValue ? `$${incomeValue} USD` : 'Not specified'}\n` +
      `*Message from Applicant:*\n"${message.trim()}"\n\n` +
      `_Sent via Comfort Housing & Rental Hub (Offline-First Zimbabwe Platform)_`;

    // Normalize phone number for WhatsApp
    let cleanLandlordPhone = activeLandlordPhone.replace(/\D/g, '');
    if (cleanLandlordPhone.startsWith('0') && cleanLandlordPhone.length === 10) {
      cleanLandlordPhone = '263' + cleanLandlordPhone.substring(1);
    }
    const waUrl = `https://wa.me/${cleanLandlordPhone}?text=${encodeURIComponent(waText)}`;

    // Open WhatsApp link cleanly
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAppliedSuccess(true);
    if (onSuccess) onSuccess();

    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-5 animate-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Direct Landlord Application
            </span>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
              Apply for {property.name}
            </h3>
            <p className="text-xs text-slate-500">
              ${property.rentUsd} USD {property.rentBasis || '/month'} • {property.suburb}, {property.city}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {appliedSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-900">
              Application Submitted!
            </h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your rental application has been saved to the database, opened on WhatsApp to <strong>{property.landlordName}</strong>, and an in-app notification has been dispatched to the landlord’s dashboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={e => setApplicantName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phone Number (WhatsApp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={applicantPhone}
                  onChange={e => setApplicantPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={applicantEmail}
                  onChange={e => setApplicantEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Proposed Move-In Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={moveInDate}
                  onChange={e => setMoveInDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Number of Occupants <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={occupantsCount}
                  onChange={e => setOccupantsCount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monthly Income (USD)
                </label>
                <input
                  type="number"
                  placeholder="(Optional)"
                  value={monthlyIncomeUsd}
                  onChange={e => setMonthlyIncomeUsd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Employment / Profession <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={employmentStatus}
                onChange={e => setEmploymentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs bg-white text-slate-800 font-medium cursor-pointer"
              >
                <option value="">Select employment status...</option>
                <option value="Self Employed (Own Business)">Self Employed (Own Business)</option>
                <option value="Formally Employed">Formally Employed</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Choose Not to Say">Choose Not to Say</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Message to Landlord <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
              />
            </div>

            {/* Landlord Contact Info Strip (Dynamically Synchronized) */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-800">
                Landlord: {property.landlordName}
              </span>
              <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>WhatsApp Direct:</span>
                <strong className="text-emerald-950 font-bold">{activeLandlordPhone}</strong>
              </span>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold transition shadow-sm cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Submit Application on WhatsApp</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
