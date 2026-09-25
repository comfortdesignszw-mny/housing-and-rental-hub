import React from 'react';
import { Home, Users, Building2, MessageSquare, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

export type NavTab = 'listings' | 'roommates' | 'landlord' | 'messages' | 'profile';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onTabChange }) => {
  const { role, currentUser, isGuest } = useAuth();

  const unreadMessagesCount = useLiveQuery(
    () =>
      currentUser
        ? db.messages
            .where('recipientId')
            .equals(currentUser.id)
            .filter(m => m.status !== 'read')
            .count()
        : Promise.resolve(0),
    [currentUser?.id]
  ) || 0;

  const allTabs = [
    {
      id: 'listings' as NavTab,
      label: 'Listings',
      icon: Home,
      badge: null,
    },
    {
      id: 'roommates' as NavTab,
      label: 'Roommates',
      icon: Users,
      badge: 'Match',
    },
    {
      id: 'landlord' as NavTab,
      label: role === 'tenant' ? 'My Tenancy' : 'Landlord Hub',
      icon: Building2,
      badge: null,
    },
    {
      id: 'messages' as NavTab,
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
    },
    {
      id: 'profile' as NavTab,
      label: 'Profile',
      icon: UserCheck,
      badge: null,
    },
  ];

  // In Guest mode, disable the Landlord hub section so it is not visible to guest browsers (Requirement 3)
  const tabs = isGuest ? allTabs.filter(tab => tab.id !== 'landlord') : allTabs;

  return (
    <>
      {/* Desktop Sub-navigation Tab Bar */}
      <nav className="hidden md:block bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 flex space-x-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition relative ${
                  isActive
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      typeof tab.badge === 'number'
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Fixed Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pb-safe">
        <div className={`grid ${tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-5'} h-14`}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1 transition ${
                  isActive ? 'text-emerald-700 font-bold' : 'text-slate-400 font-medium hover:text-slate-600'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {tab.badge && (
                    <span
                      className={`absolute -top-1 -right-2 px-1 min-w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                        typeof tab.badge === 'number'
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white text-[8px]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
