import React, { useState, useRef } from 'react';
import { RoommateProfile } from '../../types';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import { X, Sparkles, Camera, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { getSuburbsByCity } from '../../data/zimbabweLocations';
import { compressImage } from '../../services/imageCompression';

interface CreateRoommateProfileModalProps {
  existingProfile?: RoommateProfile | null;
  onClose: () => void;
  onSaved: (profile: RoommateProfile) => void;
}

export const CreateRoommateProfileModal: React.FC<CreateRoommateProfileModalProps> = ({
  existingProfile,
  onClose,
  onSaved,
}) => {
  const { currentUser } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string>(
    existingProfile?.avatar ||
      currentUser?.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadedMsg, setImageUploadedMsg] = useState<string | null>(null);

  const [name, setName] = useState(existingProfile?.name || (currentUser?.id !== 'user_guest' ? currentUser?.name : '') || '');
  const [age, setAge] = useState(existingProfile?.age || 23);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(
    existingProfile?.gender || 'Female'
  );
  const [occupation, setOccupation] = useState(
    existingProfile?.occupation || 'Software Engineer / Student'
  );
  const [studentStatus, setStudentStatus] = useState<'Student' | 'Working Professional' | 'Both'>(
    existingProfile?.studentStatus || 'Working Professional'
  );
  const [universityOrWorkplace, setUniversityOrWorkplace] = useState(
    existingProfile?.universityOrWorkplace || 'Harare Central Business District'
  );
  const [budgetUsd, setBudgetUsd] = useState(existingProfile?.budgetUsd || 150);
  const [selectedCity, setSelectedCity] = useState(
    existingProfile?.preferredCities?.[0] || 'Harare'
  );
  const [selectedSuburb, setSelectedSuburb] = useState(
    existingProfile?.preferredSuburbs?.[0] || 'Avondale'
  );
  const [moveInDate, setMoveInDate] = useState(
    existingProfile?.moveInDate || '2026-10-01'
  );
  const [cleanliness, setCleanliness] = useState<'Very Clean' | 'Moderate' | 'Relaxed'>(
    existingProfile?.cleanliness || 'Very Clean'
  );
  const [sleepSchedule, setSleepSchedule] = useState<'Early Bird' | 'Night Owl' | 'Flexible'>(
    existingProfile?.sleepSchedule || 'Early Bird'
  );
  const [smokingPreference, setSmokingPreference] = useState<'Non-Smoker' | 'Smoker' | 'Outside Only' | 'Doesn\'t Matter'>(
    existingProfile?.smokingPreference || 'Non-Smoker'
  );
  const [drinkingPreference, setDrinkingPreference] = useState<'Non-Drinker' | 'Social Drinker' | 'Doesn\'t Matter'>(
    existingProfile?.drinkingPreference || 'Social Drinker'
  );
  const [guestPolicy, setGuestPolicy] = useState<'No Overnight Guests' | 'Weekends Only' | 'Occasional' | 'Flexible'>(
    existingProfile?.guestPolicy || 'Occasional'
  );
  const [bio, setBio] = useState(
    existingProfile?.bio ||
      'Looking for a clean, respectful roommate to share rent and utilities in a secure cottage or flat.'
  );

  const suburbs = getSuburbsByCity(selectedCity);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageUploadedMsg(null);
    try {
      const compressed = await compressImage(file, 500, 500, 0.8);
      setAvatar(compressed.dataUrl);
      setImageUploadedMsg('Photo uploaded and compressed from device!');
      setTimeout(() => setImageUploadedMsg(null), 3000);
    } catch (err) {
      console.error('Failed to compress avatar image', err);
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          setAvatar(ev.target.result as string);
          setImageUploadedMsg('Photo loaded from device.');
          setTimeout(() => setImageUploadedMsg(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userId = currentUser && currentUser.id !== 'user_guest'
      ? currentUser.id
      : existingProfile?.userId || `user_${Date.now()}`;
    const userPhone = currentUser && currentUser.id !== 'user_guest'
      ? (currentUser.whatsappNumber || currentUser.phone)
      : existingProfile?.phone || '+263 77 123 4567';
    const userEmail = currentUser && currentUser.id !== 'user_guest'
      ? currentUser.email
      : existingProfile?.email || 'roommate@comfort.zw';

    const profileData: RoommateProfile = {
      id: existingProfile?.id || `roommate_${userId}`,
      userId,
      name,
      age: Number(age),
      gender,
      occupation,
      budgetUsd: Number(budgetUsd),
      studentStatus,
      universityOrWorkplace,
      preferredProvinces: [selectedCity === 'Bulawayo' ? 'Bulawayo' : 'Harare'],
      preferredCities: [selectedCity],
      preferredSuburbs: [selectedSuburb],
      accommodationTypeWanted: ['Apartment', 'Cottage', 'Flat'],
      moveInDate,
      cleanliness,
      sleepSchedule,
      smokingPreference,
      drinkingPreference,
      guestPolicy,
      petTolerance: 'Neutral',
      bio,
      avatar,
      phone: userPhone,
      email: userEmail,
      verified: true,
      createdAt: existingProfile?.createdAt || Date.now(),
    };

    await db.roommateProfiles.put(profileData);
    onSaved(profileData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold">
              {existingProfile ? 'Edit Roommate Profile' : 'Create Roommate Profile'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
          {/* Profile Photo Uploader from Device */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0 bg-slate-200">
              <img src={avatar} alt="Profile preview" className="w-full h-full object-cover" />
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                  Compressing...
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <label className="block font-bold text-slate-900 text-xs">
                Roommate Profile Photo
              </label>
              <p className="text-[11px] text-slate-500">
                Upload a photo directly from your device. Automatically compressed on-device for offline storage.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingImage ? 'Uploading...' : 'Upload Image from Device'}</span>
                </button>

                {avatar && (
                  <button
                    type="button"
                    onClick={() =>
                      setAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80')
                    }
                    className="text-slate-500 hover:text-rose-600 text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 transition cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {imageUploadedMsg && (
                <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{imageUploadedMsg}</span>
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Your Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">Age</label>
              <input
                type="number"
                min={18}
                max={99}
                required
                value={age}
                onChange={e => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Occupation Type</label>
              <select
                value={studentStatus}
                onChange={e => setStudentStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
              >
                <option value="Working Professional">Working Professional</option>
                <option value="Student">Student</option>
                <option value="Both">Both (Working & Student)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Occupation / University (e.g. UZ, NUST, Fintech)
            </label>
            <input
              type="text"
              required
              value={occupation}
              onChange={e => setOccupation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          {/* Budget & Target City */}
          <div className="grid grid-cols-2 gap-3 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
            <div>
              <label className="block font-bold text-emerald-950 mb-1">
                Your Monthly Budget ($ USD)
              </label>
              <input
                type="number"
                min={30}
                max={2000}
                required
                value={budgetUsd}
                onChange={e => setBudgetUsd(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-emerald-950 mb-1">Target City</label>
              <select
                value={selectedCity}
                onChange={e => {
                  setSelectedCity(e.target.value);
                  const sub = getSuburbsByCity(e.target.value);
                  setSelectedSuburb(sub[0] || '');
                }}
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg"
              >
                <option value="Harare">Harare</option>
                <option value="Bulawayo">Bulawayo</option>
                <option value="Gweru">Gweru</option>
                <option value="Mutare">Mutare</option>
                <option value="Chinhoyi">Chinhoyi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Preferred Suburb / Area
            </label>
            <select
              value={selectedSuburb}
              onChange={e => setSelectedSuburb(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
            >
              {suburbs.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Lifestyle Preferences */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="font-bold text-slate-900">Lifestyle Matching Factors</h4>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                  Cleanliness
                </label>
                <select
                  value={cleanliness}
                  onChange={e => setCleanliness(e.target.value as any)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Very Clean">Very Clean</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Relaxed">Relaxed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                  Sleep Schedule
                </label>
                <select
                  value={sleepSchedule}
                  onChange={e => setSleepSchedule(e.target.value as any)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Early Bird">Early Bird (Morning)</option>
                  <option value="Night Owl">Night Owl (Late night)</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                  Smoking Policy
                </label>
                <select
                  value={smokingPreference}
                  onChange={e => setSmokingPreference(e.target.value as any)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Non-Smoker">Non-Smoker</option>
                  <option value="Smoker">Smoker</option>
                  <option value="Outside Only">Outside Only</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                  Guest Policy
                </label>
                <select
                  value={guestPolicy}
                  onChange={e => setGuestPolicy(e.target.value as any)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Occasional">Occasional</option>
                  <option value="Weekends Only">Weekends Only</option>
                  <option value="No Overnight Guests">No Overnight Guests</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Short Bio / About You
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition"
            >
              Save Roommate Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
