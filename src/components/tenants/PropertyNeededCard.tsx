import React, { useState } from 'react';
import { PropertyNeeded } from '../../types';
import {
  MapPin,
  Calendar,
  DollarSign,
  MessageCircle,
  Phone,
  Building2,
  CheckCircle2,
  Sparkles,
  User,
  Clock,
  Heart,
  Eye,
  Share2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { db as firestoreDb } from '../../db/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { recordPropertyNeededView } from '../../services/statsService';
import { ShareModal } from '../common/ShareModal';

interface PropertyNeededCardProps {
  propertyNeeded: PropertyNeeded;
  onMakeOffer: (item: PropertyNeeded) => void;
  onRequireAuth?: () => void;
}

export const PropertyNeededCard: React.FC<PropertyNeededCardProps> = ({
  propertyNeeded,
  onMakeOffer,
  onRequireAuth,
}) => {
  const { currentUser } = useAuth();
  const [showShareModal, setShowShareModal] = useState(false);

  // Check if saved / liked by current user
  const isSaved = useLiveQuery(
    async () => {
      if (!currentUser) return false;
      const record = await db.savedPropertiesNeeded
        .where('userId')
        .equals(currentUser.id)
        .filter(s => s.propertyNeededId === propertyNeeded.id)
        .first();
      return !!record;
    },
    [currentUser?.id, propertyNeeded.id]
  );

  // Total saves count for this request
  const totalSaves = useLiveQuery(
    async () => {
      const records = await db.savedPropertiesNeeded
        .where('propertyNeededId')
        .equals(propertyNeeded.id)
        .count();
      return records;
    },
    [propertyNeeded.id]
  ) || 0;

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    try {
      const existing = await db.savedPropertiesNeeded
        .where('userId')
        .equals(currentUser.id)
        .filter(s => s.propertyNeededId === propertyNeeded.id)
        .first();

      if (existing) {
        await db.savedPropertiesNeeded.delete(existing.id);
        try {
          await deleteDoc(doc(firestoreDb, 'savedPropertiesNeeded', existing.id));
        } catch {
          // ignore offline sync
        }
      } else {
        const newRecord = {
          id: `save_need_${Date.now()}_${currentUser.id.substring(0, 5)}`,
          userId: currentUser.id,
          propertyNeededId: propertyNeeded.id,
          savedAt: Date.now(),
        };
        await db.savedPropertiesNeeded.add(newRecord);
        try {
          await setDoc(doc(firestoreDb, 'savedPropertiesNeeded', newRecord.id), newRecord);
        } catch {
          // ignore offline sync
        }
      }
    } catch (err) {
      console.warn('Error toggling saved property needed:', err);
    }
  };

  const handleCardClick = () => {
    recordPropertyNeededView(propertyNeeded.id, 'view');
  };

  const isFound = propertyNeeded.status === 'found' || propertyNeeded.status === 'fulfilled';

  // Calculate 24-hour disappearing countdown if property is found
  const getFoundCountdown = () => {
    if (!isFound) return null;
    const foundTimestamp = propertyNeeded.foundAt || propertyNeeded.updatedAt || propertyNeeded.createdAt;
    const elapsed = Date.now() - foundTimestamp;
    const remainingMs = 24 * 60 * 60 * 1000 - elapsed;
    if (remainingMs <= 0) return 'Found • Expired';
    const hours = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));
    return `Found 🎉 • Disappears in ${hours}h`;
  };

  const foundText = getFoundCountdown();

  const cleanWhatsApp = propertyNeeded.tenantWhatsApp?.replace(/\D/g, '') || '';
  const formattedWhatsApp =
    cleanWhatsApp.startsWith('0') && cleanWhatsApp.length === 10
      ? '263' + cleanWhatsApp.substring(1)
      : cleanWhatsApp;

  const waText = encodeURIComponent(
    `Hello ${propertyNeeded.tenantName}, I saw your accommodation request on ComfortHub for "${propertyNeeded.propertyTypeNeeded}" in ${propertyNeeded.locationPreferred} (Budget: $${propertyNeeded.budgetUsd}/mo). I have an available property and would love to discuss.`
  );

  return (
    <>
      <div
        onClick={handleCardClick}
        className="bg-white rounded-2xl border border-teal-200/80 hover:border-teal-400 shadow-2xs hover:shadow-md transition duration-150 flex flex-col justify-between overflow-hidden group"
      >
        {/* Top Banner Bar */}
        <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-white px-3.5 py-2 border-b border-teal-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isFound ? (
              <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 uppercase tracking-wide animate-in fade-in">
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>{foundText}</span>
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-900 bg-teal-100/70 border border-teal-200 px-2 py-0.5 rounded-full">
                  Tenant Request • Property Needed
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Social Share Button */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setShowShareModal(true);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition cursor-pointer"
              title="Share request to social media"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Heart Save Button */}
            <button
              type="button"
              onClick={handleToggleSave}
              className={`p-1 rounded-lg transition cursor-pointer flex items-center gap-0.5 text-[11px] font-bold ${
                isSaved
                  ? 'text-rose-600 bg-rose-50'
                  : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50/50'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save accommodation request'}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              {totalSaves > 0 && <span>{totalSaves}</span>}
            </button>

            {/* Real Views Count */}
            <div
              className="flex items-center gap-1 text-[11px] text-slate-400"
              title={`${propertyNeeded.views || 0} views`}
            >
              <Eye className="w-3 h-3 text-slate-400" />
              <span>{propertyNeeded.views || 0}</span>
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            {/* Header & Budget Row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                  <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[10px]">
                    {propertyNeeded.tenantName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-slate-800">{propertyNeeded.tenantName}</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200/60">
                    Verified Tenant
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base group-hover:text-teal-900 transition leading-snug">
                  Needs: {propertyNeeded.propertyTypeNeeded}
                </h3>
              </div>

              <div className="text-right shrink-0">
                <span className="text-lg font-black text-emerald-700 block">
                  ${propertyNeeded.budgetUsd}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block -mt-0.5">
                  Max Budget / mo
                </span>
              </div>
            </div>

            {/* Location & Availability Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs text-slate-600">
              <p className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate font-semibold text-slate-700">
                  {propertyNeeded.locationPreferred}
                </span>
              </p>
              <p className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-700">
                  Move-in: {propertyNeeded.availabilityDate}
                </span>
              </p>
            </div>

            {/* Preferred Amenities Pills */}
            {propertyNeeded.amenitiesPreferred && propertyNeeded.amenitiesPreferred.length > 0 && (
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Requested Utilities & Features:
                </span>
                <div className="flex flex-wrap gap-1">
                  {propertyNeeded.amenitiesPreferred.slice(0, 5).map(amenity => (
                    <span
                      key={amenity}
                      className="text-[10px] bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-teal-600" />
                      <span>{amenity}</span>
                    </span>
                  ))}
                  {propertyNeeded.amenitiesPreferred.length > 5 && (
                    <span className="text-[10px] text-slate-400 font-semibold px-1 py-0.5">
                      +{propertyNeeded.amenitiesPreferred.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Description */}
            {propertyNeeded.description && (
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                "{propertyNeeded.description}"
              </p>
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-medium">
                Offers received:{' '}
                <strong className="text-teal-800 font-extrabold">
                  {propertyNeeded.offersCount || 0}
                </strong>
              </span>
              <span className="text-slate-400">
                Prefers: {propertyNeeded.contactPreference || 'WhatsApp & Calls'}
              </span>
            </div>

            {/* CTA Buttons: Make an Offer, WhatsApp, and Call Button */}
            <div className="flex items-center gap-1.5">
              {/* Primary Action: Make an Offer (Disabled if property is found!) */}
              {isFound ? (
                <button
                  type="button"
                  disabled={true}
                  className="flex-1 py-2 px-3 bg-slate-100 text-slate-400 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200"
                  title="Tenant has found accommodation. Offers are closed."
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Property Found • Offers Closed</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onMakeOffer(propertyNeeded);
                  }}
                  className="flex-1 py-2 px-3 bg-teal-700 hover:bg-teal-800 active:scale-98 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Make an Offer</span>
                </button>
              )}

              {/* Direct WhatsApp Contact CTA */}
              {formattedWhatsApp && (
                <a
                  href={`https://wa.me/${formattedWhatsApp}?text=${waText}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition active:scale-98 cursor-pointer shrink-0"
                  title="WhatsApp Tenant directly"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              )}

              {/* Call Line CTA */}
              {propertyNeeded.tenantPhone && (
                <a
                  href={`tel:${propertyNeeded.tenantPhone.replace(/\s+/g, '')}`}
                  onClick={e => e.stopPropagation()}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer shrink-0"
                  title={`Call ${propertyNeeded.tenantName}`}
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Social Share Modal */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          propertyNeeded={propertyNeeded}
        />
      )}
    </>
  );
};
