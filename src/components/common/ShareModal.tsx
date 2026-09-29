import React, { useState } from 'react';
import { Property, PropertyNeeded } from '../../types';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  property?: Property;
  propertyNeeded?: PropertyNeeded;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  property,
  propertyNeeded,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPost, setCopiedPost] = useState(false);

  if (!isOpen || (!property && !propertyNeeded)) return null;

  const origin = window.location.origin;

  let shareTitle = '';
  let shareUrl = '';
  let fullShareText = '';
  let tweetText = '';

  if (property) {
    shareTitle = property.name;
    shareUrl = `${origin}/?property=${property.id}`;
    const priceText =
      property.listingCategory === 'sale'
        ? `$${(property.askingPriceUsd || property.rentUsd).toLocaleString()} (${property.paymentType || 'Purchase'})`
        : `$${property.rentUsd}${property.rentBasis || '/month'}`;

    const amenitiesList = property.amenities?.slice(0, 4).join(', ') || 'Modern amenities';

    fullShareText = `🏡 ${property.name}
📍 ${property.suburb}, ${property.city}
💰 ${priceText}
🛏️ ${property.bedrooms} Bed${property.bedrooms === 1 ? '' : 's'} • 🚿 ${property.bathrooms} Bath${property.bathrooms === 1 ? '' : 's'}
✨ Features: ${amenitiesList}
${property.description ? `📝 ${property.description.slice(0, 140)}...\n` : ''}
👉 View photos, verified details & connect with owner on ComfortHub:
${shareUrl}`;

    tweetText = `🏡 ${property.name} in ${property.suburb}, ${property.city} - ${priceText}! View full listing on ComfortHub: ${shareUrl}`;
  } else if (propertyNeeded) {
    shareTitle = `Tenant Accommodation Request: ${propertyNeeded.propertyTypeNeeded}`;
    shareUrl = `${origin}/?propertyNeeded=${propertyNeeded.id}`;

    const amenitiesList =
      propertyNeeded.amenitiesPreferred?.slice(0, 4).join(', ') || 'Standard utilities';

    fullShareText = `🔍 Accommodation Needed: ${propertyNeeded.propertyTypeNeeded}
👤 Tenant: ${propertyNeeded.tenantName}
📍 Location: ${propertyNeeded.locationPreferred}
💵 Budget: Up to $${propertyNeeded.budgetUsd}/mo
🗓️ Move-in: ${propertyNeeded.availabilityDate}
✨ Requested: ${amenitiesList}
${propertyNeeded.description ? `📝 "${propertyNeeded.description.slice(0, 140)}"\n` : ''}
👉 Have a matching property? Send an offer or contact tenant directly on ComfortHub:
${shareUrl}`;

    tweetText = `🔍 Needed: ${propertyNeeded.propertyTypeNeeded} in ${propertyNeeded.locationPreferred} (Budget: $${propertyNeeded.budgetUsd}/mo). Submit offers on ComfortHub: ${shareUrl}`;
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyPost = async () => {
    try {
      await navigator.clipboard.writeText(fullShareText);
      setCopiedPost(true);
      setTimeout(() => setCopiedPost(false), 2500);
    } catch {
      // Fallback
      setCopiedPost(true);
      setTimeout(() => setCopiedPost(false), 2500);
    }
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: shareTitle,
          text: fullShareText,
          url: shareUrl,
        })
        .catch(() => {});
    }
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedFullText = encodeURIComponent(fullShareText);
  const encodedTweet = encodeURIComponent(tweetText);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedFullText}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(shareTitle)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTweet}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                Share to Social Platforms
              </h3>
              <p className="text-[11px] text-slate-300">
                Maintains ComfortHub branding & redirects users directly back
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

        <div className="p-5 space-y-4">
          {/* Quick Platform Icons Grid */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Share directly to:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition active:scale-98 shadow-2xs"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600/30" />
                <span>WhatsApp</span>
              </a>

              {/* Facebook */}
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs transition active:scale-98 shadow-2xs"
              >
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">
                  f
                </span>
                <span>Facebook</span>
              </a>

              {/* X / Twitter */}
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-bold text-xs transition active:scale-98 shadow-2xs"
              >
                <span className="font-black text-xs">𝕏</span>
                <span>Post</span>
              </a>

              {/* LinkedIn */}
              <a
                href={linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs transition active:scale-98 shadow-2xs"
              >
                <span className="w-4 h-4 rounded bg-sky-700 text-white font-bold text-[10px] flex items-center justify-center">
                  in
                </span>
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Native System Share Sheet (if supported, e.g. mobile) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Open Device Share Menu (Instagram, Telegram, SMS, etc.)</span>
            </button>
          )}

          {/* Direct Link Copy */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Direct App Link:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono outline-hidden select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Formatted Post Preview with Copy Post Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pre-formatted Social Post:
              </span>
              <button
                type="button"
                onClick={handleCopyPost}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedPost ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Post Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Post</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs text-slate-700 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
              {fullShareText}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Contains deep link and ComfortHub branding to ensure inquiries return to the app.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
