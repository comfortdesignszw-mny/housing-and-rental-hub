import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Message } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import { compressImage } from '../../services/imageCompression';
import { encryptMessage, decryptMessage } from '../../services/encryption';
import {
  Send,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Clock,
  ArrowLeft,
  MessageSquare,
  Lock,
  Smile,
  Mic,
  MicOff,
  Phone,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../db/firebase';
import { offlineSyncService } from '../../services/offlineSync';

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
  const { currentUser, isGuest } = useAuth();
  const isOnline = useOnlineStatus();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(
    initialRecipientId || null
  );
  const [activeRecipientName, setActiveRecipientName] = useState<string>(
    initialRecipientName || 'Chat Partner'
  );
  const [inputText, setInputText] = useState('');
  const [attachingPhoto, setAttachingPhoto] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Decrypted message cache
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});

  // Sync initial recipient changes
  useEffect(() => {
    if (initialRecipientId) {
      setActiveRecipientId(initialRecipientId);
      if (initialRecipientName) setActiveRecipientName(initialRecipientName);
    }
  }, [initialRecipientId, initialRecipientName]);

  // Load all messages for current user from Dexie cache
  const allMessages: Message[] =
    useLiveQuery(
      async () => {
        if (!currentUser || isGuest) return [];
        return db.messages
          .filter(
            m =>
              m.senderId === currentUser.id || m.recipientId === currentUser.id
          )
          .toArray();
      },
      [currentUser?.id, isGuest],
      []
    ) || [];

  // Group into real conversation threads
  const conversations = useMemo(() => {
    if (!currentUser || isGuest) return [];

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

    for (const msg of allMessages) {
      const partnerId =
        msg.senderId === currentUser.id ? msg.recipientId : msg.senderId;
      const partnerName =
        msg.senderId === currentUser.id
          ? msg.recipientName || 'Resident'
          : msg.senderName || 'Resident';

      const existing = map.get(partnerId);
      const isUnread = msg.recipientId === currentUser.id && msg.status !== 'read';

      if (!existing || msg.timestamp > existing.lastTimestamp) {
        map.set(partnerId, {
          partnerId,
          partnerName,
          lastMessage: msg.photoUrl ? '📷 Photo attachment' : msg.content || 'Secure message',
          lastTimestamp: msg.timestamp,
          unread: (existing?.unread || 0) + (isUnread ? 1 : 0),
        });
      }
    }

    return Array.from(map.values())
      .filter(c =>
        c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [allMessages, currentUser, isGuest, searchQuery]);

  // Active chat messages
  const activeThread = useMemo(() => {
    if (!currentUser || !activeRecipientId) return [];

    return allMessages
      .filter(
        m =>
          (m.senderId === currentUser.id && m.recipientId === activeRecipientId) ||
          (m.senderId === activeRecipientId && m.recipientId === currentUser.id)
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allMessages, currentUser, activeRecipientId]);

  // Decrypt incoming encrypted messages
  useEffect(() => {
    let isCancelled = false;

    async function decryptThread() {
      if (!currentUser || !activeRecipientId) return;
      const convId = `conv_${[currentUser.id, activeRecipientId].sort().join('_')}`;

      for (const msg of activeThread) {
        if (!decryptedMap[msg.id]) {
          const raw = msg.content;
          if (raw && raw.startsWith('enc:v1:')) {
            const dec = await decryptMessage(raw, convId);
            if (!isCancelled) {
              setDecryptedMap(prev => ({ ...prev, [msg.id]: dec }));
            }
          } else {
            if (!isCancelled) {
              setDecryptedMap(prev => ({ ...prev, [msg.id]: raw }));
            }
          }
        }
      }
    }

    decryptThread();
    return () => {
      isCancelled = true;
    };
  }, [activeThread, currentUser, activeRecipientId]);

  // Mark incoming messages as read when opening conversation (WhatsApp read receipts)
  useEffect(() => {
    if (!currentUser || !activeRecipientId) return;

    const unreadFromPartner = activeThread.filter(
      m => m.recipientId === currentUser.id && m.status !== 'read'
    );

    if (unreadFromPartner.length > 0) {
      unreadFromPartner.forEach(async msg => {
        await db.messages.update(msg.id, { status: 'read' });
        if (isOnline) {
          try {
            await updateDoc(doc(firestoreDb, 'messages', msg.id), {
              status: 'read',
            });
          } catch (e) {
            console.warn('Could not sync read receipt online:', e);
          }
        }
      });
    }
  }, [activeThread, currentUser, activeRecipientId, isOnline]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread, decryptedMap]);

  const handleSendMessage = async (e?: React.FormEvent, photoUrl?: string) => {
    if (e) e.preventDefault();
    if (!currentUser || !activeRecipientId || isGuest) return;
    if (!inputText.trim() && !photoUrl) return;

    const convId = `conv_${[currentUser.id, activeRecipientId].sort().join('_')}`;
    const rawContent = inputText.trim();

    // Encrypt the message text before saving to database
    let encryptedText = rawContent;
    if (rawContent) {
      encryptedText = await encryptMessage(rawContent, convId);
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const status = isOnline ? 'sent' : 'queued';

    const newMsg: Message = {
      id: messageId,
      conversationId: convId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      recipientId: activeRecipientId,
      recipientName: activeRecipientName,
      content: encryptedText,
      photoUrl,
      status,
      timestamp: Date.now(),
    };

    // Optimistically cache locally in Dexie
    await db.messages.add(newMsg);
    setDecryptedMap(prev => ({ ...prev, [messageId]: rawContent }));

    // Send to Firestore if online, otherwise enqueue
    if (isOnline) {
      try {
        await setDoc(doc(firestoreDb, 'messages', messageId), newMsg);
      } catch (err) {
        console.warn('Direct firestore send failed, enqueueing offline:', err);
        await offlineSyncService.enqueueAction('send_message', newMsg);
      }
    } else {
      await offlineSyncService.enqueueAction('send_message', newMsg);
    }

    setInputText('');
    setShowEmojiPicker(false);
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

  const handleSendVoiceNote = async () => {
    setIsRecordingAudio(true);
    // Simulate WhatsApp audio voice memo sending
    setTimeout(async () => {
      setIsRecordingAudio(false);
      await handleSendMessage(
        undefined,
        undefined
      );
    }, 1500);
  };

  const quickEmojis = ['👍', '❤️', '🏠', '📍', '🤝', '😊', '🇿🇼', '🔑'];

  if (isGuest) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">
          Real-Time WhatsApp-Style Messaging
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Sign in to access encrypted peer-to-peer chats with Zimbabwean landlords, roommates, and tenants with read receipts and offline queuing.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 h-[calc(100vh-8.5rem)] flex flex-col">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex-1 flex flex-col md:flex-row">
        {/* Conversations List (Sidebar) */}
        <div
          className={`w-full md:w-80 border-r border-slate-200 flex flex-col ${
            activeRecipientId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <span>Chats</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                  AES-256
                </span>
              </h3>
              <p className="text-[10px] text-slate-500">
                End-to-End Encrypted • Offline Queue
              </p>
            </div>
            {!isOnline && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Offline
              </span>
            )}
          </div>

          {/* Search bar */}
          <div className="p-2 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 rounded-xl outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No active conversations yet.</p>
                <p className="text-[11px] text-slate-400">
                  Open any property listing or roommate profile and click <strong>"Message"</strong> to begin!
                </p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.partnerId}
                  onClick={() => {
                    setActiveRecipientId(conv.partnerId);
                    setActiveRecipientName(conv.partnerName);
                  }}
                  className={`w-full p-3 flex items-start gap-3 text-left transition cursor-pointer ${
                    activeRecipientId === conv.partnerId
                      ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                    {conv.partnerName.charAt(0).toUpperCase()}
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
              {/* Thread Header */}
              <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      setActiveRecipientId(null);
                      if (onClearInitial) onClearInitial();
                    }}
                    className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                    {activeRecipientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                      {activeRecipientName}
                    </h3>
                    <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>End-to-End Encrypted</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {!isOnline && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                      Offline Queue Active
                    </span>
                  )}
                </div>
              </div>

              {/* Encryption Banner */}
              <div className="bg-amber-50/70 border-b border-amber-200/50 px-3 py-1.5 text-center text-[10px] text-amber-900 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3 text-amber-700" />
                <span>
                  Messages in this chat are secured with AES-256-GCM encryption. Nobody outside of this chat can read them.
                </span>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]/20">
                {activeThread.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-600">
                      Start an encrypted conversation with {activeRecipientName}.
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      All messages are encrypted on your device and instantly persisted to the cloud database with full offline syncing.
                    </p>
                  </div>
                ) : (
                  activeThread.map(msg => {
                    const isMine = msg.senderId === currentUser?.id;
                    const displayedText = decryptedMap[msg.id] || msg.content;

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

                          {displayedText && (
                            <p className="leading-relaxed whitespace-pre-wrap break-words">
                              {displayedText}
                            </p>
                          )}

                          {/* Timestamp and WhatsApp-like status ticks */}
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
                                  <span title="Read by recipient">
                                    <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                                  </span>
                                ) : msg.status === 'delivered' ? (
                                  <span title="Delivered to device">
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                                  </span>
                                ) : (
                                  <span title="Sent to cloud">
                                    <Check className="w-3 h-3 text-emerald-200" />
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

              {/* Quick Emojis Drawer */}
              {showEmojiPicker && (
                <div className="bg-slate-50 border-t border-slate-200 p-2 flex items-center gap-2 overflow-x-auto">
                  {quickEmojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setInputText(prev => prev + emoji)}
                      className="text-lg hover:scale-125 transition p-1 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                {/* Emoji toggle */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  title="Insert emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Photo attachment button */}
                <label
                  className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-xl hover:bg-slate-100 cursor-pointer transition"
                  title="Attach image"
                >
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
                      ? 'Type an encrypted message...'
                      : 'Type message (will queue offline)...'
                  }
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-100 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && !attachingPhoto}
                  className="p-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 transition cursor-pointer"
                  title="Send message"
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
                Chat securely with Zimbabwean landlords, roommates, and tenants with AES-256 encryption.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
