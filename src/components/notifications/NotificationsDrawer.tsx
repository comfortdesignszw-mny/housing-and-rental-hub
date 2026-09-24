import React from 'react';
import { NotificationItem } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Bell,
  CheckCircle2,
  DollarSign,
  Sparkles,
  FileText,
  Wrench,
  Trash2,
} from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (url?: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const { currentUser } = useAuth();

  const notifications: NotificationItem[] =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.notifications
          .where('userId')
          .equals(currentUser.id)
          .reverse()
          .sortBy('timestamp');
      },
      [currentUser?.id],
      []
    ) || [];

  if (!isOpen) return null;

  const markAllAsRead = async () => {
    if (!currentUser) return;
    const items = await db.notifications.where('userId').equals(currentUser.id).toArray();
    for (const item of items) {
      await db.notifications.update(item.id, { read: true });
    }
  };

  const clearAll = async () => {
    if (!currentUser) return;
    await db.notifications.where('userId').equals(currentUser.id).delete();
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'rent_due':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'roommate_match':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case 'lease_expiry':
        return <FileText className="w-4 h-4 text-rose-600" />;
      case 'maintenance_update':
        return <Wrench className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-2xs">
      <div className="bg-white w-full max-w-sm sm:max-w-md h-full overflow-y-auto p-5 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-700" />
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Notifications ({notifications.length})
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
              <button
                onClick={markAllAsRead}
                className="text-emerald-700 hover:underline font-semibold"
              >
                Mark all as read
              </button>
              <button
                onClick={clearAll}
                className="text-slate-400 hover:text-rose-600 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            </div>
          )}

          <div className="mt-3 divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-1">
                <Bell className="w-8 h-8 text-slate-200 mx-auto" />
                <p>No new notifications</p>
                <p className="text-[11px] text-slate-400">
                  Rent reminders, new Zimbabwe property alerts & roommate matches will appear here.
                </p>
              </div>
            ) : (
              notifications.map(item => (
                <div
                  key={item.id}
                  className={`py-3.5 px-2 rounded-xl transition flex gap-3 ${
                    !item.read ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 self-start">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
