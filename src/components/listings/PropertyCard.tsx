import React, { useState } from 'react';
import { Property } from '../../types';
import {
  Bed,
  Bath,
  Sun,
  Droplet,
  Wifi,
  Heart,
  Scale,
  MapPin,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  Home,
  Tag,
  Briefcase,
} from 'lucide-react';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { recordPropertyView } from '../../services/statsService';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  onToggleCompare: (property: Property) => void;
  onApply?: (property: Property) => void;
  onMessageOwner?: (property: Property) => void;
  isCompared: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onSelect,
  onToggleCompare,
  onApply,
  onMessageOwner,
  isCompared,
}) => {
  const { currentUser } = useAuth();
  const [imgLoaded, setImgLoaded] = useState(false);

  // Check if saved
  const isSaved = useLiveQuery(
    async () => {
      if (!currentUser) return false;
      const record = await db.savedProperties
        .where('userId')
        .equals(currentUser.id)
        .filter(s => s.propertyId === property.id)
        .first();
      return !!record;
    },
    [currentUser?.id, property.id]
  );

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    const existing = await db.savedProperties
      .where('userId')
      .equals(currentUser.id)
      .filter(s => s.propertyId === property.id)
      .first();

    if (existing) {
      await db.savedProperties.delete(existing.id);
    } else {
      await db.savedProperties.add({
        id: `saved_${Date.now()}_${property.id}`,
        userId: currentUser.id,
        propertyId: property.id,
        savedAt: Date.now(),
      });
    }
  };

  const hasSolar = property.amenities.some(a =>
    a.toLowerCase().includes('solar')
  );
  const hasBorehole = property.amenities.some(a =>
    a.toLowerCase().includes('borehole')
  );
  const hasWifi = property.amenities.some(a =>
    a.toLowerCase().includes('wifi')
  );

  const mainPhoto =
    property.photos?.[0] ||
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&auto=format&fit=crop&q=80';

  const getOccupiedCountdown = () => {
    if (property.availability !== 'Occupied') return null;
    const occupiedTimestamp = property.occupiedAt || property.updatedAt || property.createdAt;
    const elapsed = Date.now() - occupiedTimestamp;
    const remainingMs = 24 * 60 * 60 * 1000 - elapsed;
    if (remainingMs <= 0) return 'Taken (Expired)';
    const hours = Math.ceil(remainingMs / (1000 * 60 * 60));
    return `Taken • Disappears in ${hours}h`;
  };

  const occupiedText = getOccupiedCountdown();

  return (
    <div
      onClick={() => {
        recordPropertyView(property.id, 'expand_details');
        onSelect(property);
      }}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col relative"
    >
      {/* Photo Container */}
      <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden">
        {/* Placeholder shimmer before load */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center text-slate-400 text-xs">
            Loading...
          </div>
        )}
        <img
          src={mainPhoto}
          alt={property.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-103 transition-transform duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 items-center">
          {/* Badge whether For Sale or For Rent (Requirement 2) */}
          {property.listingCategory === 'sale' ? (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 uppercase tracking-wide">
              <Tag className="w-2.5 h-2.5 stroke-[2.5]" />
              For Sale
            </span>
          ) : (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 uppercase tracking-wide">
              <Home className="w-2.5 h-2.5 stroke-[2.5]" />
              For Rent
            </span>
          )}

          <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg">
            {property.propertyType}
          </span>
          {property.isAgentListing && (
            <span className="bg-indigo-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
              <Briefcase className="w-2.5 h-2.5" />
              Agent
            </span>
          )}
          {property.availability === 'Occupied' ? (
            <span className="bg-rose-600/95 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <Clock className="w-2.5 h-2.5" />
              {occupiedText}
            </span>
          ) : property.availability === 'Immediate' ? (
            <span className="bg-emerald-600/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Immediate
            </span>
          ) : null}
          {property.roomsAvailable !== undefined && property.roomsAvailable > 0 && (
            <span className="bg-sky-600/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
              {property.roomsAvailable} Rooms Open
            </span>
          )}
        </div>

        {/* Action icons right: Favorite + Compare */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <button
            onClick={e => {
              e.stopPropagation();
              onToggleCompare(property);
            }}
            className={`p-1.5 rounded-full backdrop-blur-md transition ${
              isCompared
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white/80 text-slate-700 hover:bg-white'
            }`}
            title="Compare property"
          >
            <Scale className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleFavorite}
            className={`p-1.5 rounded-full backdrop-blur-md transition ${
              isSaved
                ? 'bg-rose-500 text-white'
                : 'bg-white/80 text-slate-700 hover:bg-white hover:text-rose-500'
            }`}
            title="Save property"
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Key Zimbabwe Amenities Banner Over Photo Bottom */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          {hasSolar && (
            <span className="bg-amber-500/90 backdrop-blur-xs text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
              <Sun className="w-3 h-3 text-slate-950 fill-current" />
              Solar
            </span>
          )}
          {hasBorehole && (
            <span className="bg-sky-600/90 backdrop-blur-xs text-white font-medium text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
              <Droplet className="w-3 h-3 fill-current" />
              Borehole
            </span>
          )}
          {hasWifi && (
            <span className="bg-emerald-600/90 backdrop-blur-xs text-white font-medium text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
              <Wifi className="w-3 h-3" />
              WiFi
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          {/* Price */}
          <div className="flex items-baseline justify-between mb-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {property.listingCategory === 'sale' ? (
                <>
                  <span className="text-lg font-black text-slate-900 tracking-tight">
                    ${(property.askingPriceUsd || property.rentUsd).toLocaleString()}
                  </span>
                  <span className="text-[11px] font-medium text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                    {property.paymentType || 'Once off payment'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg font-black text-slate-900 tracking-tight">
                    ${property.rentUsd}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">
                    {property.rentBasis ? ` ${property.rentBasis}` : '/month'}
                  </span>
                </>
              )}
            </div>
            {property.rentZig && (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                ~ZiG {property.rentZig.toLocaleString()}
              </span>
            )}
          </div>

          {/* Agent Fee Note if available */}
          {property.agentFeeUsd ? (
            <div className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1 mb-1">
              <Briefcase className="w-3 h-3 text-indigo-600" />
              <span>
                Agent Fee: ${property.agentFeeUsd.toLocaleString()}
                {property.agentFeePercentage ? ` (${property.agentFeePercentage}%)` : ''}
              </span>
            </div>
          ) : null}

          {/* Title */}
          <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-emerald-700 transition">
            {property.name}
          </h3>

          {/* Location & Stats */}
          <div className="flex items-center justify-between mt-1 text-xs">
            <p className="flex items-center gap-1 text-slate-500 truncate">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">
                {property.suburb}, {property.city}
              </span>
            </p>
            <div className="flex items-center gap-2 text-[11px] shrink-0 ml-2">
              {property.ratingCount && property.ratingCount > 0 ? (
                <span className="flex items-center gap-0.5 text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                  <span>★</span>
                  <span>{property.rating?.toFixed(1)}</span>
                  <span className="text-[10px] text-amber-500 font-normal">({property.ratingCount})</span>
                </span>
              ) : null}
              <span className="flex items-center gap-1 text-slate-400" title={`${property.views || 0} real views`}>
                <Eye className="w-3 h-3 text-slate-400" />
                <span>{property.views || 0}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Specs bar & Quick CTA */}
        <div className="pt-2.5 mt-2 border-t border-slate-100 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-slate-400" />
                <span>{property.bedrooms} {property.bedrooms === 1 ? 'Bed' : 'Beds'}</span>
              </span>
              <span className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5 text-slate-400" />
                <span>{property.bathrooms} {property.bathrooms === 1 ? 'Bath' : 'Baths'}</span>
              </span>
            </div>

            <span className="text-[11px] text-slate-400">
              {property.listingCategory === 'sale'
                ? `Terms: ${property.paymentType || 'Once off'}`
                : `Deposit: $${property.depositUsd}`}
            </span>
          </div>

          {/* Action Buttons: Apply / Inquire and Message Listing's Owner */}
          <div className="flex flex-col sm:flex-row gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                recordPropertyView(property.id, 'apply_click');
                if (onApply) onApply(property);
                else onSelect(property);
              }}
              disabled={property.availability === 'Occupied'}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer ${
                property.availability === 'Occupied'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : property.listingCategory === 'sale'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              <span>
                {property.availability === 'Occupied'
                  ? property.listingCategory === 'sale'
                    ? 'Property Sold'
                    : 'Property Taken'
                  : property.listingCategory === 'sale'
                  ? 'Inquire to Buy'
                  : 'Apply for Rental'}
              </span>
            </button>

            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                recordPropertyView(property.id, 'chat_click');
                if (onMessageOwner) onMessageOwner(property);
              }}
              className="py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-300 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 text-slate-700 transition active:scale-98 cursor-pointer shrink-0"
              title="Chat directly with the owner or manager of this listing"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Message Owner</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
