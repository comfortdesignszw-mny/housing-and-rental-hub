import React, { useState } from 'react';
import { PropertyNeeded } from '../../types';
import { db } from '../../db/db';
import { db as firestoreDb, sanitizeForFirestore } from '../../db/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  X,
  Sparkles,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { ZIMBABWE_PROVINCES, getAllCitiesAndTowns } from '../../data/zimbabweLocations';

interface EditPropertyNeededModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyNeeded: PropertyNeeded | null;
  onUpdated?: () => void;
}

const COMMON_AMENITIES = [
  'Borehole Water',
  'Solar System / Inverter',
  'Prepaid ZESA',
  'Walled & Gated',
  'WiFi / Fiber Ready',
  'Parking Space',
  'Fitted Kitchen',
  'Ensuite Bathroom',
  'Tiled Floors',
  'Ceiling Fans',
  'Furnished',
  'Pet Friendly',
];

const PROPERTY_TYPES = [
  '1 Room',
  '2 Rooms',
  'Shared Room / Roommate',
  'Bedsitter',
  'Cottage',
  '1 Bedroom Flat',
  '2 Bedroom Flat',
  '3 Bedroom Flat',
  'Full House',
  'Commercial / Office Space',
  'Student Accommodation',
];

export const EditPropertyNeededModal: React.FC<EditPropertyNeededModalProps> = ({
  isOpen,
  onClose,
  propertyNeeded,
  onUpdated,
}) => {
  if (!isOpen || !propertyNeeded) return null;

  const allCities = getAllCitiesAndTowns();

  const [propertyTypeNeeded, setPropertyTypeNeeded] = useState(propertyNeeded.propertyTypeNeeded);
  const [city, setCity] = useState(propertyNeeded.city || 'Harare');
  const [suburb, setSuburb] = useState(propertyNeeded.suburb || '');
  const [locationPreferred, setLocationPreferred] = useState(propertyNeeded.locationPreferred);
  const [availabilityDate, setAvailabilityDate] = useState(propertyNeeded.availabilityDate);
  const [budgetUsd, setBudgetUsd] = useState(propertyNeeded.budgetUsd.toString());
  const [description, setDescription] = useState(propertyNeeded.description || '');
  const [amenitiesPreferred, setAmenitiesPreferred] = useState<string[]>(
    propertyNeeded.amenitiesPreferred || []
  );
  const [contactPreference, setContactPreference] = useState(
    propertyNeeded.contactPreference || 'Both'
  );
  const [status, setStatus] = useState(propertyNeeded.status || 'active');
  const [tenantPhone, setTenantPhone] = useState(propertyNeeded.tenantPhone || '');
  const [tenantWhatsApp, setTenantWhatsApp] = useState(
    propertyNeeded.tenantWhatsApp || propertyNeeded.tenantPhone || ''
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleAmenity = (item: string) => {
    if (amenitiesPreferred.includes(item)) {
      setAmenitiesPreferred(amenitiesPreferred.filter(a => a !== item));
    } else {
      setAmenitiesPreferred([...amenitiesPreferred, item]);
    }
  };

  const handleStatusToggle = () => {
    if (status === 'found') {
      setStatus('active');
    } else {
      setStatus('found');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedBudget = parseFloat(budgetUsd);
    if (!parsedBudget || parsedBudget <= 0) {
      setErrorMsg('Please enter a valid monthly budget in USD.');
      return;
    }

    if (!propertyTypeNeeded.trim()) {
      setErrorMsg('Please specify the type of property needed.');
      return;
    }

    if (!suburb.trim()) {
      setErrorMsg('Please specify your preferred suburb or area.');
      return;
    }

    setSaving(true);
    try {
      const isMarkedFound = status === 'found';
      const updatedFoundAt = isMarkedFound
        ? propertyNeeded.foundAt || Date.now()
        : undefined;

      const fullLocation = locationPreferred.trim() || `${suburb.trim()}, ${city.trim()}`;

      const updatedRecord: Partial<PropertyNeeded> = {
        propertyTypeNeeded: propertyTypeNeeded.trim(),
        city: city.trim(),
        suburb: suburb.trim(),
        locationPreferred: fullLocation,
        availabilityDate: availabilityDate.trim(),
        budgetUsd: parsedBudget,
        description: description.trim(),
        amenitiesPreferred,
        contactPreference,
        status: status as any,
        foundAt: updatedFoundAt,
        tenantPhone: tenantPhone.trim(),
        tenantWhatsApp: tenantWhatsApp.trim() || tenantPhone.trim(),
        updatedAt: Date.now(),
      };

      // 1. Update local Dexie table
      await db.propertiesNeeded.update(propertyNeeded.id, updatedRecord);

      // 2. Sync to Firestore
      try {
        const firestoreClean = sanitizeForFirestore(updatedRecord);
        await updateDoc(doc(firestoreDb, 'propertiesNeeded', propertyNeeded.id), firestoreClean);
      } catch (fErr) {
        console.warn('Could not sync updated PropertyNeeded to Firestore:', fErr);
      }

      setSaving(false);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Error updating PropertyNeeded:', err);
      setErrorMsg('Failed to update request. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">
                Edit Rental Property Needed
              </h3>
              <p className="text-xs text-slate-300">
                Update accommodation specifications, budget, or mark as found
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toggle Banner */}
        <div className="px-5 py-3 bg-teal-50/70 border-b border-teal-100 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Listing Status:
            </span>
            <span className="text-[11px] text-slate-500">
              {status === 'found'
                ? 'Marked as Found 🎉 (Disappears from active listings after 24 hrs)'
                : 'Active (Visible to landlords & agents for incoming offers)'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleStatusToggle}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              status === 'found'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{status === 'found' ? 'Property Found 🎉' : 'Mark as Found'}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Property Type Needed */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Property / Room Type Needed *
            </label>
            <select
              value={propertyTypeNeeded}
              onChange={e => setPropertyTypeNeeded(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-hidden font-medium"
            >
              {PROPERTY_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Location & Suburb */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                City / Town *
              </label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-hidden font-medium"
              >
                {allCities.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Preferred Suburb / Area *
              </label>
              <input
                type="text"
                placeholder="e.g. Avondale, Mt Pleasant, Hillside"
                value={suburb}
                onChange={e => {
                  setSuburb(e.target.value);
                  setLocationPreferred(`${e.target.value}, ${city}`);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-hidden font-medium"
                required
              />
            </div>
          </div>

          {/* Budget & Move-In Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Maximum Monthly Budget (USD $) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  placeholder="e.g. 250"
                  value={budgetUsd}
                  onChange={e => setBudgetUsd(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-hidden font-bold"
                  min="10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Move-in Date / Availability *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Immediate, End of Month, 1st Nov"
                  value={availabilityDate}
                  onChange={e => setAvailabilityDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-hidden font-medium"
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                WhatsApp Number *
              </label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="0771234567"
                  value={tenantWhatsApp}
                  onChange={e => setTenantWhatsApp(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-hidden font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Phone Number (Calls) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="0771234567"
                  value={tenantPhone}
                  onChange={e => setTenantPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-hidden font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Requested Amenities */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Requested Utilities & Features
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {COMMON_AMENITIES.map(amenity => {
                const checked = amenitiesPreferred.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                      checked
                        ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        checked ? 'text-teal-600' : 'text-slate-300'
                      }`}
                    />
                    <span className="truncate">{amenity}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Additional Details & Requirements
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Clean professional tenant looking for peaceful cottage with secure parking and consistent water supply..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 active:scale-98 text-white rounded-xl font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              {saving ? 'Saving Changes...' : 'Save Updates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
