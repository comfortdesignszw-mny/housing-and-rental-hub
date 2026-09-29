import React, { useState } from 'react';
import { PropertyNeeded, PropertyOffer, Property } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/db';
import { db as firestoreDb, sanitizeForFirestore } from '../../db/firebase';
import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { offlineSyncService } from '../../services/offlineSync';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  X,
  Building2,
  DollarSign,
  MapPin,
  CheckCircle2,
  MessageCircle,
  Phone,
  Send,
  Home,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface MakePropertyOfferModalProps {
  propertyNeeded: PropertyNeeded;
  isOpen: boolean;
  onClose: () => void;
  onOfferSent?: (offer: PropertyOffer) => void;
}

export const MakePropertyOfferModal: React.FC<MakePropertyOfferModalProps> = ({
  propertyNeeded,
  isOpen,
  onClose,
  onOfferSent,
}) => {
  const { currentUser } = useAuth();

  // Load landlord's existing properties to offer directly
  const myProperties =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.properties
          .where('landlordId')
          .equals(currentUser.id)
          .filter(p => p.availability !== 'Occupied')
          .toArray();
      },
      [currentUser?.id],
      []
    ) || [];

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('custom');
  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState(propertyNeeded.propertyTypeNeeded);
  const [location, setLocation] = useState(propertyNeeded.locationPreferred);
  const [rentUsd, setRentUsd] = useState<number | ''>(propertyNeeded.budgetUsd || 300);
  const [depositUsd, setDepositUsd] = useState<number | ''>(propertyNeeded.budgetUsd || 300);
  const [availableFrom, setAvailableFrom] = useState('Immediate');
  const [amenities, setAmenities] = useState<string[]>(propertyNeeded.amenitiesPreferred || []);
  const [notes, setNotes] = useState(
    `Hello ${propertyNeeded.tenantName}, I have a verified ${propertyNeeded.propertyTypeNeeded} available in ${propertyNeeded.locationPreferred} matching your preferences.`
  );
  const [landlordName, setLandlordName] = useState(
    currentUser?.name || currentUser?.companyName || ''
  );
  const [landlordWhatsApp, setLandlordWhatsApp] = useState(
    currentUser?.whatsappNumber || currentUser?.phone || '+263 '
  );
  const [landlordPhone, setLandlordPhone] = useState(
    currentUser?.phone || currentUser?.whatsappNumber || '+263 '
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectExistingProperty = (propId: string) => {
    setSelectedPropertyId(propId);
    if (propId === 'custom') return;

    const prop = myProperties.find(p => p.id === propId);
    if (prop) {
      setPropertyName(prop.name);
      setPropertyType(prop.propertyType);
      setLocation(`${prop.suburb}, ${prop.city}`);
      setRentUsd(prop.rentUsd);
      setDepositUsd(prop.depositUsd || prop.rentUsd);
      setAvailableFrom(prop.availability);
      setAmenities(prop.amenities || []);
      setNotes(
        `Hello ${propertyNeeded.tenantName}, I have this verified listing available on Comfort Housing: "${prop.name}" for $${prop.rentUsd}/mo. Features: ${prop.amenities?.slice(0, 4).join(', ')}.`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!propertyName.trim()) {
      setErrorMessage('Please provide a property title or address.');
      return;
    }
    if (!rentUsd || Number(rentUsd) <= 0) {
      setErrorMessage('Please specify the monthly rent in USD.');
      return;
    }
    if (!landlordWhatsApp.trim()) {
      setErrorMessage('Please provide your WhatsApp contact number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const offerId = `offer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const landlordId =
        currentUser?.id && currentUser.id !== 'user_guest' && currentUser.id !== 'guest_explorer'
          ? currentUser.id
          : `owner_${Date.now()}`;

      const newOffer: PropertyOffer = {
        id: offerId,
        propertyNeededId: propertyNeeded.id,
        tenantId: propertyNeeded.tenantId,
        tenantName: propertyNeeded.tenantName,
        landlordId,
        landlordName: landlordName.trim() || 'Property Owner',
        landlordRole: currentUser?.role || 'landlord',
        landlordPhone: landlordPhone.trim(),
        landlordWhatsApp: landlordWhatsApp.trim(),
        propertyId: selectedPropertyId !== 'custom' ? selectedPropertyId : undefined,
        propertyName: propertyName.trim(),
        propertyType,
        location: location.trim(),
        rentUsd: Number(rentUsd),
        depositUsd: Number(depositUsd || 0),
        availableFrom,
        amenities,
        notes: notes.trim(),
        status: 'pending',
        createdAt: Date.now(),
      };

      const cleanOffer = sanitizeForFirestore(newOffer);

      // 1. Save offer locally in Dexie
      await db.propertyOffers.put(cleanOffer);

      // 2. Persist offer to Firestore
      try {
        await setDoc(doc(firestoreDb, 'propertyOffers', offerId), cleanOffer);
      } catch (cloudErr) {
        console.warn('Could not post property offer to Firestore online, enqueued:', cloudErr);
        await offlineSyncService.enqueueAction('make_property_offer', cleanOffer);
      }

      // 3. Increment offersCount on propertyNeeded locally and in Firestore
      try {
        await db.propertiesNeeded.update(propertyNeeded.id, {
          offersCount: (propertyNeeded.offersCount || 0) + 1,
        });
        await updateDoc(doc(firestoreDb, 'propertiesNeeded', propertyNeeded.id), {
          offersCount: increment(1),
          updatedAt: Date.now(),
        });
      } catch (incErr) {
        console.warn('Could not increment offers count online:', incErr);
      }

      // 4. Send in-app notification to the tenant
      const notifId = `notif_${Date.now()}`;
      const tenantNotification = {
        id: notifId,
        userId: propertyNeeded.tenantId,
        title: `New Property Offer from ${newOffer.landlordName}`,
        message: `${newOffer.landlordName} offered "${newOffer.propertyName}" ($${newOffer.rentUsd}/mo in ${newOffer.location}) for your accommodation request.`,
        type: 'property_offer' as const,
        read: false,
        timestamp: Date.now(),
        actionUrl: `landlord?tab=offers&offerId=${offerId}`,
      };

      await db.notifications.put(tenantNotification);
      try {
        await setDoc(doc(firestoreDb, 'notifications', notifId), sanitizeForFirestore(tenantNotification));
      } catch (notifErr) {
        console.warn('Could not post offer notification to Firestore online:', notifErr);
      }

      setSentSuccess(true);
      if (onOfferSent) {
        onOfferSent(newOffer);
      }
    } catch (err: any) {
      console.error('Error submitting property offer:', err);
      setErrorMessage(err?.message || 'Failed to submit offer. Please check details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenWhatsAppToTenant = () => {
    let cleanPhone = propertyNeeded.tenantWhatsApp.replace(/\D/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '263' + cleanPhone.substring(1);
    }

    const waText =
      `*Property Offer from Comfort Housing Hub*\n\n` +
      `Hello ${propertyNeeded.tenantName},\n` +
      `I saw your request for *${propertyNeeded.propertyTypeNeeded}* in *${propertyNeeded.locationPreferred}* (Budget: $${propertyNeeded.budgetUsd}/mo).\n\n` +
      `I have an accommodation offer for you:\n` +
      `*Property:* ${propertyName}\n` +
      `*Type:* ${propertyType}\n` +
      `*Location:* ${location}\n` +
      `*Monthly Rent:* $${rentUsd} USD\n` +
      `*Deposit:* $${depositUsd} USD\n` +
      `*Availability:* ${availableFrom}\n` +
      `*Message:* "${notes}"\n\n` +
      `Offered by: ${landlordName} (${landlordWhatsApp})\n` +
      `_Sent via Comfort Housing Hub Zimbabwe_`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-full inline-block">
              Landlord & Agent Action
            </span>
            <h2 className="text-lg font-black mt-0.5 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-300" />
              <span>Make an Offer to {propertyNeeded.tenantName}</span>
            </h2>
            <p className="text-xs text-emerald-100">
              Needs: <strong>{propertyNeeded.propertyTypeNeeded}</strong> in{' '}
              <strong>{propertyNeeded.locationPreferred}</strong> • Budget: $
              {propertyNeeded.budgetUsd}/mo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Offer Dispatched to {propertyNeeded.tenantName}!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                Your offer for <strong>{propertyName}</strong> ($ {rentUsd} / mo) has been sent directly to the tenant's <strong>Property Owners Offers</strong> section and notified on their device.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-left text-xs space-y-1">
              <p className="font-bold text-emerald-950">Next Step: Instant WhatsApp Confirmation</p>
              <p className="text-emerald-800 text-[11px]">
                You can also message {propertyNeeded.tenantName} directly on WhatsApp to expedite the viewing or agreement.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
              <button
                type="button"
                onClick={handleOpenWhatsAppToTenant}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Open WhatsApp Chat with Tenant</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[78vh] overflow-y-auto text-xs">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs">
                {errorMessage}
              </div>
            )}

            {/* Tenant Requested Amenities Strip */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
              <span className="font-bold text-slate-700 text-[11px] block uppercase tracking-wider">
                Tenant’s Desired Amenities:
              </span>
              <div className="flex flex-wrap gap-1">
                {propertyNeeded.amenitiesPreferred?.map(a => (
                  <span
                    key={a}
                    className="text-[10px] bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md"
                  >
                    ✓ {a}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Fill from My Properties */}
            {myProperties.length > 0 && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select from your existing listings (Auto-fill)
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={e => handleSelectExistingProperty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="custom">✏️ Enter custom offer details</option>
                  {myProperties.map(p => (
                    <option key={p.id} value={p.id}>
                      🏠 {p.name} — ${p.rentUsd}/mo ({p.suburb})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Property Title & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Offered Property Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern 2 Bed Cottage with Solar & Borehole"
                  value={propertyName}
                  onChange={e => setPropertyName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Accommodation Type</label>
                <input
                  type="text"
                  required
                  value={propertyType}
                  onChange={e => setPropertyType(e.target.value)}
                  placeholder="e.g. Cottage, 2 Bedroom Flat, Room"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            {/* Location & Move-In Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Exact Location / Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Avondale, Harare"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Available Move-in</label>
                <input
                  type="text"
                  value={availableFrom}
                  onChange={e => setAvailableFrom(e.target.value)}
                  placeholder="e.g. Immediate, From 1st of month"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            {/* Financials: Rent & Deposit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">
              <div>
                <label className="block font-bold text-emerald-950 mb-1">
                  Proposed Monthly Rent (USD $) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-3.5 h-3.5 text-emerald-700" />
                  <input
                    type="number"
                    min={10}
                    required
                    value={rentUsd}
                    onChange={e => setRentUsd(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-extrabold text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-emerald-800 mt-0.5">
                  Tenant's max budget: ${propertyNeeded.budgetUsd}/mo
                </p>
              </div>

              <div>
                <label className="block font-bold text-emerald-950 mb-1">
                  Security Deposit (USD $)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="number"
                    min={0}
                    value={depositUsd}
                    onChange={e => setDepositUsd(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Refundable deposit</p>
              </div>
            </div>

            {/* Note / Message to Tenant */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Message / Details for {propertyNeeded.tenantName}
              </label>
              <textarea
                rows={3}
                required
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Mention key details like solar inverter capacity, borehole water, security, viewing availability, etc."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            {/* Landlord Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Your Name / Agency <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={landlordName}
                  onChange={e => setLandlordName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  WhatsApp Contact Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={landlordWhatsApp}
                  onChange={e => setLandlordWhatsApp(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-extrabold shadow-md transition cursor-pointer flex items-center justify-center gap-2 text-xs disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending Offer...' : 'Send Property Offer to Tenant'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
