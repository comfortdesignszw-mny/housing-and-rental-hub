import React, { useState } from 'react';
import {
  Property,
  PropertyType,
  AvailabilityStatus,
  RentBasis,
  ListingCategory,
  SalePaymentType,
} from '../../types';
import {
  ZIMBABWE_PROVINCES,
  getCitiesByProvince,
  getSuburbsByCity,
} from '../../data/zimbabweLocations';
import { compressImage } from '../../services/imageCompression';
import { db } from '../../db/db';
import { db as firestoreDb, sanitizeForFirestore } from '../../db/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { offlineSyncService } from '../../services/offlineSync';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Home,
  Tag,
  Briefcase,
  DollarSign,
  ShieldAlert,
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

  // Category: Rental or For Sale (Requirement 2)
  const [listingCategory, setListingCategory] = useState<ListingCategory>(
    propertyToEdit?.listingCategory || 'rental'
  );

  const [name, setName] = useState(propertyToEdit?.name || '');
  const [propertyType, setPropertyType] = useState<PropertyType>(
    propertyToEdit?.propertyType || 'House'
  );
  const [roomsAvailable, setRoomsAvailable] = useState<number>(
    propertyToEdit?.roomsAvailable || 1
  );

  // Rental specific pricing
  const [rentUsd, setRentUsd] = useState<number>(propertyToEdit?.rentUsd || 350);
  const [rentBasis, setRentBasis] = useState<RentBasis>(
    propertyToEdit?.rentBasis || 'per month'
  );
  const [depositUsd, setDepositUsd] = useState<number>(
    propertyToEdit?.depositUsd || 350
  );

  // Sale specific pricing
  const [askingPriceUsd, setAskingPriceUsd] = useState<number>(
    propertyToEdit?.askingPriceUsd ||
      (propertyToEdit?.listingCategory === 'sale' ? propertyToEdit.rentUsd : 55000)
  );
  const [paymentType, setPaymentType] = useState<SalePaymentType>(
    propertyToEdit?.paymentType || 'Once off payment'
  );

  // Agent Fee fields (Requirement 3)
  const isUserAgent = currentUser?.role === 'agent' || currentUser?.role === 'property_manager';
  const [isAgentListing, setIsAgentListing] = useState<boolean>(
    propertyToEdit?.isAgentListing ?? isUserAgent
  );
  const [agentFeeUsd, setAgentFeeUsd] = useState<number>(
    propertyToEdit?.agentFeeUsd || 0
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
  const [bedrooms, setBedrooms] = useState<number>(propertyToEdit?.bedrooms || 3);
  const [bathrooms, setBathrooms] = useState<number>(propertyToEdit?.bathrooms || 2);
  const [availability, setAvailability] = useState<AvailabilityStatus>(
    propertyToEdit?.availability || 'Immediate'
  );
  const [availableDate, setAvailableDate] = useState<string>(
    propertyToEdit?.availableDate || '2026-10-01'
  );
  const [description, setDescription] = useState<string>(
    propertyToEdit?.description || ''
  );

  // Selected amenities
  const [amenities, setAmenities] = useState<string[]>(
    propertyToEdit?.amenities || []
  );
  const [customAmenityInput, setCustomAmenityInput] = useState('');

  // Photos
  const [photos, setPhotos] = useState<string[]>(propertyToEdit?.photos || []);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [compressStats, setCompressStats] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

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

  // Agent fee calculations (Requirement 3: max 10% on rental, max 2% on sale)
  const maxAgentFeeAllowed =
    listingCategory === 'rental'
      ? Math.round(Number(rentUsd || 0) * 0.1)
      : Math.round(Number(askingPriceUsd || 0) * 0.02);

  const currentAgentFeePercentage =
    listingCategory === 'rental'
      ? rentUsd > 0
        ? Number(((agentFeeUsd / rentUsd) * 100).toFixed(1))
        : 0
      : askingPriceUsd > 0
      ? Number(((agentFeeUsd / askingPriceUsd) * 100).toFixed(1))
      : 0;

  const isFeeExceeded = isAgentListing && agentFeeUsd > maxAgentFeeAllowed;

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
    setFormError(null);
    if (!currentUser) return;

    // Validate agent fee limits
    if (isAgentListing && agentFeeUsd > maxAgentFeeAllowed) {
      const limitText =
        listingCategory === 'rental'
          ? `10% of monthly rent ($${maxAgentFeeAllowed})`
          : `2% of total sales price ($${maxAgentFeeAllowed.toLocaleString()})`;
      setFormError(`Agent fee cannot exceed ${limitText}. Please adjust the fee.`);
      return;
    }

    const suburbFinal = selectedSuburb === 'Other' ? customSuburb : selectedSuburb;

    const basePrice = listingCategory === 'sale' ? Number(askingPriceUsd) : Number(rentUsd);
    const rentZig = Math.round(basePrice * 27.5);

    const propertyId = propertyToEdit ? propertyToEdit.id : `prop_${Date.now()}`;

    const propertyData: Property = {
      id: propertyId,
      landlordId: currentUser.id,
      landlordName: currentUser.name,
      landlordPhone: currentUser.phone,
      landlordEmail: currentUser.email,
      name,
      propertyType,
      listingCategory,
      askingPriceUsd: listingCategory === 'sale' ? Number(askingPriceUsd) : undefined,
      paymentType: listingCategory === 'sale' ? paymentType : undefined,
      roomsAvailable:
        propertyType === 'Room' || propertyType === 'Shared Room'
          ? Number(roomsAvailable)
          : undefined,
      rentUsd: basePrice,
      rentZig,
      rentBasis: listingCategory === 'rental' ? rentBasis : undefined,
      depositUsd: listingCategory === 'rental' ? Number(depositUsd) : 0,
      isAgentListing,
      agentFeeUsd: isAgentListing && agentFeeUsd > 0 ? Number(agentFeeUsd) : undefined,
      agentFeePercentage:
        isAgentListing && agentFeeUsd > 0 ? currentAgentFeePercentage : undefined,
      agentName: isAgentListing ? currentUser.name || currentUser.companyName : undefined,
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

    const cleanPropertyData = sanitizeForFirestore(propertyData);

    if (propertyToEdit) {
      await db.properties.put(cleanPropertyData);
      try {
        await setDoc(doc(firestoreDb, 'properties', propertyId), cleanPropertyData);
      } catch (err) {
        console.warn('Could not update Firestore listing online, queued:', err);
        await offlineSyncService.enqueueAction('update_listing', cleanPropertyData);
      }
    } else {
      await db.properties.add(cleanPropertyData);
      try {
        await setDoc(doc(firestoreDb, 'properties', propertyId), cleanPropertyData);
      } catch (err) {
        console.warn('Could not post Firestore listing online, queued:', err);
        await offlineSyncService.enqueueAction('create_listing', cleanPropertyData);
      }
    }

    // Add local notification
    await db.notifications.add({
      id: `notif_${Date.now()}`,
      userId: currentUser.id,
      title: isEdit ? 'Listing Updated' : 'Listing Published',
      message: `"${name}" (${listingCategory === 'sale' ? 'For Sale' : 'For Rent'}) was ${
        isEdit ? 'updated' : 'published'
      } successfully.`,
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
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>{isEdit ? 'Edit Property Listing' : 'Advertise New Property Listing'}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 uppercase">
                {listingCategory === 'sale' ? 'For Sale' : 'For Rent'}
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Instant offline-first persistence • Synced to Zimbabwe cloud database
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Choose Listing Purpose: For Rent vs For Sale (Requirement 2) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              1. What type of listing are you creating? *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setListingCategory('rental')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                  listingCategory === 'rental'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    listingCategory === 'rental'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Rental Property</h4>
                  <p className="text-[10px] text-slate-500">Monthly lease or tenant sublet</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setListingCategory('sale')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                  listingCategory === 'sale'
                    ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20 text-amber-950 font-bold'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    listingCategory === 'sale'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Property for Sale</h4>
                  <p className="text-[10px] text-slate-500">Selling house, land, or building</p>
                </div>
              </button>
            </div>
          </div>

          {/* Property Headline */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Property Headline / Title *
            </label>
            <input
              type="text"
              required
              placeholder={
                listingCategory === 'sale'
                  ? 'e.g. Modern 4-Bed House for Sale with Title Deeds & Borehole'
                  : 'e.g. Spacious 2-Bed Cottage with 5kVA Solar & Prolific Borehole'
              }
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs font-medium"
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
              <label className="block font-bold text-slate-800 mb-1">Status / Availability</label>
              <select
                value={availability}
                onChange={e => setAvailability(e.target.value as AvailabilityStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white text-xs"
              >
                <option value="Immediate">
                  {listingCategory === 'sale' ? 'Available Immediately' : 'Immediate'}
                </option>
                <option value="Next Month">Next Month</option>
                <option value="From Date">Specific Date (Choose Calendar)</option>
                <option value="Occupied">
                  {listingCategory === 'sale' ? 'Mark Sold / Taken (Active 24h)' : 'Occupied / Taken (Active 24h)'}
                </option>
              </select>
            </div>
          </div>

          {/* Pricing Section (Requirement 2) */}
          {listingCategory === 'rental' ? (
            /* Rental Pricing */
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
          ) : (
            /* Properties for Sale: Replaced Monthly Rent & Rent Basis with Asking Price & Payment Type */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
              <div>
                <label className="block font-bold text-amber-950 mb-1">
                  Asking Price (USD $) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-500">$</span>
                  <input
                    type="number"
                    required
                    min={100}
                    value={askingPriceUsd}
                    onChange={e => setAskingPriceUsd(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 text-xs"
                    placeholder="e.g. 55000"
                  />
                </div>
                <p className="text-[10px] text-amber-800 mt-1 font-medium">
                  ~ZiG {Math.round(askingPriceUsd * 27.5).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block font-bold text-amber-950 mb-1">
                  Payment Type *
                </label>
                <select
                  value={paymentType}
                  onChange={e => setPaymentType(e.target.value as SalePaymentType)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="Once off payment">Once off payment</option>
                  <option value="Installments">Installments</option>
                  <option value="Negotiable">Negotiable</option>
                </select>
                <p className="text-[10px] text-amber-800 mt-1 font-medium">
                  Terms accepted by seller: {paymentType}
                </p>
              </div>
            </div>
          )}

          {/* Agent Fee Section (Requirement 3) */}
          <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAgentListing}
                  onChange={e => setIsAgentListing(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Enlist as Real Estate Agent / Include Agent Fee</span>
                </span>
              </label>
              {isUserAgent && (
                <span className="text-[10px] font-bold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">
                  Agent Account
                </span>
              )}
            </div>

            {isAgentListing && (
              <div className="pt-1 space-y-1.5">
                <label className="block font-bold text-indigo-950 text-xs">
                  Agent Fee (USD $)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-500">$</span>
                  <input
                    type="number"
                    min={0}
                    max={maxAgentFeeAllowed}
                    value={agentFeeUsd}
                    onChange={e => setAgentFeeUsd(Number(e.target.value))}
                    className={`w-full pl-7 pr-3 py-1.5 bg-white border rounded-lg focus:ring-2 font-bold text-xs text-slate-900 ${
                      isFeeExceeded
                        ? 'border-rose-500 focus:ring-rose-500 text-rose-900'
                        : 'border-indigo-300 focus:ring-indigo-500'
                    }`}
                    placeholder={`e.g. ${maxAgentFeeAllowed}`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={`font-semibold ${
                      isFeeExceeded ? 'text-rose-600 font-bold' : 'text-indigo-800'
                    }`}
                  >
                    {listingCategory === 'rental'
                      ? `Max allowed fee is 10% of monthly rent ($${maxAgentFeeAllowed})`
                      : `Max allowed fee is 2% of total sales price ($${maxAgentFeeAllowed.toLocaleString()})`}
                  </span>
                  <span className="text-slate-500">
                    Fee: {currentAgentFeePercentage}%
                  </span>
                </div>
                {isFeeExceeded && (
                  <p className="text-[11px] text-rose-600 font-bold">
                    ⚠️ Fee of ${agentFeeUsd} exceeds maximum permissible rate of $
                    {maxAgentFeeAllowed}.
                  </p>
                )}
              </div>
            )}
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
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
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
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
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
                  Suburb / Area
                </label>
                <select
                  value={selectedSuburb}
                  onChange={e => setSelectedSuburb(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
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
                  Specify Suburb Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madokero, Helensvale"
                  value={customSuburb}
                  onChange={e => setCustomSuburb(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Street / Physical Address
              </label>
              <input
                type="text"
                placeholder="e.g. 14 Bath Road, Avondale"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Rooms and Bathrooms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Bedrooms</label>
              <input
                type="number"
                min={0}
                max={20}
                value={bedrooms}
                onChange={e => setBedrooms(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">Bathrooms</label>
              <input
                type="number"
                min={1}
                max={15}
                value={bathrooms}
                onChange={e => setBathrooms(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Amenities Multi-Select */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              Verified Amenities & Features ({amenities.length} selected)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {commonAmenitiesList.map(a => {
                const isSelected = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`py-1.5 px-2.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="truncate">{a}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photos Upload with On-device compression */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              Property Photos ({photos.length})
            </label>
            <div className="flex items-center gap-3">
              <label className="px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-300 font-bold hover:bg-emerald-100 transition cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload Photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {compressing && (
                <span className="text-xs text-emerald-700 animate-pulse font-semibold">
                  Compressing for fast offline load...
                </span>
              )}
            </div>

            {compressStats && (
              <p className="text-[10px] text-emerald-700 font-medium">{compressStats}</p>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                {photos.map((p, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
                  >
                    <img src={p} alt="Listing" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
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

          {/* Sales Transaction Disclaimer Note (Requirement 2 Mandatory Disclaimer) */}
          {listingCategory === 'sale' && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-extrabold text-xs">
                  Important Sales & Legal Paperwork Disclaimer:
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900 font-medium">
                On selling properties, verify all paperwork and proof of payments and make sure you make Agreements of Sale documents before any transactions is finalised. This application does not guarantee any Agreement of Sale or Proof of Payment whatsoever.
              </p>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={compressing || !name || isFeeExceeded}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {listingCategory === 'sale' ? 'Publish Sale Listing' : 'Publish Rental Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
