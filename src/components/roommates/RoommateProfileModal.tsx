import React from 'react';
import { RoommateProfile } from '../../types';
import {
  X,
  Sparkles,
  Phone,
  MessageSquare,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Share2,
  Briefcase,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { calculateRoommateCompatibility } from '../../services/matchingEngine';

interface RoommateProfileModalProps {
  profile: RoommateProfile;
  myProfile?: Partial<RoommateProfile>;
  onClose: () => void;
  onStartChat: (recipientId: string, recipientName: string) => void;
}

export const RoommateProfileModal: React.FC<RoommateProfileModalProps> = ({
  profile,
  myProfile,
  onClose,
  onStartChat,
}) => {
  const compatibility = myProfile
    ? calculateRoommateCompatibility(myProfile, profile)
    : {
        score: 88,
        grade: 'Exceptional' as const,
        matchFactors: [
          'Budget compatible within $150',
          'Shared preference for Harare Northern Suburbs',
          'Both maintain non-smoking lifestyle',
        ],
        mismatchFactors: [],
      };

  const cleanPhone = profile.phone.replace(/\D/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-400">
              Roommate Compatibility Profile
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <img
              src={
                profile.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
              }
              alt={profile.name}
              className="w-18 h-18 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {profile.name}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {profile.age} yrs • {profile.gender}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {profile.occupation}
              </p>
              <p className="text-[11px] text-slate-500">
                {profile.universityOrWorkplace}
              </p>
            </div>
          </div>

          {/* Compatibility Breakdown Card */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 fill-current" />
                <span className="font-extrabold text-emerald-950 text-sm">
                  {compatibility.score}% Match Compatibility
                </span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                {compatibility.grade} Match
              </span>
            </div>

            {/* Factors */}
            <div className="space-y-1.5 pt-1 text-xs">
              {compatibility.matchFactors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{factor}</span>
                </div>
              ))}
              {compatibility.mismatchFactors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Parameters: Budget & Areas */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Monthly Rent Budget
              </p>
              <p className="text-base font-black text-slate-900 mt-0.5">
                ${profile.budgetUsd}/mo
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Target Move-in Date
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {profile.moveInDate}
              </p>
            </div>
          </div>

          {/* Target Suburbs in Zimbabwe */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Preferred Suburbs & Locations
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {profile.preferredSuburbs.map(s => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/60"
                >
                  📍 {s}
                </span>
              ))}
              {profile.preferredCities.map(c => (
                <span
                  key={c}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              About Me
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {profile.bio}
            </p>
          </div>

          {/* Lifestyle Matrix */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Lifestyle & Living Preferences
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold">
                  Cleanliness
                </span>
                <span className="font-semibold text-slate-800">
                  {profile.cleanliness}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold">
                  Sleep Schedule
                </span>
                <span className="font-semibold text-slate-800">
                  {profile.sleepSchedule}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold">
                  Smoking Policy
                </span>
                <span className="font-semibold text-slate-800">
                  {profile.smokingPreference}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold">
                  Drinking Policy
                </span>
                <span className="font-semibold text-slate-800">
                  {profile.drinkingPreference}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold">
                  Guest Policy
                </span>
                <span className="font-semibold text-slate-800">
                  {profile.guestPolicy}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold">
                  Pet Tolerance
                </span>
                <span className="font-semibold text-slate-800">
                  {profile.petTolerance}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <a
            href={`tel:${cleanPhone}`}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call</span>
          </a>

          <a
            href={`https://wa.me/${cleanPhone}?text=Hi ${profile.name}, I saw your roommate profile on Comfort Housing Hub and wanted to connect about finding accommodation.`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
          >
            <span>WhatsApp</span>
          </a>

          <button
            onClick={() => {
              onClose();
              onStartChat(profile.userId, profile.name);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>App Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
