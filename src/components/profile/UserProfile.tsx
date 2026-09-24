import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, resetDatabaseToDefaults } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  User,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  Download,
  Upload,
  Users,
  Building,
  CheckCircle2,
  Database,
  Smartphone,
  WifiOff,
  Edit3,
  Plus,
  Trash2,
  Camera,
  MessageCircle,
  X,
  Phone,
  Mail,
  MapPin,
  Check,
} from 'lucide-react';
import { UserRole } from '../../types';
import { compressImage } from '../../services/imageCompression';

export const UserProfile: React.FC = () => {
  const {
    currentUser,
    role,
    isGuest,
    switchUserRole,
    switchUser,
    updateUserProfile,
    createNewUser,
    deleteUser,
    loginAsGuest,
    allDemoUsers,
  } = useAuth();

  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Restore JSON state
  const restoreFileInputRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  // Edit Profile modal state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editWhatsapp, setEditWhatsapp] = useState(currentUser?.whatsappNumber || currentUser?.phone || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editCity, setEditCity] = useState(currentUser?.city || 'Harare');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const editAvatarFileRef = useRef<HTMLInputElement>(null);

  // Create Profile Persona modal state
  const [showCreatePersonaModal, setShowCreatePersonaModal] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaRole, setNewPersonaRole] = useState<UserRole>('tenant');
  const [newPersonaPhone, setNewPersonaPhone] = useState('+263 77 ');
  const [newPersonaWhatsapp, setNewPersonaWhatsapp] = useState('+263 77 ');
  const [newPersonaEmail, setNewPersonaEmail] = useState('');
  const [newPersonaCity, setNewPersonaCity] = useState('Harare');
  const [newPersonaBio, setNewPersonaBio] = useState('');
  const [newPersonaAvatar, setNewPersonaAvatar] = useState('');
  const newAvatarFileRef = useRef<HTMLInputElement>(null);

  // Delete User confirmation modal
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // Status feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Live database stats
  const propCount = useLiveQuery(() => db.properties.count(), []) ?? 0;
  const tenantCount = useLiveQuery(() => db.tenants.count(), []) ?? 0;
  const roommateCount = useLiveQuery(() => db.roommateProfiles.count(), []) ?? 0;
  const paymentCount = useLiveQuery(() => db.rentPayments.count(), []) ?? 0;
  const queueCount = useLiveQuery(() => db.offlineQueue.count(), []) ?? 0;
  const msgCount = useLiveQuery(() => db.messages.count(), []) ?? 0;
  const appCount = useLiveQuery(() => db.applications.count(), []) ?? 0;

  const handleOpenEdit = () => {
    if (!currentUser) return;
    setEditName(currentUser.name);
    setEditPhone(currentUser.phone);
    setEditWhatsapp(currentUser.whatsappNumber || currentUser.phone || '');
    setEditEmail(currentUser.email);
    setEditCity(currentUser.city || 'Harare');
    setEditBio(currentUser.bio || '');
    setEditAvatar(currentUser.avatar || '');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    await updateUserProfile({
      name: editName.trim(),
      phone: editPhone.trim(),
      whatsappNumber: editWhatsapp.trim(),
      email: editEmail.trim(),
      city: editCity.trim(),
      bio: editBio.trim(),
      avatar: editAvatar.trim(),
    });

    setShowEditProfileModal(false);
    showToast('Profile details & WhatsApp communications number updated successfully!');
  };

  const handleCreatePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonaName.trim()) return;

    const created = await createNewUser({
      name: newPersonaName.trim(),
      role: newPersonaRole,
      phone: newPersonaPhone.trim(),
      whatsappNumber: newPersonaWhatsapp.trim() || newPersonaPhone.trim(),
      email: newPersonaEmail.trim() || `${newPersonaName.toLowerCase().replace(/\s+/g, '')}@comfort.zw`,
      city: newPersonaCity.trim(),
      bio: newPersonaBio.trim() || `Active ${newPersonaRole.replace('_', ' ')} in ${newPersonaCity}.`,
      avatar: newPersonaAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      verified: true,
    });

    setShowCreatePersonaModal(false);
    showToast(`Persona "${created.name}" created and switched to active profile!`);
    // Reset form
    setNewPersonaName('');
    setNewPersonaPhone('+263 77 ');
    setNewPersonaWhatsapp('+263 77 ');
    setNewPersonaEmail('');
    setNewPersonaBio('');
    setNewPersonaAvatar('');
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    await deleteUser(userToDelete.id);
    showToast(`User profile "${userToDelete.name}" deleted.`);
    setUserToDelete(null);
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>, target: 'edit' | 'new') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file, 400, 400, 0.8);
      if (target === 'edit') {
        setEditAvatar(compressed.dataUrl);
      } else {
        setNewPersonaAvatar(compressed.dataUrl);
      }
      showToast('Profile image uploaded and compressed from device!');
    } catch (err) {
      console.error('Failed to compress avatar', err);
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          if (target === 'edit') setEditAvatar(ev.target.result as string);
          else setNewPersonaAvatar(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleResetData = async () => {
    setShowConfirmReset(false);
    setResetting(true);
    await resetDatabaseToDefaults();
    setResetting(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  };

  // Export full database JSON backup
  const handleExportBackup = async () => {
    const backup = {
      properties: await db.properties.toArray(),
      tenants: await db.tenants.toArray(),
      rentPayments: await db.rentPayments.toArray(),
      roommateProfiles: await db.roommateProfiles.toArray(),
      applications: await db.applications.toArray(),
      users: await db.users.toArray(),
      savedProperties: await db.savedProperties.toArray(),
      exportedAt: new Date().toISOString(),
      platform: 'Comfort Housing and Rental Hub Zimbabwe',
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comfort_housing_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Database backup JSON exported successfully!');
  };

  // Restore database JSON backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    setRestoreMessage(null);

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        let propsLoaded = 0;
        let tenantsLoaded = 0;
        let roommatesLoaded = 0;
        let paymentsLoaded = 0;
        let appsLoaded = 0;

        await db.transaction(
          'rw',
          [
            db.properties,
            db.tenants,
            db.rentPayments,
            db.roommateProfiles,
            db.applications,
            db.users,
            db.savedProperties,
          ],
          async () => {
            if (Array.isArray(data.properties) && data.properties.length > 0) {
              await db.properties.bulkPut(data.properties);
              propsLoaded = data.properties.length;
            }
            if (Array.isArray(data.tenants) && data.tenants.length > 0) {
              await db.tenants.bulkPut(data.tenants);
              tenantsLoaded = data.tenants.length;
            }
            if (Array.isArray(data.rentPayments) && data.rentPayments.length > 0) {
              await db.rentPayments.bulkPut(data.rentPayments);
              paymentsLoaded = data.rentPayments.length;
            }
            if (Array.isArray(data.roommateProfiles) && data.roommateProfiles.length > 0) {
              await db.roommateProfiles.bulkPut(data.roommateProfiles);
              roommatesLoaded = data.roommateProfiles.length;
            }
            if (Array.isArray(data.applications) && data.applications.length > 0) {
              await db.applications.bulkPut(data.applications);
              appsLoaded = data.applications.length;
            }
            if (Array.isArray(data.users) && data.users.length > 0) {
              await db.users.bulkPut(data.users);
            }
            if (Array.isArray(data.savedProperties) && data.savedProperties.length > 0) {
              await db.savedProperties.bulkPut(data.savedProperties);
            }
          }
        );

        const msg = `Database successfully restored! Populated ${propsLoaded} properties, ${roommatesLoaded} roommates, ${tenantsLoaded} tenants, and ${paymentsLoaded} payments.`;
        setRestoreMessage(msg);
        showToast(msg);
      } catch (err: any) {
        console.error('Failed to restore database from JSON:', err);
        const errMsg = `Failed to restore database: ${err.message || 'Invalid JSON backup format'}`;
        setRestoreMessage(errMsg);
        showToast(errMsg);
      } finally {
        setRestoring(false);
        if (restoreFileInputRef.current) {
          restoreFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const roleDescriptions: Record<UserRole, string> = {
    tenant: 'Search listings, compare properties, apply for rentals, find roommates, and chat with landlords.',
    landlord: 'Create listings, manage units, issue rent receipts, track lease expirations, and oversee repairs.',
    property_manager: 'Manage multiple portfolios across Harare & Bulawayo with bulk reporting.',
    admin: 'Platform moderation, verification badge approval, and system settings.',
    guest: 'Browse app listings and properties with read-only permissions; guest rental applications enabled.',
  };

  const currentWhatsapp = currentUser?.whatsappNumber || currentUser?.phone || 'Not configured';

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-5">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-in fade-in duration-150">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* User Info Card (Profile Read & Update Trigger) */}
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
                  {currentUser?.name?.charAt(0) || 'U'}
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
                  {currentUser?.name || 'Guest User'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                  {role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                <span>{currentUser?.phone}</span>
                <span>•</span>
                <span>{currentUser?.email}</span>
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
                <span>Edit Profile Details</span>
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
                Rental WhatsApp Communications Number:
              </span>
              <span className="text-emerald-800 font-mono font-semibold">
                {currentWhatsapp}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-700 sm:text-right">
            Active for rental applications, inquiry redirects, and landlord notification alerts.
          </p>
        </div>

        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
          {currentUser?.bio || roleDescriptions[role]}
        </p>
      </div>

      {/* Profile Persona Management (Create, Read, Update, Delete) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              User Profiles & Role Personas
            </h3>
            <p className="text-xs text-slate-500">
              Manage accounts, switch personas, or create new custom landlord/tenant profiles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreatePersonaModal(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Profile</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {allDemoUsers.map(user => (
            <div
              key={user.id}
              className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                currentUser?.id === user.id
                  ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => switchUser(user.id)}
                className="flex items-center gap-3 flex-1 text-left truncate cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">
                      {user.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold truncate">{user.name}</h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {user.role.replace('_', ' ').toUpperCase()} • {user.whatsappNumber || user.phone}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                {currentUser?.id === user.id ? (
                  <span className="p-1 text-emerald-600" title="Active user">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setUserToDelete({ id: user.id, name: user.name })}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title={`Delete persona ${user.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Guest Browsing Persona Tile */}
          <div
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
              isGuest
                ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <button
              type="button"
              onClick={loginAsGuest}
              className="flex items-center gap-3 flex-1 text-left truncate cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 border border-slate-300">
                G
              </div>
              <div>
                <h4 className="text-xs font-bold">Guest Explorer</h4>
                <p className="text-[11px] text-slate-500">
                  GUEST • Read-only browsing & rental applications
                </p>
              </div>
            </button>
            {isGuest && (
              <span className="p-1 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Offline Database & Storage Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Offline IndexedDB Storage Engine
              </h3>
              <p className="text-xs text-slate-500">
                Data persists locally on device. Zero internet startup required.
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

        {/* Database Action Buttons: Export JSON and Restore JSON */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
          {/* Export Database JSON */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Database JSON</span>
          </button>

          {/* Restore Database JSON */}
          <button
            type="button"
            onClick={() => restoreFileInputRef.current?.click()}
            disabled={restoring}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Upload className={`w-3.5 h-3.5 ${restoring ? 'animate-bounce' : ''}`} />
            <span>{restoring ? 'Restoring JSON...' : 'Restore Database JSON'}</span>
          </button>

          {/* Hidden File Input for Restore JSON */}
          <input
            type="file"
            ref={restoreFileInputRef}
            accept=".json,application/json"
            onChange={handleRestoreBackup}
            className="hidden"
          />

          {/* Reset Demo Data */}
          <button
            type="button"
            onClick={() => setShowConfirmReset(true)}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition cursor-pointer ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting...' : 'Reset Default Demo Data'}</span>
          </button>
        </div>

        {restoreMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center justify-between">
            <span>{restoreMessage}</span>
            <button
              type="button"
              onClick={() => setRestoreMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {showConfirmReset && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
              <h4 className="font-extrabold text-slate-900 text-sm">
                Reset Demo Database?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                This will reset your local IndexedDB storage back to default Zimbabwe rentals, tenants, and roommate listings. Works completely offline.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetData}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {resetDone && (
          <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg font-medium">
            Database re-seeded with fresh Zimbabwe rentals, roommates, and leases.
          </p>
        )}
      </div>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h4 className="font-extrabold text-slate-900 text-sm">
              Delete Profile Persona?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete profile <strong>"{userToDelete.name}"</strong>? This will remove this persona from your local device storage.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Delete Persona
              </button>
            </div>
          </div>
        </div>
      )}

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
                  Update your contact details, WhatsApp rental line, and bio.
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
                      {editName.charAt(0) || 'U'}
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
                    onChange={e => handleAvatarFile(e, 'edit')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editAvatarFileRef.current?.click()}
                    disabled={avatarUploading}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{avatarUploading ? 'Processing...' : 'Upload Image from Device'}</span>
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
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-emerald-800 mb-1">
                    WhatsApp Number (Communications & Alerts)
                  </label>
                  <input
                    type="tel"
                    required
                    value={editWhatsapp}
                    onChange={e => setEditWhatsapp(e.target.value)}
                    placeholder="+263 77 123 4567"
                    className="w-full px-3 py-2 border border-emerald-400 bg-emerald-50/40 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                  <span className="text-[10px] text-emerald-700 mt-0.5 block">
                    Used for rental applications & notification redirects.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
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

      {/* Create New Profile Persona Modal */}
      {showCreatePersonaModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-5 animate-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Create New Profile Persona
                </h3>
                <p className="text-xs text-slate-500">
                  Add another custom user account with role, contact, and WhatsApp settings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePersonaModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePersona} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nyasha Makoni"
                    value={newPersonaName}
                    onChange={e => setNewPersonaName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newPersonaRole}
                    onChange={e => setNewPersonaRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                  >
                    <option value="tenant">Tenant</option>
                    <option value="landlord">Landlord</option>
                    <option value="property_manager">Property Manager</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPersonaPhone}
                    onChange={e => setNewPersonaPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-emerald-800 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPersonaWhatsapp}
                    onChange={e => setNewPersonaWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-400 bg-emerald-50/40 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@comfort.zw"
                    value={newPersonaEmail}
                    onChange={e => setNewPersonaEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={newPersonaCity}
                    onChange={e => setNewPersonaCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Photo Upload for new persona */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 shrink-0 bg-slate-200">
                  {newPersonaAvatar ? (
                    <img src={newPersonaAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                      +
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    ref={newAvatarFileRef}
                    accept="image/*"
                    onChange={e => handleAvatarFile(e, 'new')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => newAvatarFileRef.current?.click()}
                    disabled={avatarUploading}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{avatarUploading ? 'Processing...' : 'Upload Avatar from Device'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bio / Notes
                </label>
                <textarea
                  rows={2}
                  value={newPersonaBio}
                  onChange={e => setNewPersonaBio(e.target.value)}
                  placeholder="Short description or rental preferences..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePersonaModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
                >
                  Create & Activate Persona
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zimbabwe Offline Architecture Guarantee */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-2 text-xs">
        <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Optimized for Zimbabwe Connectivity & Privacy
        </h4>
        <p className="text-slate-300 leading-relaxed">
          Comfort Housing Hub operates on a <strong>Local-First Reactive Architecture</strong>. All property listings, Zimbabwe location tables, photos, tenants, leases, and roommate algorithms execute on your device’s local SQLite/IndexedDB engine. Zero network calls on startup ensures instant loading on Econet, NetOne, Telecel, and intermittent WiFi.
        </p>
      </div>
    </div>
  );
};
