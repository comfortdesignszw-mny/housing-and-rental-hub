import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';
import { Bell, Home, ChevronDown, Check, ShieldCheck, UserCheck } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { UserRole } from '../../types';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenCreateListing: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  onOpenCreateListing,
}) => {
  const { currentUser, role, isGuest, switchUserRole, switchUser, loginAsGuest, allDemoUsers } = useAuth();
  const isOnline = useOnlineStatus();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const unreadCount = useLiveQuery(
    () => db.notifications.where('read').equals(0 as any).count(),
    []
  ) || 0;

  const roleLabels: Record<UserRole, { label: string; badgeColor: string }> = {
    tenant: { label: 'Tenant', badgeColor: 'bg-blue-100 text-blue-800' },
    landlord: { label: 'Landlord', badgeColor: 'bg-emerald-100 text-emerald-800' },
    property_manager: { label: 'Property Manager', badgeColor: 'bg-purple-100 text-purple-800' },
    admin: { label: 'Admin', badgeColor: 'bg-amber-100 text-amber-900' },
    guest: { label: 'Guest (Browse Only)', badgeColor: 'bg-slate-100 text-slate-700 font-semibold' },
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
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
              Rental & Roommate Hub • Offline-First
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Quick Create Listing button for Landlords */}
          {(role === 'landlord' || role === 'property_manager') && (
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
            title={isOnline ? 'Online - Database ready' : 'Working offline without internet'}
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

          {/* Role Switcher Menu */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
              title="Switch user role or persona"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                  {currentUser?.name.charAt(0) || 'U'}
                </div>
              )}
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                  roleLabels[role]?.badgeColor || 'bg-slate-100 text-slate-700'
                }`}
              >
                {roleLabels[role]?.label || role}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showRoleMenu && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Current Persona
                  </p>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentUser?.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser?.phone} • {currentUser?.city || 'Harare'}
                  </p>
                </div>

                <div className="py-1">
                  <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase mb-1">
                    Switch Test Persona / Role
                  </p>
                  {allDemoUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition ${
                        currentUser?.id === u.id
                          ? 'bg-emerald-50 text-emerald-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{u.name}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-medium ${
                              roleLabels[u.role]?.badgeColor
                            }`}
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      {currentUser?.id === u.id && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  ))}

                  {/* Browse as Guest option */}
                  <button
                    type="button"
                    onClick={() => {
                      loginAsGuest();
                      setShowRoleMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition ${
                      isGuest
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">Guest Explorer</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-700">
                          Guest (No Account)
                        </span>
                      </div>
                    </div>
                    {isGuest && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-2 mt-1 px-2">
                  <p className="text-[10px] text-slate-400 text-center">
                    Offline session saved locally
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
