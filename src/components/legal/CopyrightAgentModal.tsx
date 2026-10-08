import React from 'react';
import { X, ShieldAlert, FileText, Mail, Phone, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CopyrightAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CopyrightAgentModal: React.FC<CopyrightAgentModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Designated Copyright & DMCA Agent
              </h3>
              <p className="text-xs text-slate-300">
                Comfort Housing and Rental Hub • Notice & Developer Liability Disclaimer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Copyright Agent Info"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {/* Important Developer Disclaimer */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>Developer & System Liability Disclaimer</span>
            </div>
            <p className="leading-relaxed">
              <strong>NOTICE:</strong> Comfort Housing and Rental Hub, Comfort Designs, and the application system developers act solely as technical intermediaries and hosting platforms. <strong>The app developers and system architects are NOT liable for any property photographs, floor plans, blueprints, descriptions, or files uploaded by third-party users if they violate copyright laws, trademarks, or intellectual property rights.</strong>
            </p>
            <p className="text-[11px] text-rose-900">
              Users who upload files warrant that they possess legal ownership or express written authorization. Infringing materials will be expeditiously disabled upon receipt of a valid notice.
            </p>
          </div>

          {/* Registered Copyright Agent Details */}
          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Designated Copyright Agent Contact Information</span>
            </h4>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Service Provider</span>
                  <span className="font-bold text-slate-900">Comfort Housing and Rental Hub</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Designated DMCA Agent</span>
                  <span className="font-bold text-slate-900">Comfort Compliance & Copyright Officer</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Email:</strong> comfort.designszw@gmail.com</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Phone / WhatsApp:</strong> +263 772 824 132</span>
                </div>
                <div className="sm:col-span-2 flex items-center gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Jurisdiction:</strong> Harare, Republic of Zimbabwe</span>
                </div>
              </div>
            </div>
          </section>

          {/* DMCA / Copyright Takedown Procedure */}
          <section className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>How to Submit a Copyright Infringement Notice</span>
            </h4>
            <p>
              If you believe in good faith that any photo, listing image, or file uploaded to Comfort Housing infringes your copyright, please deliver a written notice containing:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-slate-700 text-xs">
              <li>Identification of the copyrighted work claimed to have been infringed.</li>
              <li>Identification of the specific listing URL or Property ID on ComfortHub where the infringing material appears.</li>
              <li>Your contact information including legal name, email address, physical address, and telephone number.</li>
              <li>A statement that you have a good-faith belief that use of the material is not authorized by the copyright owner, agent, or the law.</li>
              <li>A statement made under penalty of perjury that the information in the notification is accurate and that you are authorized to act on behalf of the copyright owner.</li>
              <li>A physical or electronic signature of the authorized copyright holder.</li>
            </ol>
            <p className="text-[11px] text-slate-500 pt-1">
              Upon receiving a verified notice, our compliance desk will remove or disable access to the disputed content within 24 hours without liability to the system developers.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close Notice
          </button>
        </div>
      </div>
    </div>
  );
};
