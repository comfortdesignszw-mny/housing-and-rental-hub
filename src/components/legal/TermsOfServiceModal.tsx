import React from 'react';
import { X, ShieldCheck, FileText, Scale } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Terms of Service
              </h3>
              <p className="text-xs text-slate-300">
                Comfort Housing and Rental Hub • Effective October 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Terms of Service"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 font-medium">
            Please read these Terms of Service carefully before creating an account, publishing property listings, submitting accommodation requests, or engaging in rental communications on Comfort Housing and Rental Hub.
          </div>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>1. Acceptance of Terms & Nature of Platform</span>
            </h4>
            <p>
              By accessing or using <strong>Comfort Housing and Rental Hub</strong> ("ComfortHub", "the Platform"), accessible via web application or installed progressive web application (PWA), you agree to be bound by these Terms of Service and all applicable laws and regulations of the Republic of Zimbabwe. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
            <p>
              ComfortHub operates as a marketplace and technology facilitator connecting landlords, property managers, registered real estate agents, tenants, and room seekers across Zimbabwean cities including Harare, Bulawayo, Gweru, Mutare, Chinhoyi, Victoria Falls, and surrounding districts. ComfortHub is not an estate agency itself, does not own the advertised properties, and does not hold security deposits or rental payments in escrow.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>2. User Account Categories and Verification</span>
            </h4>
            <p>
              The Platform provides specific role-based permissions to maintain platform integrity:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>
                <strong>Tenants:</strong> May browse listings, compare properties, submit verified rental applications, post "Properties Needed" requests, search for roommates, and initiate WhatsApp or in-app discussions. Tenants do not possess permissions to create or update property sale/rent listings.
              </li>
              <li>
                <strong>Landlords & Property Owners:</strong> Authorized to publish residential and commercial rental properties, manage units, issue digital rental receipts, and respond to tenant accommodation requests.
              </li>
              <li>
                <strong>Property Managers & Real Estate Agents:</strong> Authorized to manage property portfolios, list properties for rent or sale, represent property owners, and transparently declare agency commissions. Agents must comply with the Estate Agents Act [Chapter 27:05] of Zimbabwe.
              </li>
              <li>
                <strong>Platform Administrators:</strong> Moderate listings, oversee role assignments, govern community standards, and enforce platform security.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>3. Property Listings, Pricing & Zimbabwe Utility Disclosures</span>
            </h4>
            <p>
              Users who list properties (for rent or for sale) warrant that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>All information—including rental price (in USD or approved legal tender), security deposit requirements, bedroom counts, location/suburb, and availability dates—is accurate and up to date.</li>
              <li>Disclosures regarding key Zimbabwean utility infrastructure (Borehole water, ZESA prepaid meters, Solar power systems, and municipal water council schedules) are truthful and not misrepresented.</li>
              <li>Properties marked as "Occupied" or "Taken" will automatically expire and disappear from public active listings after 24 hours to prevent outdated inquiries.</li>
              <li>Duplicate, phantom, or fraudulent listings intended to mislead property seekers are strictly prohibited and result in immediate permanent account termination.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>4. Tenant Accommodation Demands ("Properties Needed")</span>
            </h4>
            <p>
              Registered tenants may post legitimate accommodation demands specifying desired suburbs, room types, and maximum budgets. Landlords and verified agents may submit non-binding offers directly through the app or WhatsApp. When a tenant marks a request as "Property Found", the listing displays a verified badge, disables further incoming offers, and automatically disappears from public view after 24 hours.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>5. Direct Communication & Safety Warning</span>
            </h4>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <strong>CRITICAL SAFETY NOTICE:</strong> Never send advance rent payments, viewing fees, or security deposits via EcoCash, Innbucks, Mukuru, or bank transfer prior to physically inspecting the premises in person and verifying the identity and ownership documents of the landlord or authorized agent. ComfortHub will never request payment on behalf of an owner.
            </div>
            <p>
              ComfortHub facilitates direct communication links (including official WhatsApp and telephone channels) between consenting parties. Users agree to maintain polite, professional conduct. Harassment, discrimination, fraud, or spam via platform communication channels constitutes grounds for immediate blacklisting.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>6. Offline-First Architecture & Data Persistence</span>
            </h4>
            <p>
              ComfortHub is architected with an offline-first foundation utilizing high-speed client-side IndexedDB caching and cloud synchronization. Actions taken while offline (saving properties, drafting applications, or recording inquiries) are stored locally on your device and synchronized to the central cloud upon reconnection. You acknowledge that local device storage clearance may affect offline-available records unless synchronized.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>7. User Data Rights: Backup, Restore & Complete Account Wipe</span>
            </h4>
            <p>
              In accordance with contemporary privacy and consumer protection standards:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Users retain full ownership of their data and may export a complete, machine-readable JSON backup of their account records at any time.</li>
              <li>Users may restore their account data from verified JSON backup files.</li>
              <li>Users have the absolute right to trigger a complete account and data wipe ("Delete my Account and Data"). Executing this action permanently deletes user credentials, published listings, accommodation requests, roommate profiles, and local cache entries with zero recoverable footprint.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>8. User-Uploaded Content, Media & Copyright Disclaimer (DMCA Agent Filed)</span>
            </h4>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-xs space-y-1.5">
              <p className="font-bold">
                ABSOLUTE DEVELOPER & SYSTEM LIABILITY DISCLAIMER:
              </p>
              <p>
                Comfort Housing and Rental Hub, Comfort Designs, and the application system developers operate strictly as a technical intermediary and hosting provider. <strong>The app developers and platform operators are NOT liable for any property photographs, floor plans, blueprints, architectural drawings, documents, or media files uploaded by third-party users if they violate or infringe any domestic or international copyright law, trademark, or intellectual property right.</strong>
              </p>
              <p>
                Users who upload property photos, accommodation requests, or media warrant and represent that they either hold full copyright ownership or possess express, verified written authorization from the copyright holder. Users agree to fully indemnify and hold harmless the platform developers from any claims arising from user-uploaded files.
              </p>
            </div>
            <p className="text-xs text-slate-600">
              In compliance with copyright and digital safe harbor frameworks, we have designated a formal <strong>Copyright & DMCA Agent</strong> to receive infringement notices:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
              <li><strong>Designated Agent:</strong> Comfort Compliance & Copyright Officer</li>
              <li><strong>Direct Notice Email:</strong> comfort.designszw@gmail.com</li>
              <li><strong>Compliance Telephone / WhatsApp:</strong> +263 772 824 132</li>
              <li><strong>Jurisdiction:</strong> Harare, Zimbabwe</li>
              <li>Upon verified notice, infringing materials will be removed or disabled within 24 hours without liability to the system developers.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>9. Age Gate & Age Restrictions (Strictly Above 16 Years)</span>
            </h4>
            <p>
              Comfort Housing enforces a strict age gate. You must be <strong>above 16 years of age (17 years or older)</strong> to register an individual account or execute rental transactions.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs">
              <strong>Juvenile Registration Policy:</strong> If a prospective tenant or student is 16 years old or younger, independent registration is strictly prohibited. In such cases, the juvenile's parent or legal guardian must create, control, and administer the account on the juvenile's behalf.
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>10. Pro Subscriptions, Transparent Renewal Terms & Cancellation</span>
            </h4>
            <p>
              Premium features (such as Landlord Pro, Agent Portfolio Pro, and Featured Listing Boosts) are provided under clear renewal terms:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
              <li><strong>Automatic Renewal:</strong> Paid subscriptions automatically renew at the expiration of each designated billing cycle (monthly or annual) at prevailing rates unless cancelled prior to the renewal date.</li>
              <li><strong>Pre-Billing Alerts:</strong> Users receive automated renewal reminders via WhatsApp/email 3 days before any scheduled charge.</li>
              <li><strong>Cancellation Without Penalties:</strong> Users may cancel auto-renewal at any time with one click from their profile. Pro benefits continue until the end of the paid billing cycle without partial refunds or surprise recurring charges.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>11. Device Behaviour, Notification Alerts & Unsubscribe Controls</span>
            </h4>
            <p>
              Users maintain sovereign control over platform alerts on their devices. Every user can instantaneously unsubscribe from WhatsApp or Email notifications with a single click in their account settings, completely revoking alert permissions.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>12. Intellectual Property & Brand Statement</span>
            </h4>
            <p>
              The platform design, interfaces, brand assets, and custom architecture of Comfort Housing and Rental Hub are the exclusive intellectual property of <strong>Comfort Designs</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>13. Limitation of Liability & Governing Law</span>
            </h4>
            <p>
              To the fullest extent permitted by law, ComfortHub and Comfort Designs shall not be liable for any indirect, incidental, or consequential damages resulting from property disputes, lease defaults, physical property viewings, utility outages, or interactions between users. These Terms are governed by and construed in accordance with the laws of the Republic of Zimbabwe.
            </p>
          </section>

          <section className="space-y-1 pt-2 border-t border-slate-200 text-xs text-slate-500">
            <p>For questions or formal legal notices, contact: <strong>comfort.designszw@gmail.com</strong></p>
            <p>@2026 Comfort Housing and Rental Hub. All Rights Reserved. Designed by Comfort Designs - +263772824132</p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
