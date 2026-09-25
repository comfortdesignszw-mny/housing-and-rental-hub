import React, { useState, useMemo } from 'react';
import { RoommateProfile } from '../../types';
import { RoommateCard } from './RoommateCard';
import { RoommateProfileModal } from './RoommateProfileModal';
import { CreateRoommateProfileModal } from './CreateRoommateProfileModal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Sparkles,
  SlidersHorizontal,
  Plus,
  Search,
  CheckCircle2,
  Heart,
} from 'lucide-react';
import { calculateRoommateCompatibility } from '../../services/matchingEngine';

interface RoommateHubProps {
  onStartChat: (recipientId: string, recipientName: string) => void;
}

export const RoommateHub: React.FC<RoommateHubProps> = ({ onStartChat }) => {
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState<string>('All');
  const [filterCity, setFilterCity] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [onlyLiked, setOnlyLiked] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState<RoommateProfile | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Load all roommate profiles
  const allProfiles = useLiveQuery(() => db.roommateProfiles.toArray(), []) || [];

  // Load user's own roommate profile
  const myProfile: RoommateProfile | null | undefined = useLiveQuery(
    async () => {
      if (!currentUser) return null;
      const found = await db.roommateProfiles.where('userId').equals(currentUser.id).first();
      return found || null;
    },
    [currentUser?.id],
    null
  );

  // Load user's liked roommates
  const likedProfileIds = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const likes = await db.likedRoommates.where('userId').equals(currentUser.id).toArray();
      return likes.map(l => l.roommateProfileId);
    },
    [currentUser?.id]
  ) || [];

  // Filter and sort candidates by compatibility score
  const sortedAndFilteredProfiles = useMemo(() => {
    // Exclude current user from candidate list
    const candidates = allProfiles.filter(p => p.userId !== currentUser?.id);

    return candidates
      .filter(p => {
        if (onlyLiked && !likedProfileIds.includes(p.id)) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = p.name.toLowerCase().includes(q);
          const matchesBio = p.bio.toLowerCase().includes(q);
          const matchesSuburbs = p.preferredSuburbs.some(s => s.toLowerCase().includes(q));
          const matchesOcc = p.occupation.toLowerCase().includes(q);
          if (!matchesName && !matchesBio && !matchesSuburbs && !matchesOcc) {
            return false;
          }
        }

        if (filterGender !== 'All' && p.gender !== filterGender) {
          return false;
        }

        if (filterCity !== 'All' && !p.preferredCities.includes(filterCity)) {
          return false;
        }

        if (filterStatus !== 'All' && p.studentStatus !== filterStatus) {
          return false;
        }

        return true;
      })
      .map(candidate => {
        const compat = myProfile
          ? calculateRoommateCompatibility(myProfile, candidate)
          : { score: 75, grade: 'Good' as const, matchFactors: [], mismatchFactors: [] };
        return {
          profile: candidate,
          score: compat.score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [allProfiles, currentUser?.id, myProfile, likedProfileIds, onlyLiked, searchQuery, filterGender, filterCity, filterStatus]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* My Roommate Profile Status Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Matching Engine Active
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
              {myProfile
                ? `Compatibility Tailored to You ($${myProfile.budgetUsd}/mo • ${myProfile.preferredSuburbs[0] || 'Harare'})`
                : 'Find Your Ideal Zimbabwe Roommate'}
            </h2>
            <p className="text-xs text-emerald-100 max-w-xl">
              {myProfile
                ? 'Scores below reflect budget overlap, cleanliness, sleeping routines, and preferred Harare/Bulawayo suburbs.'
                : 'Set up your roommate lifestyle profile to get precision compatibility percentages and split costs safely.'}
            </p>
          </div>

          <button
            onClick={() => setShowEditProfileModal(true)}
            className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            {myProfile ? 'Edit My Profile' : '+ Create My Roommate Profile'}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, university (UZ, NUST), suburb (Avondale, Bradfield)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Liked Toggle */}
          <button
            onClick={() => setOnlyLiked(!onlyLiked)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              onlyLiked
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyLiked ? 'fill-current text-rose-600' : 'text-slate-400'}`} />
            <span>Liked ({likedProfileIds.length})</span>
          </button>
        </div>

        {/* Quick Filter Selectors */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <select
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 shrink-0 font-medium"
          >
            <option value="All">All Cities</option>
            <option value="Harare">Harare</option>
            <option value="Bulawayo">Bulawayo</option>
            <option value="Gweru">Gweru</option>
            <option value="Mutare">Mutare</option>
          </select>

          <select
            value={filterGender}
            onChange={e => setFilterGender(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 shrink-0 font-medium"
          >
            <option value="All">All Genders</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 shrink-0 font-medium"
          >
            <option value="All">Students & Professionals</option>
            <option value="Student">Students Only</option>
            <option value="Working Professional">Professionals Only</option>
          </select>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium">
          Found <span className="font-bold text-slate-800">{sortedAndFilteredProfiles.length}</span> roommate profiles ranked by match score
        </p>
      </div>

      {/* Cards Grid */}
      {allProfiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3 shadow-2xs">
          <Users className="w-12 h-12 text-emerald-600/60 mx-auto" />
          <h3 className="font-extrabold text-slate-900 text-sm">Roommate Matching Engine Ready</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No seeded roommates. Create your roommate profile to begin matching with students and working professionals in Harare, Bulawayo, Chitungwiza, and across Zimbabwe.
          </p>
          <button
            onClick={() => setShowEditProfileModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your Roommate Profile</span>
          </button>
        </div>
      ) : sortedAndFilteredProfiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-900 text-sm">No roommate profiles match</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search filters or clear the active query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAndFilteredProfiles.map(({ profile }) => (
            <RoommateCard
              key={profile.id}
              profile={profile}
              myProfile={myProfile || undefined}
              onSelect={p => setSelectedProfile(p)}
            />
          ))}
        </div>
      )}

      {/* Selected Profile Detail Modal */}
      {selectedProfile && (
        <RoommateProfileModal
          profile={selectedProfile}
          myProfile={myProfile || undefined}
          onClose={() => setSelectedProfile(null)}
          onStartChat={onStartChat}
        />
      )}

      {/* Create / Edit My Roommate Profile Modal */}
      {showEditProfileModal && (
        <CreateRoommateProfileModal
          existingProfile={myProfile || null}
          onClose={() => setShowEditProfileModal(false)}
          onSaved={() => setShowEditProfileModal(false)}
        />
      )}
    </div>
  );
};
