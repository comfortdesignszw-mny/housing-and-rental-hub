import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';
import { Bell, Home, ChevronDown, ShieldCheck, LogOut, LogIn, User, CheckCircle2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { UserRole } from '../../types';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenCreateListing: () => void;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  onOpenCreateListing,
  onOpenAuthModal,
}) => {
  const { currentUser, role, isGuest, isAuthenticated, logout } = useAuth();
  const isOnline = useOnlineStatus();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account menu when clicking anywhere outside
  useEffect(() => {
    if (!showAccountMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAccountMenu]);

  const unreadCount = useLiveQuery(
    () => db.notifications.where('read').equals(0 as any).count(),
    []
  ) || 0;

  const roleLabels: Record<UserRole, { label: string; badgeColor: string }> = {
    tenant: { label: 'Tenant', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
    landlord: { label: 'Landlord', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    property_manager: { label: 'Property Manager', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
    admin: { label: 'Administrator', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' },
    guest: { label: 'Guest', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-xs">
            <Home className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900">
                Comfort Housing
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60 hidden sm:inline-flex items-center gap-1">
                <span>🇿🇼</span> Zimbabwe
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block -mt-0.5">
              Real World Rentals • Cloud Persistence & Offline Cache
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Quick Create Listing button for Landlords & Admins */}
          {(role === 'landlord' || role === 'property_manager' || role === 'admin') && (
            <button
              onClick={onOpenCreateListing}
              className="hidden md:flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xs transition"
            >
              <span>+ Add Property</span>
            </button>
          )}

          {/* Offline/Online Indicator */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
            title={isOnline ? 'Online - Connected to Firestore' : 'Offline - Queuing changes locally in IndexedDB'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition active:scale-95"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Prominent Log In Button for Guest Mode (Requirement 4) */}
          {isGuest && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
              title="Sign in or register for Comfort Housing"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}

          {/* User Profile Menu on Top Bar */}
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
              title="Authenticated User Profile"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
                </div>
              )}
              <div className="text-left hidden sm:block max-w-[100px] truncate">
                <span className="text-xs font-semibold text-slate-800 block truncate leading-tight">
                  {currentUser?.name || 'Guest User'}
                </span>
              </div>
              <span
                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${
                  roleLabels[role]?.badgeColor || 'bg-slate-100 text-slate-700'
                }`}
              >
                {roleLabels[role]?.label || role}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Account Info & Session Dropdown */}
            {showAccountMenu && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2.5 shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    {role === 'admin' ? (
                      <span className="flex items-center gap-1 text-amber-700">
                        <ShieldCheck className="w-3 h-3" /> System Administrator
                      </span>
                    ) : (
                      <span>Authenticated Account</span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentUser?.name || 'Guest Explorer'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser?.email || 'guest@comfort.zw'}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        roleLabels[role]?.badgeColor
                      }`}
                    >
                      ROLE: {role.toUpperCase()}
                    </span>
                    {currentUser?.verified && (
                      <span className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-1 space-y-1">
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl text-rose-600 hover:bg-rose-50 font-semibold transition text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu(false);
                        if (onOpenAuthModal) onOpenAuthModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition text-left cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In / Register</span>
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-2 mt-1 px-2 text-[10px] text-slate-400 text-center">
                  Protected with Firebase Auth & RBAC
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
