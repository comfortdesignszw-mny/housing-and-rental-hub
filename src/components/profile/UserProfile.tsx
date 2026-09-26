import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, clearLocalCache } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ShieldCheck,
  CheckCircle2,
  Database,
  Edit3,
  MessageCircle,
  X,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  LogIn,
  AlertCircle,
  Download,
} from 'lucide-react';
import { UserRole, User } from '../../types';
import { compressImage } from '../../services/imageCompression';
import { db as firestoreDb } from '../../db/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface UserProfileProps {
  onOpenAuthModal?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onOpenAuthModal }) => {
  const {
    currentUser,
    role,
    isAdmin,
    isGuest,
    isAuthenticated,
    updateUserProfile,
    updateUserRoleByAdmin,
    allRegisteredUsers,
    refreshRegisteredUsers,
    logout,
  } = useAuth();

  // Admin users directory filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Edit Profile modal state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editWhatsapp, setEditWhatsapp] = useState(
    currentUser?.whatsappNumber || currentUser?.phone || ''
  );
  const [editCity, setEditCity] = useState(currentUser?.city || 'Harare');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const editAvatarFileRef = useRef<HTMLInputElement>(null);

  // Status feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Live local cache stats
  const propCount = useLiveQuery(() => db.properties.count(), []) ?? 0;
  const tenantCount = useLiveQuery(() => db.tenants.count(), []) ?? 0;
  const roommateCount = useLiveQuery(() => db.roommateProfiles.count(), []) ?? 0;
  const msgCount = useLiveQuery(() => db.messages.count(), []) ?? 0;
  const appCount = useLiveQuery(() => db.applications.count(), []) ?? 0;

  useEffect(() => {
    if (isAdmin) {
      refreshRegisteredUsers();
    }
  }, [isAdmin, refreshRegisteredUsers]);

  const handleOpenEdit = () => {
    if (!currentUser) return;
    setEditName(currentUser.name);
    setEditPhone(currentUser.phone);
    setEditWhatsapp(currentUser.whatsappNumber || currentUser.phone || '');
    setEditCity(currentUser.city || 'Harare');
    setEditBio(currentUser.bio || '');
    setEditAvatar(currentUser.avatar || '');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const newPhone = editPhone.trim();
    const newWhatsapp = editWhatsapp.trim() || newPhone;

    await updateUserProfile({
      name: editName.trim(),
      phone: newPhone,
      whatsappNumber: newWhatsapp,
      city: editCity.trim(),
      bio: editBio.trim(),
      avatar: editAvatar.trim(),
    });

    // Sync updated WhatsApp number to all properties published by this user
    try {
      const userProps = await db.properties.where('landlordId').equals(currentUser.id).toArray();
      for (const p of userProps) {
        await db.properties.update(p.id, {
          landlordPhone: newWhatsapp || newPhone,
        });
        try {
          await updateDoc(doc(firestoreDb, 'properties', p.id), {
            landlordPhone: newWhatsapp || newPhone,
          });
        } catch (propErr) {
          console.warn('Could not sync property landlord phone to Firestore:', propErr);
        }
      }
    } catch (err) {
      console.warn('Could not sync landlord phone across properties:', err);
    }

    setShowEditProfileModal(false);
    showToast('Profile details & WhatsApp communications line updated successfully!');
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file, 400, 400, 0.8);
      setEditAvatar(compressed.dataUrl);
      showToast('Profile image uploaded and compressed from device!');
    } catch (err) {
      console.error('Failed to compress avatar', err);
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          setEditAvatar(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRoleChangeByAdmin = async (targetUserId: string, newRole: UserRole) => {
    setUpdatingUserId(targetUserId);
    try {
      await updateUserRoleByAdmin(targetUserId, newRole);
      showToast(`User role updated to ${newRole.toUpperCase()} successfully.`);
    } catch (err: any) {
      showToast(`Failed to update role: ${err.message || 'Permission denied'}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Clear local offline IndexedDB cache? Real data will re-sync from Firestore on connection.')) {
      await clearLocalCache();
      showToast('Local offline cache cleared.');
    }
  };

  const roleDescriptions: Record<UserRole, string> = {
    tenant: 'Search listings, compare properties, apply for rentals, find roommates, and chat with landlords.',
    landlord: 'Create listings, manage units, issue rent receipts, track lease expirations, and oversee repairs.',
    property_manager: 'Manage multiple portfolios across Harare & Bulawayo with bulk reporting.',
    admin: 'Platform moderation, user role governance (RBAC), verification badge approval, and system settings.',
    guest: 'Browse app listings and properties with read-only permissions; sign in to apply or list.',
  };

  const currentWhatsapp = currentUser?.whatsappNumber || currentUser?.phone || 'Not configured';

  // Filtered users for Admin view
  const filteredUsers = allRegisteredUsers.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // In Guest Mode: Just show the Guest Explorer card without internal database metrics or cache controls
  if (isGuest) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 space-y-4">
        {/* Toast Feedback */}
        {toastMessage && (
          <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-in fade-in duration-150">
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white ml-2 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 text-2xl font-bold flex items-center justify-center mx-auto shadow-2xs">
            G
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-slate-900">
              Guest Explorer
            </h2>
            <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase border border-slate-200">
              Guest Mode
            </span>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed pt-1">
              You are currently browsing Comfort Housing in guest mode. Sign in or register to publish rental properties, apply directly, and connect with verified roommates across Zimbabwe.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Create Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-5">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-in fade-in duration-150">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* User Info Card (Profile Read & Update) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 text-xl font-bold flex items-center justify-center">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              {currentUser?.verified && (
                <span className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-600 text-white rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {currentUser?.name || 'Guest Explorer'}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    role === 'admin'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                <span>{currentUser?.email || 'No email attached'}</span>
                {currentUser?.phone && (
                  <>
                    <span>•</span>
                    <span>{currentUser.phone}</span>
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-400">
                Location: {currentUser?.city || 'Harare, Zimbabwe'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isGuest && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated WhatsApp Communications and Alerts Strip */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-emerald-950 block">
                WhatsApp Communications Line:
              </span>
              <span className="text-emerald-800 font-mono font-semibold">
                {currentWhatsapp}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-700 sm:text-right">
            Synced with real-time in-app messaging and notification alerts.
          </p>
        </div>

        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
          {currentUser?.bio || roleDescriptions[role]}
        </p>
      </div>

      {/* SECTION VISIBILITY GUARD: Only Admin sees the Registered Users and Roles Directory */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Registered Users & Roles Directory</span>
                  <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    Admin RBAC
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Total {allRegisteredUsers.length} registered accounts in the database. Manage roles and enforce access control.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refreshRegisteredUsers}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Users</span>
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search registered users by name, email, or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium outline-hidden"
            >
              <option value="all">All Roles ({allRegisteredUsers.length})</option>
              <option value="admin">Admins</option>
              <option value="landlord">Landlords</option>
              <option value="tenant">Tenants</option>
              <option value="property_manager">Property Managers</option>
            </select>
          </div>

          {/* User Table List */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">Email / Phone</th>
                  <th className="px-3 py-2.5">Current Role</th>
                  <th className="px-3 py-2.5 text-right">Assign RBAC Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No registered users found matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0">
                            {user.avatar ? (
                              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-slate-600 text-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[150px]">
                              {user.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <span className="text-slate-800 font-mono text-[11px] block truncate max-w-[180px]">
                          {user.email}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {user.whatsappNumber || user.phone || 'No phone'}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            user.role === 'admin'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : user.role === 'landlord'
                              ? 'bg-emerald-100 text-emerald-800'
                              : user.role === 'property_manager'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {user.role.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <select
                          value={user.role}
                          disabled={updatingUserId === user.id || user.id === currentUser?.id}
                          onChange={e => handleRoleChangeByAdmin(user.id, e.target.value as UserRole)}
                          className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white font-medium outline-hidden disabled:opacity-50 cursor-pointer"
                        >
                          <option value="tenant">Tenant</option>
                          <option value="landlord">Landlord</option>
                          <option value="property_manager">Property Manager</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Offline Database Storage & Scalability Metrics */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Firestore Cloud Persistence & Local IndexedDB Cache
              </h3>
              <p className="text-xs text-slate-500">
                Scalable cloud database with horizontal load balancing and high-speed local offline caching.
              </p>
            </div>
          </div>
        </div>

        {/* Database Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Properties
            </span>
            <span className="text-base font-extrabold text-slate-900">
              {propCount}
            </span>
            <span className="text-[10px] text-slate-500 block">Listings cached</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Applications
            </span>
            <span className="text-base font-extrabold text-slate-900">
              {appCount}
            </span>
            <span className="text-[10px] text-slate-500 block">Rental dossiers</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Roommates
            </span>
            <span className="text-base font-extrabold text-slate-900">
              {roommateCount}
            </span>
            <span className="text-[10px] text-slate-500 block">Matching profiles</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Tenants & Leases
            </span>
            <span className="text-base font-extrabold text-slate-900">
              {tenantCount}
            </span>
            <span className="text-[10px] text-slate-500 block">Tenancies managed</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleClearCache}
            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition cursor-pointer"
          >
            Clear Local Cache
          </button>
        </div>
      </div>

      {/* Edit Profile Details Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-5 animate-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Edit Profile Details
                </h3>
                <p className="text-xs text-slate-500">
                  Update contact information, location, and WhatsApp rental communications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-3.5 text-xs">
              {/* Avatar Upload */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-500 shrink-0 bg-slate-200">
                  {editAvatar ? (
                    <img src={editAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                      {editName.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <span className="font-semibold text-slate-800 block text-[11px]">
                    Profile Photo
                  </span>
                  <input
                    type="file"
                    ref={editAvatarFileRef}
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editAvatarFileRef.current?.click()}
                    disabled={avatarUploading}
                    className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                  >
                    {avatarUploading ? 'Processing...' : 'Upload Image from Device'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Primary Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={e => {
                      const newPhone = e.target.value;
                      const prevPhone = editPhone;
                      setEditPhone(newPhone);
                      // Auto-suggest the same number for WhatsApp if empty or previously matching
                      if (!editWhatsapp || editWhatsapp === prevPhone || editWhatsapp === '+263 77 ') {
                        setEditWhatsapp(newPhone);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-emerald-800">
                      WhatsApp Communications Number
                    </label>
                    {editPhone && editWhatsapp !== editPhone && (
                      <button
                        type="button"
                        onClick={() => setEditWhatsapp(editPhone)}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
                      >
                        Same as phone
                      </button>
                    )}
                  </div>
                  <input
                    type="tel"
                    required
                    value={editWhatsapp}
                    onChange={e => setEditWhatsapp(e.target.value)}
                    placeholder="+263 77 123 4567"
                    className="w-full px-3 py-2 border border-emerald-400 bg-emerald-50/40 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  City / Town
                </label>
                <input
                  type="text"
                  required
                  value={editCity}
                  onChange={e => setEditCity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bio / About
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
