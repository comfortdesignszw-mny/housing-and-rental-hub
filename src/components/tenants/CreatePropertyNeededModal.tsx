import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/db';
import { db as firestoreDb, sanitizeForFirestore } from '../../db/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { offlineSyncService } from '../../services/offlineSync';
import { PropertyNeeded } from '../../types';
import {
  X,
  Plus,
  Home,
  MapPin,
  Calendar,
  DollarSign,
  Phone,
  MessageCircle,
  CheckCircle2,
  FileText,
  Sparkles,
} from 'lucide-react';

interface CreatePropertyNeededModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (created: PropertyNeeded) => void;
}

const PROPERTY_TYPES_NEEDED = [
  '1 Room',
  '2 Rooms',
  '3 Rooms',
  'Bachelor Flat',
  '1 Bedroom Flat',
  '2 Bedroom Flat',
  '3 Bedroom Flat',
  'Cottage (1 Bed)',
  'Cottage (2 Bed)',
  'Full House',
  'Shared Room / Roommate',
  'Boarding House / Student Accommodation',
  'Commercial Space / Office',
];

const POPULAR_SUBURBS = [
  'Avondale',
  'Belvedere',
  'Borrowdale',
  'CBD',
  'Eastlea',
  'Greendale',
  'Hillside',
  'Mabelreign',
  'Mount Pleasant',
  'Newlands',
  'Prospect',
  'Waterfalls',
  'Westgate',
  'Other Suburb',
];

const PREFERRED_AMENITIES_OPTIONS = [
  'Borehole Water',
  'Prepaid ZESA',
  'Solar System',
  'Walled and Gated',
  'Parking Space',
  'Pet Friendly',
  'WiFi Available',
  'Own Entrance',
  'Water Tank / 5000L',
  'Backup Generator',
  'Tile Floors',
  'Fitted Kitchen',
  'En-suite Bathroom',
  'Security Guard / Rapid Response',
];

