import React, { useState } from 'react';
import { PropertyOffer, PropertyNeeded } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/db';
import { db as firestoreDb, sanitizeForFirestore } from '../../db/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Building2,
  DollarSign,
  MapPin,
  Calendar,
  MessageCircle,
  Phone,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Edit3,
  Share2,
  Eye,
} from 'lucide-react';
import { EditPropertyNeededModal } from './EditPropertyNeededModal';
import { ShareModal } from '../common/ShareModal';

interface TenantOffersSectionProps {
  onOpenCreateNeeded: () => void;
  onStartChat: (recipientId: string, recipientName: string) => void;
  highlightedOfferId?: string;
}

export const TenantOffersSection: React.FC<TenantOffersSectionProps> = ({
  onOpenCreateNeeded,
  onStartChat,
  highlightedOfferId,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'offers' | 'my_requests'>('offers');
  const [offerFilter, setOfferFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [editingPropertyNeeded, setEditingPropertyNeeded] = useState<PropertyNeeded | null>(null);
  const [sharingPropertyNeeded, setSharingPropertyNeeded] = useState<PropertyNeeded | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // 1. Load incoming offers made to this tenant
  const offers =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.propertyOffers
          .where('tenantId')
          .equals(currentUser.id)
          .reverse()
          .sortBy('createdAt');
      },
      [currentUser?.id],
      []
    ) || [];

  // 2. Load tenant's own property needed requests
  const myRequests =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.propertiesNeeded
          .where('tenantId')
          .equals(currentUser.id)
          .reverse()
          .sortBy('createdAt');
      },
      [currentUser?.id],
      []
    ) || [];

  const filteredOffers = offers.filter(o => {
    if (offerFilter === 'all') return true;
    return o.status === offerFilter;
  });

  const pendingOffersCount = offers.filter(o => o.status === 'pending').length;

  const handleUpdateOfferStatus = async (offer: PropertyOffer, newStatus: 'accepted' | 'declined') => {
    try {
      await db.propertyOffers.update(offer.id, { status: newStatus });
      await updateDoc(doc(firestoreDb, 'propertyOffers', offer.id), { status: newStatus });
      showNotice(
        newStatus === 'accepted'
          ? `Offer for "${offer.propertyName}" accepted! Message the owner on WhatsApp to finalize viewing.`
          : `Offer declined.`
      );
    } catch (e) {
      console.warn('Could not update offer status:', e);
    }
  };

  const handleDeleteRequest = async (req: PropertyNeeded) => {
    if (!window.confirm(`Are you sure you want to remove your request for "${req.propertyTypeNeeded}"?`)) {
      return;
    }
    try {
      await db.propertiesNeeded.delete(req.id);
      await deleteDoc(doc(firestoreDb, 'propertiesNeeded', req.id));
      showNotice('Property Needed request removed.');
    } catch (e) {
      console.warn('Could not delete request:', e);
    }
  };

  const handleToggleRequestFulfilled = async (req: PropertyNeeded) => {
    const isNowFound = req.status !== 'found';
    const nextStatus = isNowFound ? 'found' : 'active';
    const updatedFoundAt = isNowFound ? Date.now() : undefined;
    const now = Date.now();
    try {
      await db.propertiesNeeded.update(req.id, {
        status: nextStatus as any,
        foundAt: updatedFoundAt,
        updatedAt: now,
      });
      await updateDoc(doc(firestoreDb, 'propertiesNeeded', req.id), {
        status: nextStatus,
        foundAt: updatedFoundAt || null,
        updatedAt: now,
      });
      showNotice(
        isNowFound
          ? 'Request marked as Found! Listing displays badge and will automatically disappear after 24 hours.'
          : 'Request re-activated in public listings.'
      );
    } catch (e) {
      console.warn('Could not toggle request status:', e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="bg-emerald-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-in fade-in duration-200">
          <span>{actionNotice}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-200 hover:text-white ml-2 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
            Tenant Hub • Match & Proposals
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            Property Owners Offers & Accommodation Requests
          </h2>
          <p className="text-xs text-slate-500">
            Review incoming rental proposals from verified Landlords and Agents who responded to your accommodation requests.
          </p>
        </div>

        <button
          onClick={onOpenCreateNeeded}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Rental Property Needed</span>
        </button>
      </div>

      {/* Primary Tab Switcher: Property Owners Offers vs My Requests */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('offers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'offers'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Property Owners Offers</span>
          {pendingOffersCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'offers' ? 'bg-white text-teal-800' : 'bg-rose-600 text-white animate-pulse'
              }`}
            >
              {pendingOffersCount} new
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my_requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'my_requests'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>My Property Needed Requests ({myRequests.length})</span>
        </button>
      </div>

      {/* Tab 1: Property Owners Offers */}
      {activeTab === 'offers' && (
        <div className="space-y-3">
          {/* Sub-filters for offers */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {(['all', 'pending', 'accepted', 'declined'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setOfferFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-bold capitalize transition cursor-pointer ${
                    offerFilter === tab
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'all' ? `All Offers (${offers.length})` : `${tab} (${offers.filter(o => o.status === tab).length})`}
                </button>
              ))}
            </div>

            <span className="text-slate-500 text-[11px]">
              Showing <strong>{filteredOffers.length}</strong> offer{filteredOffers.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredOffers.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                No Property Offers Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {myRequests.length === 0
                  ? 'You haven’t posted any accommodation requests yet. Post what property you need so landlords & agents can send offers!'
                  : 'Landlords & Agents have not submitted an offer yet for your request. Offers will appear here and notify your account as soon as they arrive.'}
              </p>
              {myRequests.length === 0 && (
                <button
                  type="button"
                  onClick={onOpenCreateNeeded}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Property Needed Request</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredOffers.map(offer => {
                const isHighlighted = highlightedOfferId === offer.id;

                let cleanWhatsApp = offer.landlordWhatsApp?.replace(/\D/g, '') || '';
                if (cleanWhatsApp.startsWith('0') && cleanWhatsApp.length === 10) {
                  cleanWhatsApp = '263' + cleanWhatsApp.substring(1);
                }

                const waReplyText = encodeURIComponent(
                  `Hello ${offer.landlordName}, thank you for your property offer on Comfort Housing: "${offer.propertyName}" for $${offer.rentUsd}/mo in ${offer.location}. I received your proposal and would like to arrange a viewing.`
                );

                return (
                  <div
                    key={offer.id}
                    id={`offer-${offer.id}`}
                    className={`bg-white rounded-2xl p-4 sm:p-5 border transition flex flex-col justify-between space-y-3 shadow-2xs ${
                      isHighlighted
                        ? 'border-teal-500 ring-2 ring-teal-400/50 bg-teal-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Owner Info & Status */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                              {offer.landlordRole === 'agent' ? 'Verified Real Estate Agent' : 'Property Owner / Landlord'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(offer.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                            {offer.propertyName}
                          </h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{offer.location}</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base sm:text-lg font-black text-emerald-800 block">
                            ${offer.rentUsd}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                          </span>
                          <span
                            className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              offer.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : offer.status === 'declined'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}
                          >
                            {offer.status}
                          </span>
                        </div>
                      </div>

                      {/* Specs Row */}
                      <div className="grid grid-cols-2 gap-2 py-2 text-xs text-slate-600 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">
                            Security Deposit
                          </span>
                          <span className="font-semibold text-slate-800">
                            ${offer.depositUsd || 0} USD
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">
                            Availability
                          </span>
                          <span className="font-semibold text-slate-800">
                            {offer.availableFrom}
                          </span>
                        </div>
                      </div>

                      {/* Amenities */}
                      {offer.amenities && offer.amenities.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Included Utilities & Features:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {offer.amenities.map(a => (
                              <span
                                key={a}
                                className="text-[10px] bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 text-teal-600" />
                                <span>{a}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Personal Note */}
                      {offer.notes && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                          <p className="font-bold text-slate-800 text-[11px] mb-0.5">
                            Note from {offer.landlordName}:
                          </p>
                          <p className="italic">"{offer.notes}"</p>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-medium">
                          Offered by: <strong>{offer.landlordName}</strong>
                        </span>
                        {offer.landlordPhone && (
                          <span className="text-slate-400">Call: {offer.landlordPhone}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Direct WhatsApp Reply Button */}
                        {cleanWhatsApp && (
                          <a
                            href={`https://wa.me/${cleanWhatsApp}?text=${waReplyText}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                            title="Reply to Property Owner directly on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 fill-white" />
                            <span>Reply via WhatsApp</span>
                            <ExternalLink className="w-3 h-3 text-emerald-200" />
                          </a>
                        )}

                        {/* In-App Chat */}
                        <button
                          type="button"
                          onClick={() => onStartChat(offer.landlordId, offer.landlordName)}
                          className="py-2 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                          title="Chat in App"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">App Chat</span>
                        </button>

                        {/* Call Owner */}
                        {offer.landlordPhone && (
                          <a
                            href={`tel:${offer.landlordPhone.replace(/\s+/g, '')}`}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer shrink-0"
                            title={`Call ${offer.landlordName}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Accept / Decline actions */}
                        {offer.status === 'pending' && (
                          <div className="flex items-center gap-1 shrink-0 ml-auto">
                            <button
                              type="button"
                              onClick={() => handleUpdateOfferStatus(offer, 'accepted')}
                              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition cursor-pointer"
                              title="Mark Accepted"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateOfferStatus(offer, 'declined')}
                              className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs transition cursor-pointer"
                              title="Decline"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Property Needed Requests */}
      {activeTab === 'my_requests' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              You have published <strong>{myRequests.length}</strong> rental accommodation request{myRequests.length === 1 ? '' : 's'}
            </span>

            <button
              onClick={onOpenCreateNeeded}
              className="flex items-center gap-1 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Post New Request</span>
            </button>
          </div>

          {myRequests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                No Accommodation Requests Active
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create a "Property Needed" listing to state your budget, desired room type, and location. Verified landlords and agents will send you offers.
              </p>
              <button
                type="button"
                onClick={onOpenCreateNeeded}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Rental Property Needed</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(req => {
                const isFound = req.status === 'found' || req.status === 'fulfilled';
                const foundTimestamp = req.foundAt || req.updatedAt || req.createdAt;
                const elapsed = Date.now() - foundTimestamp;
                const remainingMs = 24 * 60 * 60 * 1000 - elapsed;
                const remainingHours = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isFound ? (
                          <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 uppercase">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>Property Found 🎉 • Disappears in {remainingHours}h</span>
                          </span>
                        ) : (
                          <span className="bg-teal-100 text-teal-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border border-teal-200">
                            Active in Listings
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          Posted {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {req.propertyTypeNeeded} in {req.locationPreferred}
                      </h4>

                      <p className="text-xs text-slate-600">
                        Budget: <strong className="text-emerald-700">${req.budgetUsd}/mo</strong> • Move-in:{' '}
                        {req.availabilityDate} • Offers received:{' '}
                        <strong className="text-teal-800 font-bold">{req.offersCount || 0}</strong>
                        {req.views !== undefined && (
                          <span className="ml-2 text-slate-400">
                            • {req.views || 0} views
                          </span>
                        )}
                      </p>

                      {req.description && (
                        <p className="text-xs text-slate-500 italic line-clamp-1">
                          "{req.description}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleToggleRequestFulfilled(req)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                          isFound
                            ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                        }`}
                        title={isFound ? 'Re-activate request' : 'Mark as found (disappears after 24 hours)'}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isFound ? 'Re-activate' : 'Mark Found 🎉'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingPropertyNeeded(req)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1 cursor-pointer"
                        title="Edit request"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSharingPropertyNeeded(req)}
                        className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                        title="Share request"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(req)}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition cursor-pointer"
                        title="Delete request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Property Needed Modal */}
      {editingPropertyNeeded && (
        <EditPropertyNeededModal
          isOpen={!!editingPropertyNeeded}
          propertyNeeded={editingPropertyNeeded}
          onClose={() => setEditingPropertyNeeded(null)}
          onUpdated={() => showNotice('Accommodation request updated successfully!')}
        />
      )}

      {/* Social Share Modal */}
      {sharingPropertyNeeded && (
        <ShareModal
          isOpen={!!sharingPropertyNeeded}
          propertyNeeded={sharingPropertyNeeded}
          onClose={() => setSharingPropertyNeeded(null)}
        />
      )}
    </div>
  );
};
