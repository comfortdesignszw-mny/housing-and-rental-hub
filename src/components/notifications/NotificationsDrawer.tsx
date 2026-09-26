import React, { useState, useRef, useEffect } from 'react';
import { NotificationItem } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import { db as firestoreDb } from '../../db/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  X,
  Bell,
  CheckCircle2,
  DollarSign,
  Sparkles,
  FileText,
  Wrench,
  Trash2,
  ArrowLeft,
  MessageSquare,
  Calendar,
  ExternalLink,
  MailCheck,
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
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [tabFilter, setTabFilter] = useState<'all' | 'unread' | 'messages'>('all');
  const selectedNotifRef = useRef<NotificationItem | null>(null);
  selectedNotifRef.current = selectedNotification;

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

  const unreadCount = notifications.filter(n => !n.read).length;
  const messagesCount = notifications.filter(n => n.type === 'message').length;

  const filteredNotifications = notifications.filter(item => {
    if (tabFilter === 'unread') return !item.read;
    if (tabFilter === 'messages') return item.type === 'message';
    return true;
  });

  if (!isOpen) return null;

  const markAllAsRead = async () => {
    if (!currentUser) return;
    const items = await db.notifications.where('userId').equals(currentUser.id).toArray();
    for (const item of items) {
      await db.notifications.update(item.id, { read: true });
      try {
        await updateDoc(doc(firestoreDb, 'notifications', item.id), { read: true });
      } catch (err) {
        // Silently handled
      }
    }
  };

  const clearAll = async () => {
    if (!currentUser) return;
    await db.notifications.where('userId').equals(currentUser.id).delete();
    setSelectedNotification(null);
  };

  const handleOpenDetail = (item: NotificationItem) => {
    setSelectedNotification(item);
  };

  const handleCloseDetail = async () => {
    const itemToMark = selectedNotifRef.current;
    if (itemToMark) {
      // 1. Mark as read in local Dexie database
      await db.notifications.update(itemToMark.id, { read: true });
      // 2. Persist read status to Firestore if user is authenticated
      try {
        if (currentUser) {
          await updateDoc(doc(firestoreDb, 'notifications', itemToMark.id), {
            read: true,
          });
        }
      } catch (err) {
        console.warn('Could not sync notification read status online:', err);
      }
      setSelectedNotification(null);
    }
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
      case 'message':
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getTypeLabel = (type: NotificationItem['type']) => {
    switch (type) {
      case 'rent_due':
        return 'Payment & Rent';
      case 'roommate_match':
        return 'Roommate Match';
      case 'lease_expiry':
        return 'Lease Notice';
      case 'maintenance_update':
        return 'Maintenance';
      case 'message':
        return 'In-App Message';
      default:
        return 'Rental Alert';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-2xs">
      <div className="bg-white w-full max-w-sm sm:max-w-md h-full overflow-y-auto p-4 sm:p-5 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 relative">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full animate-pulse ring-2 ring-white" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Notifications & Messages
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {unreadCount} unread • {notifications.length} total
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Tabs: All vs Unread vs Messages */}
          <div className="flex items-center gap-1 pt-2 pb-1 border-b border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setTabFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                tabFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('unread')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                tabFilter === 'unread'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {unreadCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              <span>Unread ({unreadCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('messages')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                tabFilter === 'messages'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Messages ({messagesCount})</span>
            </button>
          </div>

          {/* Quick Actions */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
              <button
                onClick={markAllAsRead}
                className="text-emerald-700 hover:text-emerald-800 hover:underline font-bold cursor-pointer flex items-center gap-1"
              >
                <MailCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
              <button
                onClick={clearAll}
                className="text-slate-400 hover:text-rose-600 flex items-center gap-1 font-medium transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear all
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="mt-2.5 divide-y divide-slate-100 space-y-1 overflow-y-auto flex-1 pr-1">
            {filteredNotifications.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-600 text-sm">
                  {tabFilter === 'unread'
                    ? 'No unread notifications'
                    : tabFilter === 'messages'
                    ? 'No message notifications'
                    : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  New rental applications, lease updates, messages & property views will appear here.
                </p>
              </div>
            ) : (
              filteredNotifications.map(item => {
                const isUnread = !item.read;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item)}
                    className={`py-3 px-3 rounded-2xl transition cursor-pointer flex gap-3 border ${
                      isUnread
                        ? 'bg-emerald-50/90 border-emerald-300 border-l-4 border-l-emerald-600 shadow-xs ring-1 ring-emerald-400/20 hover:bg-emerald-100/80'
                        : 'bg-white border-slate-100 hover:bg-slate-50 border-l-4 border-l-transparent opacity-80'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl bg-white border shadow-2xs shrink-0 self-start mt-0.5 ${
                        isUnread ? 'border-emerald-300 ring-2 ring-emerald-400/20' : 'border-slate-200'
                      }`}
                    >
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread && (
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 animate-pulse ring-2 ring-white" />
                          )}
                          <h4
                            className={`text-xs truncate ${
                              isUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-700'
                            }`}
                          >
                            {item.title}
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p
                        className={`text-xs line-clamp-2 leading-relaxed ${
                          isUnread ? 'text-slate-800 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between pt-0.5 text-[10px]">
                        <span className="text-slate-400 font-medium">
                          {getTypeLabel(item.type)}
                        </span>
                        {isUnread ? (
                          <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-2xs animate-pulse">
                            UNREAD
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-0.5 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-slate-400" /> Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="pt-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Close Notifications
          </button>
        </div>

        {/* Detailed Message Window Popup (Requirement 1) */}
        {selectedNotification && (
          <div
            onClick={handleCloseDetail}
            className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 cursor-default"
            >
              {/* Top Bar with Back and Close */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  title="Click back to close and mark as read"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {getTypeLabel(selectedNotification.type)}
                </span>
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  title="Close message window"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message Details */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 shrink-0">
                    {getIcon(selectedNotification.type)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {selectedNotification.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(selectedNotification.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(selectedNotification.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Content Bubble */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                  {selectedNotification.message}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                {selectedNotification.actionUrl && onSelectAction && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = selectedNotification.actionUrl;
                      handleCloseDetail();
                      onSelectAction(url);
                    }}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>View in Chat / Reply</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Back (Mark as Read)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
