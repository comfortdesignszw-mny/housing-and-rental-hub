import React, { useState } from 'react';
import { Property, RentalApplication } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { RentalApplicationModal } from './RentalApplicationModal';
import {
  X,
  MapPin,
  Bed,
  Bath,
  Sun,
  Droplet,
  Wifi,
  Phone,
  MessageSquare,
  Share2,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Calculator,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/db';
import { offlineSyncService } from '../../services/offlineSync';

interface PropertyDetailsProps {
  property: Property;
  onClose: () => void;
  onStartChat: (recipientId: string, recipientName: string, propertyId: string) => void;
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({
  property,
  onClose,
  onStartChat,
}) => {
  const { currentUser } = useAuth();
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Live property subscription so views and ratings update in real time
  const liveProperty = useLiveQuery(() => db.properties.get(property.id), [property.id]);
  const currentProp = liveProperty || property;

  // Track real views on mount
  React.useEffect(() => {
    if (property.id) {
      db.properties.where('id').equals(property.id).modify(p => {
        p.views = (p.views || 0) + 1;
      });
    }
  }, [property.id]);

  // Rent Calculator
  const [monthsAdvance, setMonthsAdvance] = useState(1);
  const totalMoveInCost = currentProp.depositUsd + currentProp.rentUsd * monthsAdvance;

  const handleRatingSubmit = async (stars: number) => {
    setUserRating(stars);
    const prevRating = currentProp.rating || 0;
    const prevCount = currentProp.ratingCount || 0;
    const newCount = prevCount + 1;
    const updatedRating = prevCount === 0 ? stars : Number(((prevRating * prevCount + stars) / newCount).toFixed(1));

    await db.properties.update(property.id, {
      rating: updatedRating,
      ratingCount: newCount,
    });
    showToast(`Real rating recorded! You rated ${stars} stars.`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property.name,
        text: `Check out this rental in ${property.suburb}, ${property.city} for $${property.rentUsd}/mo with Solar & Borehole on Comfort Housing Hub!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Listing link copied to clipboard!');
    }
  };

  // Live landlord profile subscription for real-time updated WhatsApp & phone contacts
  const landlordUser = useLiveQuery(() => db.users.get(property.landlordId), [property.landlordId]);
  const activeLandlordPhone = landlordUser?.whatsappNumber || landlordUser?.phone || property.landlordPhone;
  let cleanPhone = activeLandlordPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    cleanPhone = '263' + cleanPhone.substring(1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
              {property.propertyType}
            </span>
            <span className="text-xs text-slate-300">
              {property.suburb}, {property.city}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Share listing"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="bg-emerald-700 text-white text-xs font-semibold py-1.5 px-4 text-center animate-in fade-in duration-200">
            {toastMsg}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {/* Photos Gallery */}
          <div className="space-y-2">
            <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full rounded-2xl overflow-hidden bg-slate-100">
              <img
                src={property.photos[activePhotoIdx] || property.photos[0]}
                alt={property.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded-lg font-medium">
                {activePhotoIdx + 1} / {property.photos.length}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {property.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {property.photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhotoIdx(i)}
                    className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                      activePhotoIdx === i
                        ? 'border-emerald-600 scale-102'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Key Title & Pricing Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {property.propertyType}
                </span>
                {property.availability === 'Occupied' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                    Taken / Occupied
                  </span>
                )}
                {property.rentBasis && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    Billed {property.rentBasis}
                  </span>
                )}
                {property.roomsAvailable !== undefined && property.roomsAvailable > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-semibold border border-sky-200">
                    {property.roomsAvailable} {property.roomsAvailable === 1 ? 'Room' : 'Rooms'} Available
                  </span>
                )}
              </div>

              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {property.name}
              </h1>
              <p className="flex items-center gap-1.5 text-slate-500 text-xs sm:text-sm mt-1">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{property.address}</span>
              </p>

              {/* Real Data Stats: Views & Ratings */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                  <span className="font-bold text-slate-900">{currentProp.views || 0}</span>
                  <span className="text-slate-500">Real Views</span>
                </div>

                {currentProp.ratingCount && currentProp.ratingCount > 0 ? (
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg text-amber-900">
                    <span className="text-amber-500 font-bold">★</span>
                    <span className="font-extrabold">{currentProp.rating?.toFixed(1)}</span>
                    <span className="text-amber-700 text-[11px]">
                      ({currentProp.ratingCount} {currentProp.ratingCount === 1 ? 'rating' : 'ratings'})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-500">
                    <span className="text-slate-400">★</span>
                    <span>No ratings yet</span>
                  </div>
                )}

                {/* Quick Interactive Rating */}
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span>Rate:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingSubmit(star)}
                      className={`text-sm hover:scale-125 transition cursor-pointer ${
                        (userRating !== null && userRating >= star) ||
                        (userRating === null && currentProp.rating && currentProp.rating >= star)
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                      title={`Rate ${star} star`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <div className="flex items-baseline sm:justify-end gap-1.5">
                <span className="text-2xl font-black text-emerald-800">
                  ${property.rentUsd}
                </span>
                <span className="text-xs text-slate-500">
                  {property.rentBasis ? `/${property.rentBasis.replace('per ', '')}` : '/month'}
                </span>
              </div>
              {property.rentZig && (
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-emerald-200">
                  ~ZiG {property.rentZig.toLocaleString()}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                Deposit: ${property.depositUsd} (Refundable)
              </p>
            </div>
          </div>

          {/* Quick Specs Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
              <Bed className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-bold">Bedrooms</p>
                <p className="text-sm font-extrabold text-slate-900">{property.bedrooms} Bed</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
              <Bath className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-bold">Bathrooms</p>
                <p className="text-sm font-extrabold text-slate-900">{property.bathrooms} Bath</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-bold">Availability</p>
                <p className="text-sm font-extrabold text-slate-900">{property.availability}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-bold">ZESA Meter</p>
                <p className="text-sm font-extrabold text-slate-900">Prepaid</p>
              </div>
            </div>
          </div>

          {/* Zimbabwe Utility Guarantee Highlights */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Zimbabwe Infrastructure Verification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                <Sun className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Solar Power System:</strong>
                  <p className="text-slate-600 text-[11px]">
                    Installed with battery backup so WiFi, refrigeration & lighting stay active during load shedding.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                <Droplet className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Reliable Borehole & Tank:</strong>
                  <p className="text-slate-600 text-[11px]">
                    Prolific borehole water connected to pressure booster pump and high-capacity storage tank.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">About This Property</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Amenities Grid */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2.5">Included Amenities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {property.amenities.map((amenity, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Move-in Cost Estimator Widget */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Move-In Budget Estimator
                </h4>
              </div>
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                {showCalculator ? 'Hide' : 'Calculate'}
              </button>
            </div>

            {showCalculator && (
              <div className="space-y-3 pt-2 text-xs text-slate-700 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span>Advance Rent Months:</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMonthsAdvance(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          monthsAdvance === m
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        {m} mo
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between">
                    <span>1st Month Rent ({monthsAdvance}x):</span>
                    <span className="font-semibold">${property.rentUsd * monthsAdvance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Deposit (Refundable):</span>
                    <span className="font-semibold">${property.depositUsd}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-900 text-sm">
                    <span>Estimated Total Move-in:</span>
                    <span className="text-emerald-800">${totalMoveInCost}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 italic text-center pt-2 border-t border-dashed border-slate-200 mt-1">
                    In some cases, agents fees may apply.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Landlord Contact Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Advertised By Landlord / Agent
              </p>
              <h4 className="text-base font-bold text-white mt-0.5">
                {property.landlordName}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Phone: {activeLandlordPhone}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <a
                href={`tel:${cleanPhone}`}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold px-3 py-2 rounded-xl transition"
              >
                <Phone className="w-3.5 h-3.5" />
                Call
              </a>

              <a
                href={`https://wa.me/${cleanPhone}?text=Hello, I am inquiring about your property "${property.name}" on Comfort Housing Hub.`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
              >
                WhatsApp
              </a>

              <button
                onClick={() => {
                  onClose();
                  onStartChat(property.landlordId, property.landlordName, property.id);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition border border-slate-700"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                App Chat
              </button>
            </div>
          </div>
        </div>

        {/* Footer Fixed Actions */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-slate-500">Rent: </span>
            <span className="font-extrabold text-slate-900 text-base">
              ${property.rentUsd}
            </span>
            <span className="text-slate-400">/mo</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApplyModal(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95"
            >
              Apply for Rental
            </button>
          </div>
        </div>
      </div>

      {/* Apply for Rental Modal */}
      <RentalApplicationModal
        property={currentProp}
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={() => showToast('Application submitted on WhatsApp & recorded!')}
      />
    </div>
  );
};
