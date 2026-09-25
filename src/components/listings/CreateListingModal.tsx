import React, { useState } from 'react';
import { Property, PropertyType, AvailabilityStatus, RentBasis } from '../../types';
import {
  ZIMBABWE_PROVINCES,
  getCitiesByProvince,
  getSuburbsByCity,
} from '../../data/zimbabweLocations';
import { compressImage } from '../../services/imageCompression';
import { db } from '../../db/db';
import { db as firestoreDb } from '../../db/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { offlineSyncService } from '../../services/offlineSync';
import {
  X,
  Upload,
  Image as ImageIcon,
  Sun,
  Droplet,
  Wifi,
  Shield,
  Car,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface CreateListingModalProps {
  propertyToEdit?: Property | null;
  onClose: () => void;
  onCreated: (property: Property) => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  propertyToEdit,
  onClose,
  onCreated,
}) => {
  const { currentUser } = useAuth();

  const isEdit = !!propertyToEdit;

  const [name, setName] = useState(propertyToEdit?.name || '');
  const [propertyType, setPropertyType] = useState<PropertyType>(
    propertyToEdit?.propertyType || 'Cottage'
  );
  const [roomsAvailable, setRoomsAvailable] = useState<number>(
    propertyToEdit?.roomsAvailable || 1
  );
  const [rentUsd, setRentUsd] = useState<number>(propertyToEdit?.rentUsd || 250);
  const [rentBasis, setRentBasis] = useState<RentBasis>(
    propertyToEdit?.rentBasis || 'per month'
  );
  const [depositUsd, setDepositUsd] = useState<number>(
    propertyToEdit?.depositUsd || 250
  );
  const [selectedProvince, setSelectedProvince] = useState<string>(
    propertyToEdit?.province || 'Harare'
  );
  const [selectedCity, setSelectedCity] = useState<string>(
    propertyToEdit?.city || 'Harare'
  );
  const [selectedSuburb, setSelectedSuburb] = useState<string>(
    propertyToEdit?.suburb || 'Avondale'
  );
  const [customSuburb, setCustomSuburb] = useState<string>('');
  const [address, setAddress] = useState<string>(propertyToEdit?.address || '');
  const [bedrooms, setBedrooms] = useState<number>(propertyToEdit?.bedrooms || 1);
  const [bathrooms, setBathrooms] = useState<number>(propertyToEdit?.bathrooms || 1);
  const [availability, setAvailability] = useState<AvailabilityStatus>(
    propertyToEdit?.availability || 'Immediate'
  );
  const [availableDate, setAvailableDate] = useState<string>(
    propertyToEdit?.availableDate || '2026-10-01'
  );
  const [description, setDescription] = useState<string>(
    propertyToEdit?.description || ''
  );

  // Selected amenities - strictly physically chosen by landlord, never pre-populated with unverified amenities
  const [amenities, setAmenities] = useState<string[]>(
    propertyToEdit?.amenities || []
  );
  const [customAmenityInput, setCustomAmenityInput] = useState('');

  // Photos
  const [photos, setPhotos] = useState<string[]>(propertyToEdit?.photos || []);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [compressStats, setCompressStats] = useState<string>('');

  const propertyTypes: PropertyType[] = [
    'House',
    'Flat',
    'Apartment',
    'Cottage',
    'Room',
    'Shared Room',
    'Student Accommodation',
    'Boarding House',
    'Commercial Property',
    'Office',
    'Warehouse',
    'Land',
  ];

  const commonAmenitiesList = [
    'Solar Power',
    'Borehole Water',
    'Prepaid ZESA',
    'WiFi',
    'Walled & Gated',
    'Water Tank',
    'Parking',
    '24/7 Security',
    'Furnished',
    'Pet Friendly',
    'Backup Generator',
    'Paved Driveway',
  ];

  const cities = getCitiesByProvince(selectedProvince);
  const suburbs = getSuburbsByCity(selectedCity);

  const handleProvinceChange = (prov: string) => {
    setSelectedProvince(prov);
    const newCities = getCitiesByProvince(prov);
    const defaultCity = newCities[0] || '';
    setSelectedCity(defaultCity);
    const newSuburbs = getSuburbsByCity(defaultCity);
    setSelectedSuburb(newSuburbs[0] || '');
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    const newSuburbs = getSuburbsByCity(city);
    setSelectedSuburb(newSuburbs[0] || '');
  };

  const toggleAmenity = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter(a => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressing(true);
    let originalTotal = 0;
    let compressedTotal = 0;

    try {
      const newPhotoUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        originalTotal += file.size;

        // Perform fast on-device canvas compression
        const compressed = await compressImage(file, 1000, 750, 0.75);
        compressedTotal += compressed.compressedSizeBytes;
        newPhotoUrls.push(compressed.dataUrl);
      }

      setPhotos(prev => [...prev, ...newPhotoUrls]);
      const savedPercent = Math.round(
        ((originalTotal - compressedTotal) / (originalTotal || 1)) * 100
      );
      setCompressStats(
        `Compressed ${files.length} photo(s) on-device (saved ${savedPercent}% storage for offline use)`
      );
    } catch (err) {
      console.error('Image compression failed', err);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const suburbFinal = selectedSuburb === 'Other' ? customSuburb : selectedSuburb;

    // Approximate ZiG based on 1:27.5 rate
    const rentZig = Math.round(rentUsd * 27.5);

    const propertyId = propertyToEdit ? propertyToEdit.id : `prop_${Date.now()}`;

    const propertyData: Property = {
      id: propertyId,
      landlordId: currentUser.id,
      landlordName: currentUser.name,
      landlordPhone: currentUser.phone,
      landlordEmail: currentUser.email,
      name,
      propertyType,
      roomsAvailable:
        propertyType === 'Room' || propertyType === 'Shared Room'
          ? Number(roomsAvailable)
          : undefined,
      rentUsd: Number(rentUsd),
      rentZig,
      rentBasis,
      depositUsd: Number(depositUsd),
      province: selectedProvince,
      city: selectedCity,
      suburb: suburbFinal || 'Central',
      address: address || `${suburbFinal}, ${selectedCity}`,
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      photos:
        photos.length > 0
          ? photos
          : [
              'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&auto=format&fit=crop&q=80',
            ],
      amenities,
      description,
      availability,
      availableDate: availability === 'From Date' ? availableDate : undefined,
      occupiedAt:
        availability === 'Occupied'
          ? propertyToEdit?.occupiedAt || Date.now()
          : undefined,
      views: propertyToEdit ? propertyToEdit.views : 0,
      rating: propertyToEdit?.rating !== undefined ? propertyToEdit.rating : undefined,
      ratingCount: propertyToEdit ? propertyToEdit.ratingCount : 0,
      createdAt: propertyToEdit?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    if (propertyToEdit) {
      await db.properties.put(propertyData);
      try {
        await setDoc(doc(firestoreDb, 'properties', propertyId), propertyData);
      } catch (err) {
        console.warn('Could not update Firestore listing online, queued:', err);
        await offlineSyncService.enqueueAction('update_listing', propertyData);
      }
    } else {
      await db.properties.add(propertyData);
      try {
        await setDoc(doc(firestoreDb, 'properties', propertyId), propertyData);
      } catch (err) {
        console.warn('Could not post Firestore listing online, queued:', err);
        await offlineSyncService.enqueueAction('create_listing', propertyData);
      }
    }

    // Add local notification
    await db.notifications.add({
      id: `notif_${Date.now()}`,
      userId: currentUser.id,
      title: isEdit ? 'Listing Updated' : 'Listing Published Offline',
      message: `"${name}" was ${isEdit ? 'updated' : 'published and saved locally'}.`,
      type: 'property_match',
      read: false,
      timestamp: Date.now(),
    });

    onCreated(propertyData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">
              {isEdit ? 'Edit Property Listing' : 'Advertise Property (Offline-First)'}
            </h2>
            <p className="text-xs text-slate-300">
              Listings are saved immediately to your device & queued for sync
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
          {/* Property Name */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Property Headline / Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Spacious 2-Bed Cottage with 5kVA Solar & Prolific Borehole"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
            />
          </div>

          {/* Type & Availability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Property Type</label>
              <select
                value={propertyType}
                onChange={e => {
                  const val = e.target.value as PropertyType;
                  setPropertyType(val);
                  if (val === 'Room' || val === 'Shared Room') {
                    setRentBasis('per room');
                  } else if (val === 'House') {
                    setRentBasis('per house');
                  } else if (val === 'Commercial Property' || val === 'Warehouse') {
                    setRentBasis('per space');
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white text-xs"
              >
                {propertyTypes.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Availability</label>
              <select
                value={availability}
                onChange={e => setAvailability(e.target.value as AvailabilityStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white text-xs"
              >
                <option value="Immediate">Immediate</option>
                <option value="Next Month">Next Month</option>
                <option value="From Date">Specific Date (Choose Calendar)</option>
                <option value="Occupied">Occupied / Taken (Active 24h)</option>
              </select>
            </div>
          </div>

          {/* If Room is selected, specify number of rooms available */}
          {(propertyType === 'Room' || propertyType === 'Shared Room') && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
              <label className="block font-bold text-sky-950 text-xs">
                Number of Rooms Available *
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={roomsAvailable}
                onChange={e => setRoomsAvailable(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-sky-300 rounded-lg text-xs font-bold text-slate-900"
              />
              <p className="text-[10px] text-sky-700">
                Specify the exact quantity of rooms open for accommodation in this building.
              </p>
            </div>
          )}

          {/* If Specific Date is selected, calendar picker */}
          {availability === 'From Date' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <label className="block font-bold text-emerald-950 text-xs">
                Select Available From Date *
              </label>
              <input
                type="date"
                required
                value={availableDate}
                onChange={e => setAvailableDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-900"
              />
              <p className="text-[10px] text-emerald-700">
                The exact calendar date when this listing becomes ready for occupation.
              </p>
            </div>
          )}

          {/* Pricing with Rent Basis Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
            <div>
              <label className="block font-bold text-emerald-950 mb-1">
                Monthly Rent (USD $) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-bold text-slate-500">$</span>
                <input
                  type="number"
                  required
                  min={10}
                  value={rentUsd}
                  onChange={e => setRentUsd(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                />
              </div>
              <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                ~ZiG {Math.round(rentUsd * 27.5).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block font-bold text-emerald-950 mb-1">
                Rent Pricing Basis
              </label>
              <select
                value={rentBasis}
                onChange={e => setRentBasis(e.target.value as RentBasis)}
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="per month">per month</option>
                <option value="per room">per room</option>
                <option value="per house">per house</option>
                <option value="per space">per space</option>
                <option value="per bed">per bed</option>
              </select>
              <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                Billed {rentBasis}
              </p>
            </div>

            <div>
              <label className="block font-bold text-emerald-950 mb-1">
                Security Deposit (USD $) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-bold text-slate-500">$</span>
                <input
                  type="number"
                  required
                  min={0}
                  value={depositUsd}
                  onChange={e => setDepositUsd(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Refundable deposit</p>
            </div>
          </div>

          {/* Zimbabwe Location Database Pickers */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs">
              Zimbabwe Location (Preloaded Offline)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Province
                </label>
                <select
                  value={selectedProvince}
                  onChange={e => handleProvinceChange(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  {ZIMBABWE_PROVINCES.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  City / Town
                </label>
                <select
                  value={selectedCity}
                  onChange={e => handleCityChange(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  {cities.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Suburb / Growth Point
                </label>
                <select
                  value={selectedSuburb}
                  onChange={e => setSelectedSuburb(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  {suburbs.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="Other">Other / Not Listed</option>
                </select>
              </div>
            </div>

            {selectedSuburb === 'Other' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Enter Suburb / Area Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Newlands or Warren Park"
                  value={customSuburb}
                  onChange={e => setCustomSuburb(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Street Address or Landmark
              </label>
              <input
                type="text"
                placeholder="e.g. 14 Cambridge Road, near Avondale Shopping Centre"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Bedrooms / Bathrooms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Bedrooms</label>
              <input
                type="number"
                min={1}
                max={20}
                value={bedrooms}
                onChange={e => setBedrooms(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">Bathrooms</label>
              <input
                type="number"
                min={1}
                max={10}
                value={bathrooms}
                onChange={e => setBathrooms(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Photo Uploader with Aggressive Canvas Compression */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800">
                Property Photos (Client Compressed for Low Storage)
              </label>
              <span className="text-[11px] text-slate-500">
                {photos.length} uploaded
              </span>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition relative">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                disabled={compressing}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center space-y-1 text-slate-500">
                <Upload className="w-6 h-6 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {compressing
                    ? 'Compressing photos on-device...'
                    : 'Tap or drop photos to upload'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Compressed automatically to ~70KB WebP for fast offline storage
                </span>
              </div>
            </div>

            {compressStats && (
              <p className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                {compressStats}
              </p>
            )}

            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {photos.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-200 group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Amenities Checklist */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">
              Select Amenities & Infrastructure
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {commonAmenitiesList.map(a => {
                const checked = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl text-left border transition ${
                      checked
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        checked ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <span className="text-[11px] truncate">{a}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amenities physically entered by landlord */}
            <div className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type custom amenity (e.g. Swimming Pool, 5kVA Solar Inverter, Carport)..."
                value={customAmenityInput}
                onChange={e => setCustomAmenityInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (customAmenityInput.trim() && !amenities.includes(customAmenityInput.trim())) {
                      setAmenities([...amenities, customAmenityInput.trim()]);
                      setCustomAmenityInput('');
                    }
                  }
                }}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (customAmenityInput.trim() && !amenities.includes(customAmenityInput.trim())) {
                    setAmenities([...amenities, customAmenityInput.trim()]);
                    setCustomAmenityInput('');
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                + Add Amenity
              </button>
            </div>

            {/* Render any added custom amenities */}
            {amenities.filter(a => !commonAmenitiesList.includes(a)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {amenities
                  .filter(a => !commonAmenitiesList.includes(a))
                  .map(customA => (
                    <span
                      key={customA}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-lg"
                    >
                      <span>✓ {customA}</span>
                      <button
                        type="button"
                        onClick={() => toggleAmenity(customA)}
                        className="text-emerald-700 hover:text-emerald-950 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Detailed Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe solar system capacity (e.g. 5kVA), water backup, proximity to shopping centres/schools, security, and quietness..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={compressing || !name}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition disabled:opacity-50"
            >
              Publish Property Listing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