export const CreatePropertyNeededModal: React.FC<CreatePropertyNeededModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { currentUser } = useAuth();

  const [tenantName, setTenantName] = useState(currentUser?.name || '');
  const [tenantPhone, setTenantPhone] = useState(
    currentUser?.phone || currentUser?.whatsappNumber || '+263 '
  );
  const [tenantWhatsApp, setTenantWhatsApp] = useState(
    currentUser?.whatsappNumber || currentUser?.phone || '+263 '
  );
  const [tenantEmail, setTenantEmail] = useState(
    currentUser?.email && !currentUser.email.includes('guest@') ? currentUser.email : ''
  );
  const [propertyTypeNeeded, setPropertyTypeNeeded] = useState(PROPERTY_TYPES_NEEDED[0]);
  const [customPropertyType, setCustomPropertyType] = useState('');
  const [selectedCity, setSelectedCity] = useState('Harare');
  const [selectedSuburb, setSelectedSuburb] = useState(POPULAR_SUBURBS[0]);
  const [customSuburb, setCustomSuburb] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('Immediate');
  const [customDate, setCustomDate] = useState('');
  const [budgetUsd, setBudgetUsd] = useState<number | ''>(250);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Borehole Water',
    'Prepaid ZESA',
    'Walled and Gated',
  ]);
  const [description, setDescription] = useState('');
  const [contactPreference, setContactPreference] = useState<'WhatsApp' | 'Phone Call' | 'Both'>('Both');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!tenantName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!tenantWhatsApp.trim() && !tenantPhone.trim()) {
      setErrorMessage('Please provide a WhatsApp contact phone number.');
      return;
    }

    if (!budgetUsd || Number(budgetUsd) <= 0) {
      setErrorMessage('Please enter a valid monthly budget amount in USD.');
      return;
    }

    const finalPropertyType =
      propertyTypeNeeded === 'Other' && customPropertyType.trim()
        ? customPropertyType.trim()
        : propertyTypeNeeded;

    const finalSuburb =
      selectedSuburb === 'Other Suburb' && customSuburb.trim()
        ? customSuburb.trim()
        : selectedSuburb;

    const finalLocation = `${finalSuburb}, ${selectedCity}`;

    const finalAvailability =
      availabilityDate === 'Specific Date' && customDate
        ? `From ${customDate}`
        : availabilityDate;

    setIsSubmitting(true);

    try {
      const requestId = `need_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const tenantId =
        currentUser?.id && currentUser.id !== 'user_guest' && currentUser.id !== 'guest_explorer'
          ? currentUser.id
          : `tenant_${Date.now()}`;

      const newNeededRequest: PropertyNeeded = {
        id: requestId,
        tenantId,
        tenantName: tenantName.trim(),
        tenantPhone: tenantPhone.trim(),
        tenantWhatsApp: tenantWhatsApp.trim() || tenantPhone.trim(),
        tenantEmail: tenantEmail.trim() || undefined,
        propertyTypeNeeded: finalPropertyType,
        locationPreferred: finalLocation,
        city: selectedCity,
        suburb: finalSuburb,
        province: selectedCity === 'Bulawayo' ? 'Bulawayo' : 'Harare Province',
        availabilityDate: finalAvailability,
        amenitiesPreferred: selectedAmenities,
        budgetUsd: Number(budgetUsd),
        description: description.trim(),
        contactPreference,
        status: 'active',
        offersCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const cleanData = sanitizeForFirestore(newNeededRequest);

      // Save to IndexedDB
      await db.propertiesNeeded.put(cleanData);

      // Save to Firestore
      try {
        await setDoc(doc(firestoreDb, 'propertiesNeeded', requestId), cleanData);
      } catch (cloudErr) {
        console.warn('Could not post property needed request online, enqueued:', cloudErr);
        await offlineSyncService.enqueueAction('create_property_needed', cleanData);
      }

      // Add local in-app notification
      await db.notifications.add({
        id: `notif_${Date.now()}`,
        userId: tenantId,
        title: 'Rental Request Published',
        message: `Your request for "${finalPropertyType}" in ${finalLocation} (Budget: $${budgetUsd}/mo) is now active for Landlords & Agents to make offers.`,
        type: 'property_match',
        read: false,
        timestamp: Date.now(),
        actionUrl: 'landlord?tab=requests',
      });

      if (onCreated) {
        onCreated(newNeededRequest);
      }
      onClose();
    } catch (err: any) {
      console.error('Error creating property needed request:', err);
      setErrorMessage(err?.message || 'Failed to submit rental request. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-full inline-block">
              Tenant Accommodation Request
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Create Rental Property Needed</span>
            </h2>
            <p className="text-xs text-emerald-100">
              Tell Landlords & Verified Agents what property you need so they can send you direct offers.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Tenant Information */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Tenant Details & Contact Lines</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tenant Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tendai Moyo"
                  value={tenantName}
                  onChange={e => setTenantName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  WhatsApp Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-2.5 w-3.5 h-3.5 text-emerald-600" />
                  <input
                    type="tel"
                    required
                    placeholder="+263 77 123 4567"
                    value={tenantWhatsApp}
                    onChange={e => setTenantWhatsApp(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Calling Phone Line (Calls)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+263 71 987 6543"
                    value={tenantPhone}
                    onChange={e => setTenantPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Contact Preference
                </label>
                <select
                  value={contactPreference}
                  onChange={e => setContactPreference(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="Both">WhatsApp & Phone Calls</option>
                  <option value="WhatsApp">WhatsApp Only</option>
                  <option value="Phone Call">Phone Calls Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Property Requirements & Location */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span>2. Accommodation Needed & Preferred Location</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Property Needed for Rental <span className="text-rose-500">*</span>
                </label>
                <select
                  value={propertyTypeNeeded}
                  onChange={e => setPropertyTypeNeeded(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {PROPERTY_TYPES_NEEDED.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                  <option value="Other">Other (Specify below)</option>
                </select>
                {propertyTypeNeeded === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom accommodation needed"
                    value={customPropertyType}
                    onChange={e => setCustomPropertyType(e.target.value)}
                    className="mt-1.5 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Monthly Budget (USD $) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-3.5 h-3.5 text-emerald-700" />
                  <input
                    type="number"
                    min={20}
                    required
                    placeholder="e.g. 350"
                    value={budgetUsd}
                    onChange={e => setBudgetUsd(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-extrabold text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">City / Region</label>
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="Harare">Harare</option>
                  <option value="Bulawayo">Bulawayo</option>
                  <option value="Chitungwiza">Chitungwiza</option>
                  <option value="Mutare">Mutare</option>
                  <option value="Gweru">Gweru</option>
                  <option value="Masvingo">Masvingo</option>
                  <option value="Kwekwe">Kwekwe</option>
                  <option value="Victoria Falls">Victoria Falls</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Preferred Suburb</label>
                <select
                  value={selectedSuburb}
                  onChange={e => setSelectedSuburb(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {POPULAR_SUBURBS.map(suburb => (
                    <option key={suburb} value={suburb}>
                      {suburb}
                    </option>
                  ))}
                </select>
                {selectedSuburb === 'Other Suburb' && (
                  <input
                    type="text"
                    placeholder="Specify suburb name"
                    value={customSuburb}
                    onChange={e => setCustomSuburb(e.target.value)}
                    className="mt-1.5 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Move-In Availability</label>
                <select
                  value={availabilityDate}
                  onChange={e => setAvailabilityDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="Immediate">Immediate / Urgent</option>
                  <option value="Within 7 Days">Within 7 Days</option>
                  <option value="End of Month">End of this Month</option>
                  <option value="1st of Next Month">1st of Next Month</option>
                  <option value="Specific Date">Specific Date</option>
                </select>
                {availabilityDate === 'Specific Date' && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="mt-1.5 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Preferred Amenities */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                3. Preferred Amenities & Utilities
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedAmenities.length} selected
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Select key features you prioritize (e.g. continuous water, backup power, security):
            </p>

            <div className="flex flex-wrap gap-1.5">
              {PREFERRED_AMENITIES_OPTIONS.map(amenity => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    <span>{amenity}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Detailed Description */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              4. Detailed Requirements Description
            </h3>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Small family with one child looking for a neat cottage with reliable borehole and solar setup. Non-smokers, no pets. Prepared to pay upfront deposit. Looking around Avondale or Belgravia."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Action Buttons */}
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
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Publishing Request...' : 'Publish Property Needed Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
