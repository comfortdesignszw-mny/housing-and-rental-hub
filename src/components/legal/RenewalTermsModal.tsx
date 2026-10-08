import React from 'react';
import { X, RefreshCw, ShieldCheck, Calendar, AlertCircle, CheckCircle2, DollarSign, HelpCircle } from 'lucide-react';

interface RenewalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RenewalTermsModal: React.FC<RenewalTermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <RefreshCw className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Pro Subscription Renewal Terms
              </h3>
              <p className="text-xs text-slate-300">
                Comfort Housing and Rental Hub • Automatic Renewal & Cancellation Policy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Renewal Terms"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 font-medium">
            All premium subscriptions on Comfort Housing (including Landlord Pro, Agent Portfolio Pro, and Featured Listing Boosts) are governed by clear, transparent renewal terms with no hidden penalties.
          </div>

          <section className="space-y-1.5">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>1. Billing Cycle & Automatic Renewal</span>
            </h4>
            <p>
              Pro Subscriptions are billed on a recurring basis (e.g. <strong>$15 USD/month</strong> or <strong>$120 USD/year</strong>). Unless auto-renewal is toggled off or cancelled, your subscription will automatically renew at the conclusion of each billing period for an equivalent duration at the prevailing rate.
            </p>
            <p className="text-[11px] text-slate-500">
              Payment is accepted via USD Cash, EcoCash, InnBucks, Mukuru, and local Zimbabwean ZIPIT bank transfers with instant digital receipts.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>2. Renewal Notice & Pre-Billing Alerts</span>
            </h4>
            <p>
              We dispatch an automated renewal reminder alert to your registered WhatsApp and email address <strong>three (3) days prior</strong> to each renewal charge. This alert specifies the renewal date, subscription price, and a direct link to manage or cancel auto-renewal.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>3. How to Cancel Auto-Renewal Anytime</span>
            </h4>
            <p>
              You maintain absolute control over your subscription. You may cancel automatic renewal at any time directly from your <strong>Account Profile &rarr; Subscriptions</strong> section by clicking the <em>"Cancel Auto-Renew"</em> button, with zero cancellation fees.
            </p>
            <p className="font-semibold text-slate-800">
              When you cancel auto-renewal, you retain full access to all Pro features until the end of your current paid billing period. At expiry, your account seamlessly transitions back to the Free Explorer tier without data loss.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>4. Refund Policy</span>
            </h4>
            <p>
              Subscription fees paid for an active cycle are non-refundable once the cycle has commenced. If you cancel mid-cycle, you will not receive a partial refund for unused days, but your Pro access will continue uninterrupted until the scheduled renewal date.
            </p>
          </section>

          <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
            For billing inquiries or manual receipt verification, contact: <strong>comfort.designszw@gmail.com</strong> or WhatsApp <strong>+263772824132</strong>.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            I Understand the Renewal Terms
          </button>
        </div>
      </div>
    </div>
  );
};
