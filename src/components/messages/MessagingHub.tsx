import React, { useState, useEffect, useRef } from 'react';
import { Message, Conversation } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import { offlineSyncService } from '../../services/offlineSync';
import { compressImage } from '../../services/imageCompression';
import {
  Send,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Clock,
  ArrowLeft,
  User,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface MessagingHubProps {
  initialRecipientId?: string | null;
  initialRecipientName?: string | null;
  initialPropertyId?: string | null;
  onClearInitial?: () => void;
}

export const MessagingHub: React.FC<MessagingHubProps> = ({
  initialRecipientId,
  initialRecipientName,
  initialPropertyId,
  onClearInitial,
}) => {
  const { currentUser } = useAuth();
  const isOnline = useOnlineStatus();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(
    initialRecipientId || null
  );
  const [activeRecipientName, setActiveRecipientName] = useState<string>(
    initialRecipientName || 'Landlord / Roommate'
  );
  const [inputText, setInputText] = useState('');
  const [attachingPhoto, setAttachingPhoto] = useState(false);

  // If initial prop changes, update active
  useEffect(() => {
    if (initialRecipientId) {
      setActiveRecipientId(initialRecipientId);
      if (initialRecipientName) setActiveRecipientName(initialRecipientName);
    }
  }, [initialRecipientId, initialRecipientName]);

  // Load all messages involving currentUser
  const allMessages: Message[] =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.messages
          .filter(
            m =>
              m.senderId === currentUser.id || m.recipientId === currentUser.id
          )
          .toArray();
      },
      [currentUser?.id],
      []
    ) || [];

  // Group into conversations
  const conversations = React.useMemo(() => {
    if (!currentUser) return [];

    const map = new Map<
      string,
      {
        partnerId: string;
        partnerName: string;
        lastMessage: string;
        lastTimestamp: number;
        unread: number;
      }
    >();

    // Seed default conversations if empty
    if (allMessages.length === 0) {
      return [
        {
          partnerId: 'user_landlord_1',
          partnerName: 'Tendai Mutasa (Landlord)',
          lastMessage: 'Good day! The Avondale cottage is available for viewing anytime.',
          lastTimestamp: Date.now() - 3600000,
          unread: 1,
        },
        {
          partnerId: 'roommate_1',
          partnerName: 'Ruvimbo Chitepo (Roommate Match)',
          lastMessage: 'Hi! I saw we had a 94% roommate match on Comfort Hub.',
          lastTimestamp: Date.now() - 7200000,
          unread: 0,
        },
      ];
    }

    for (const msg of allMessages) {
      const partnerId =
        msg.senderId === currentUser.id ? msg.recipientId : msg.senderId;
      const partnerName =
        msg.senderId === currentUser.id ? msg.recipientName : msg.senderName;

      const existing = map.get(partnerId);
      const isUnread = msg.recipientId === currentUser.id && msg.status !== 'read';

      if (!existing || msg.timestamp > existing.lastTimestamp) {
        map.set(partnerId, {
          partnerId,
          partnerName,
          lastMessage: msg.content || 'Photo attachment',
          lastTimestamp: msg.timestamp,
          unread: (existing?.unread || 0) + (isUnread ? 1 : 0),
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.lastTimestamp - a.lastTimestamp
    );
  }, [allMessages, currentUser]);

  // Active chat messages
  const activeThread = React.useMemo(() => {
    if (!currentUser || !activeRecipientId) return [];

    return allMessages
      .filter(
        m =>
          (m.senderId === currentUser.id && m.recipientId === activeRecipientId) ||
          (m.senderId === activeRecipientId && m.recipientId === currentUser.id)
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allMessages, currentUser, activeRecipientId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread]);

  const handleSendMessage = async (e?: React.FormEvent, photoUrl?: string) => {
    if (e) e.preventDefault();
    if (!currentUser || !activeRecipientId) return;
    if (!inputText.trim() && !photoUrl) return;

    const messageId = `msg_${Date.now()}`;
    const status = isOnline ? 'sent' : 'queued';

    const newMsg: Message = {
      id: messageId,
      conversationId: `conv_${[currentUser.id, activeRecipientId].sort().join('_')}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      recipientId: activeRecipientId,
      recipientName: activeRecipientName,
      content: inputText.trim(),
      photoUrl,
      status,
      timestamp: Date.now(),
    };

    // Save to IndexedDB instantly
    await db.messages.add(newMsg);

    // If offline, enqueue
    if (!isOnline) {
      await offlineSyncService.enqueueAction('send_message', { messageId });
    }

    setInputText('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachingPhoto(true);
    try {
      const compressed = await compressImage(file, 800, 600, 0.7);
      await handleSendMessage(undefined, compressed.dataUrl);
    } catch (err) {
      console.error('Failed to attach photo', err);
    } finally {
      setAttachingPhoto(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 h-[calc(100vh-8.5rem)] flex flex-col">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex-1 flex flex-col md:flex-row">
        {/* Conversations List (Sidebar on desktop, full view when no active thread on mobile) */}
        <div
          className={`w-full md:w-80 border-r border-slate-200 flex flex-col ${
            activeRecipientId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Messages</h3>
              <p className="text-[10px] text-slate-500">
                Offline queue supported • Auto-syncs
              </p>
            </div>
            {!isOnline && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Queueing Offline
              </span>
            )}
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No conversations yet. Message a landlord or roommate to begin.
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.partnerId}
                  onClick={() => {
                    setActiveRecipientId(conv.partnerId);
                    setActiveRecipientName(conv.partnerName);
                  }}
                  className={`w-full p-3.5 flex items-start gap-3 text-left transition ${
                    activeRecipientId === conv.partnerId
                      ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                    {conv.partnerName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs truncate">
                        {conv.partnerName}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {new Date(conv.lastTimestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Active Chat Thread Panel */}
        <div
          className={`flex-1 flex flex-col ${
            !activeRecipientId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeRecipientId ? (
            <>
              {/* Chat Thread Header */}
              <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      setActiveRecipientId(null);
                      if (onClearInitial) onClearInitial();
                    }}
                    className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-800"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                    {activeRecipientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                      {activeRecipientName}
                    </h3>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      Direct Zimbabwe Channel • Instant
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  {!isOnline && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                      Offline Mode (Messages queued)
                    </span>
                  )}
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {activeThread.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>Start a conversation with {activeRecipientName}.</p>
                    <p className="text-[11px] text-slate-400">
                      Your messages are saved instantly and will sync even with intermittent connection.
                    </p>
                  </div>
                ) : (
                  activeThread.map(msg => {
                    const isMine = msg.senderId === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-2xs text-xs space-y-1 ${
                            isMine
                              ? 'bg-emerald-700 text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                          }`}
                        >
                          {msg.photoUrl && (
                            <img
                              src={msg.photoUrl}
                              alt="Attached photo"
                              className="rounded-lg max-h-48 object-cover w-full mb-1"
                            />
                          )}
                          {msg.content && <p className="leading-relaxed">{msg.content}</p>}

                          <div
                            className={`flex items-center justify-end gap-1 text-[9px] pt-0.5 ${
                              isMine ? 'text-emerald-200' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            {isMine && (
                              <span>
                                {msg.status === 'queued' ? (
                                  <span title="Queued offline">
                                    <Clock className="w-2.5 h-2.5 text-amber-300" />
                                  </span>
                                ) : msg.status === 'read' ? (
                                  <span title="Read">
                                    <CheckCheck className="w-3 h-3 text-cyan-200" />
                                  </span>
                                ) : (
                                  <span title="Sent">
                                    <Check className="w-3 h-3" />
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                {/* Photo attachment button */}
                <label className="p-2 text-slate-500 hover:text-emerald-700 rounded-xl hover:bg-slate-100 cursor-pointer transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={attachingPhoto}
                    className="hidden"
                  />
                  <ImageIcon className="w-5 h-5" />
                </label>

                <input
                  type="text"
                  placeholder={
                    isOnline
                      ? 'Type your message...'
                      : 'Type message (will queue offline)...'
                  }
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-100 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && !attachingPhoto}
                  className="p-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                Select a conversation
              </p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Chat securely with Zimbabwean landlords, roommates, and property managers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
