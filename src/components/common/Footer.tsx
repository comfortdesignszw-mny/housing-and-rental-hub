import React from 'react';
import {
  Building2,
  ShieldCheck,
  Lock,
  Scale,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { NavTab } from './Navigation';

interface FooterProps {
  onNavigateTab?: (tab: NavTab) => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenRenewalTerms?: () => void;
  onOpenCopyrightAgent?: () => void;
  onOpenAuth?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenTerms,
  onOpenPrivacy,
  onOpenRenewalTerms,
  onOpenCopyrightAgent,
}) => {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto border-t border-slate-800">
      {/* Upper Footer: Brand & Trust / Legal policies */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Brand & Mission Column */}
          <div className="space-y-3 max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Building2 className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-extrabold text-white text-base tracking-tight block">
                  Comfort Housing
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase block -mt-0.5">
                  Rental Hub Zimbabwe
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Zimbabwe's premier offline-first housing and rental platform. Facilitating transparent connections between verified tenants, property owners, and registered real estate agents.
            </p>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Verified Listings • Solar & Borehole Badges</span>
            </div>
          </div>

          {/* Legal, Security & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Trust, Rights & Legal Policies
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="text-slate-300 hover:text-emerald-400 font-semibold transition flex items-center gap-2 cursor-pointer group"
                >
                  <Scale className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
                  <span className="underline underline-offset-2">Terms of Service</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="text-slate-300 hover:text-emerald-400 font-semibold transition flex items-center gap-2 cursor-pointer group"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
                  <span className="underline underline-offset-2">Privacy Policy</span>
                </button>
              </li>
              {onOpenCopyrightAgent && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenCopyrightAgent}
                    className="text-slate-300 hover:text-rose-400 font-semibold transition flex items-center gap-2 cursor-pointer group"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-300" />
                    <span className="underline underline-offset-2">DMCA & Copyright Agent</span>
                  </button>
                </li>
              )}
              {onOpenRenewalTerms && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenRenewalTerms}
                    className="text-slate-300 hover:text-emerald-400 font-semibold transition flex items-center gap-2 cursor-pointer group"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
                    <span className="underline underline-offset-2">Pro Renewal Terms</span>
                  </button>
                </li>
              )}
              <li className="pt-1">
                <span className="text-[11px] text-slate-400 block">
                  Support & Verification Desk:
                </span>
                <a
                  href="mailto:comfort.designszw@gmail.com"
                  className="text-[11px] text-emerald-400 font-mono hover:underline"
                >
                  comfort.designszw@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright Statement & Brand Statement */}
      <div className="bg-slate-950 border-t border-slate-800/80 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center space-y-2">
          {/* Copyright Statement */}
          <p className="text-xs sm:text-sm font-bold text-slate-300 tracking-wide">
            @2026 Comfort Housing and Rental Hub. All Rights Reserved.
          </p>

          {/* Brand Statement below Copyright message */}
          <p className="text-xs sm:text-sm font-semibold text-emerald-400">
            Designed by Comfort Designs -{' '}
            <a
              href="tel:+263772824132"
              className="hover:underline inline-block font-mono"
            >
              +263772824132
            </a>
          </p>

          {/* Quick legal links strip */}
          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 flex-wrap justify-center">
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-slate-300 transition cursor-pointer"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-slate-300 transition cursor-pointer"
            >
              Privacy Policy
            </button>
            {onOpenCopyrightAgent && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={onOpenCopyrightAgent}
                  className="hover:text-slate-300 transition cursor-pointer"
                >
                  DMCA Copyright Agent
                </button>
              </>
            )}
            {onOpenRenewalTerms && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={onOpenRenewalTerms}
                  className="hover:text-slate-300 transition cursor-pointer"
                >
                  Renewal Terms
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
