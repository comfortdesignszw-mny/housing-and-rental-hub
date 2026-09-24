import React from 'react';
import { RoommateProfile } from '../../types';
import { Heart, MapPin, Sparkles, Cigarette, Moon, Briefcase, GraduationCap } from 'lucide-react';
import { calculateRoommateCompatibility } from '../../services/matchingEngine';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';

interface RoommateCardProps {
  profile: RoommateProfile;
  myProfile?: Partial<RoommateProfile>;
  onSelect: (profile: RoommateProfile) => void;
}

export const RoommateCard: React.FC<RoommateCardProps> = ({
  profile,
  myProfile,
  onSelect,
}) => {
  const { currentUser } = useAuth();

  const isLiked = useLiveQuery(
    async () => {
      if (!currentUser) return false;
      const record = await db.likedRoommates
        .where('userId')
        .equals(currentUser.id)
        .filter(l => l.roommateProfileId === profile.id)
        .first();
      return !!record;
    },
    [currentUser?.id, profile.id]
  );

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    const existing = await db.likedRoommates
      .where('userId')
      .equals(currentUser.id)
      .filter(l => l.roommateProfileId === profile.id)
      .first();

    if (existing) {
      await db.likedRoommates.delete(existing.id);
    } else {
      await db.likedRoommates.add({
        id: `like_${Date.now()}_${profile.id}`,
        userId: currentUser.id,
        roommateProfileId: profile.id,
        likedAt: Date.now(),
      });
    }
  };

  const compatibility = myProfile
    ? calculateRoommateCompatibility(myProfile, profile)
    : { score: 85, grade: 'High', matchFactors: ['Compatible target budget'] };

  return (
    <div
      onClick={() => onSelect(profile)}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
    >
      <div className="p-4 space-y-3">
        {/* Header: Avatar, Name, Age, Like */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={
                  profile.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={profile.name}
                className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-100 group-hover:border-emerald-300 transition"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition">
                  {profile.name}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {profile.age} yrs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                {profile.studentStatus === 'Student' ? (
                  <GraduationCap className="w-3 h-3 text-blue-600 shrink-0" />
                ) : (
                  <Briefcase className="w-3 h-3 text-emerald-600 shrink-0" />
                )}
                <span className="truncate">{profile.occupation}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleLike}
            className={`p-1.5 rounded-full transition ${
              isLiked
                ? 'bg-rose-50 text-rose-600'
                : 'bg-slate-50 text-slate-400 hover:text-rose-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Compatibility Score Banner */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 rounded-xl border border-emerald-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-current" />
            <span>{compatibility.score}% Match</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
            {compatibility.grade}
          </span>
        </div>

        {/* Target Location & Budget */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-2 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Budget
            </span>
            <span className="font-extrabold text-slate-900 text-sm">
              ${profile.budgetUsd}
              <span className="text-xs text-slate-500 font-normal">/mo</span>
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Looking in
            </span>
            <span className="font-semibold text-slate-800 text-xs truncate block">
              {profile.preferredSuburbs[0] || profile.preferredCities[0] || 'Harare'}
            </span>
          </div>
        </div>

        {/* Bio preview */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {profile.bio}
        </p>

        {/* Lifestyle Tags */}
        <div className="flex flex-wrap gap-1 pt-1">
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
            {profile.cleanliness}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
            {profile.sleepSchedule}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
            {profile.smokingPreference}
          </span>
        </div>
      </div>

      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-[11px]">
          Move-in: {profile.moveInDate}
        </span>
        <span className="font-bold text-emerald-700 group-hover:underline">
          View Compatibility →
        </span>
      </div>
    </div>
  );
};
