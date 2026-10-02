import React from 'react';
import { X, ShieldCheck, Lock, Eye, Database } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Privacy Policy
              </h3>
              <p className="text-xs text-slate-300">
                Comfort Housing and Rental Hub • Effective October 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Privacy Policy"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 text-xs text-teal-950 font-medium">
            At Comfort Housing and Rental Hub ("ComfortHub"), built by Comfort Designs, your privacy and data sovereignty are fundamental priorities. This policy outlines what data we collect, why we collect it, how your data is secured, and how you maintain complete control over your account data.
          </div>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>1. Information We Collect</span>
            </h4>
            <p>We collect information to facilitate authentic rental engagements and reliable housing discovery:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account & Profile Information:</strong> Name, email address, Zimbabwean mobile phone number, WhatsApp contact number, preferred city/town, optional profile biography, and avatar photo.
              </li>
              <li>
                <strong>Property Listing Data:</strong> Property title, detailed descriptions, rental/sale price in USD, suburb/city, physical amenity indicators (Borehole water, Solar power, ZESA prepaid electricity, parking), bedroom and bathroom counts, and uploaded property photographs.
              </li>
              <li>
                <strong>Tenant Accommodation Requests:</strong> Preferred room types, budget specifications, target suburbs, requested amenities, move-in timelines, and contact preferences.
              </li>
              <li>
                <strong>Tenancy & Communication Records:</strong> Rental applications submitted directly to landlords/agents, digital rent receipt records, maintenance requests, and in-app message timestamps.
              </li>
              <li>
                <strong>Local Device & Cache Data:</strong> Offline IndexedDB records stored locally on your device to support instant offline loading, saved property favorites, and pending sync queues.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>2. How We Use Your Information</span>
            </h4>
            <p>Your information is utilized strictly to deliver and improve platform services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To connect property seekers with verified landlords, property managers, and registered agents across Zimbabwe.</li>
              <li>To generate direct WhatsApp message links and phone links with pre-filled property inquiries for quick, seamless communication.</li>
              <li>To notify tenants when landlords submit property offers matching their posted accommodation demands.</li>
              <li>To maintain an offline-first caching mechanism that operates smoothly even during network disruptions or electricity load shedding.</li>
              <li>To verify identity and prevent malicious, phantom, or fraudulent property listings.</li>
            </ul>
            <p className="font-semibold text-slate-900">
              We do not sell, rent, or monetize your personal information or contact details to third-party advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>3. Data Storage, Security & Offline-First Architecture</span>
            </h4>
            <p>
              ComfortHub employs a high-performance hybrid architecture:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Cloud Persistence:</strong> Sensitive accounts, property listings, and verified tenant offers are stored in encrypted Google Cloud Firestore databases guarded by strict role-based access control (RBAC) security rules.
              </li>
              <li>
                <strong>Local Offline Storage:</strong> Your active sessions, saved listings, and application drafts are cached on your client device using browser IndexedDB (Dexie.js). This ensures the app functions offline and synchronizes securely upon reconnection.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>4. Complete User Control: Backup, Restore & Data Wipe</span>
            </h4>
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-2 text-xs">
              <p className="font-bold text-slate-900">
                You retain complete sovereign control over your personal records:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>
                  <strong>Backup My Account Data:</strong> Export a full, machine-readable JSON backup containing your profile, published properties, accommodation demands, roommate profiles, and saved listings with one click.
                </li>
                <li>
                  <strong>Restore My Account Data:</strong> Seamlessly upload and restore your account data from any valid ComfortHub JSON backup file.
                </li>
                <li>
                  <strong>Delete My Account and Data:</strong> Trigger a permanent, irreversible data wipe in your Profile settings. This executes a complete purge of your account profile, published listings, accommodation requests, message histories, and local cache entries across both client storage and central databases.
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>5. Third-Party Integrations</span>
            </h4>
            <p>
              ComfortHub integrates with trusted services for essential app capabilities:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Google Authentication:</strong> For optional, secure sign-in via OAuth.</li>
              <li><strong>WhatsApp API Deep-Links:</strong> For direct, end-to-end encrypted tenant-to-owner rental negotiations. ComfortHub does not intercept the contents of private WhatsApp conversations.</li>
              <li><strong>Native Web Share API:</strong> For user-initiated sharing of property listings to social platforms with canonical brand back-links.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>6. Cookies & Client-Side Cache</span>
            </h4>
            <p>
              We do not deploy intrusive third-party tracking cookies. Local storage and IndexedDB are strictly utilized to store your active authentication session, UI preferences, and offline synchronization queues.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>7. Compliance with Zimbabwean Data Protection Legislation</span>
            </h4>
            <p>
              ComfortHub adheres to the principles of lawful processing, purpose limitation, transparency, and data minimization set forth in the <strong>Cyber and Data Protection Act [Chapter 12:07] of Zimbabwe</strong>.
            </p>
          </section>

          <section className="space-y-1 pt-2 border-t border-slate-200 text-xs text-slate-500">
            <p>For privacy inquiries or data rights requests, contact our privacy desk: <strong>comfort.designszw@gmail.com</strong></p>
            <p>© 2026 Comfort Housing and Rental Hub. All Rights Reserved. Designed with ❤️ by Comfort Designs.</p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
};
