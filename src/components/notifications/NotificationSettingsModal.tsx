import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Zap,
  LayoutTemplate,
  CheckCircle2,
  AlertCircle,
  Play,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Radio,
} from 'lucide-react';
import {
  notificationService,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../../services/notificationService';
import { NotificationSettings, NotificationSoundChoice } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: NotificationSettings) => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { currentUser, updateUserProfile, isGuest } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    return currentUser?.notificationSettings || notificationService.getSettings();
  });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    notificationService.getPermissionStatus()
  );
  const [testTriggered, setTestTriggered] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = currentUser?.notificationSettings || notificationService.getSettings();
      setSettings(current);
      setPermissionStatus(notificationService.getPermissionStatus());
      setSaveSuccess(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleRequestPush = async () => {
    const perm = await notificationService.requestPushPermission();
    setPermissionStatus(perm);
    if (perm === 'granted') {
      const updated = { ...settings, pushEnabled: true };
      setSettings(updated);
      notificationService.saveSettings(updated);
    }
  };

  const handleSoundToneChange = (choice: NotificationSoundChoice) => {
    const updated = { ...settings, soundChoice: choice };
    setSettings(updated);
    notificationService.saveSettings(updated);
    notificationService.playSound(choice);
  };

  const handleToggleSilentMode = () => {
    const nextSilent = !settings.silentMode;
    const updated: NotificationSettings = {
      ...settings,
      silentMode: nextSilent,
      soundEnabled: !nextSilent,
    };
    setSettings(updated);
  };

  const handleToggleWakeDevice = () => {
    const updated: NotificationSettings = {
      ...settings,
      wakeDeviceEnabled: !settings.wakeDeviceEnabled,
    };
    setSettings(updated);
  };

  const handleToggleTopBarTile = () => {
    const updated: NotificationSettings = {
      ...settings,
      topBarTileEnabled: !settings.topBarTileEnabled,
    };
    setSettings(updated);
  };

  const handleToggleVibrate = () => {
    const updated: NotificationSettings = {
      ...settings,
      vibrateEnabled: !settings.vibrateEnabled,
    };
    setSettings(updated);
  };

  const handleSave = async () => {
    notificationService.saveSettings(settings);

    if (!isGuest && currentUser && updateUserProfile) {
      try {
        await updateUserProfile({
          notificationSettings: settings,
        });
      } catch (err) {
        console.warn('Failed to sync notification settings to user document:', err);
      }
    }

    setSaveSuccess(true);
    if (onSaved) onSaved(settings);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleTestNotification = async () => {
    setTestTriggered(true);
    notificationService.saveSettings(settings);

    await notificationService.dispatchNotification({
      id: `test_${Date.now()}`,
      title: 'Comfort Housing Rental Alert',
      message: 'New verified 3-Bedroom cottage match in Avondale, Harare ($450/mo with borehole water & solar power).',
      type: 'property_match',
      actionUrl: 'listings',
      timestamp: Date.now(),
    });

    setTimeout(() => setTestTriggered(false), 2500);
  };

  const soundOptions: Array<{
    id: NotificationSoundChoice;
    name: string;
    description: string;
    icon: string;
  }> = [
    {
      id: 'chime',
      name: 'Emerald Chime',
      description: 'Warm, elegant 3-tone ascending chime (Default)',
      icon: '✨',
    },
    {
      id: 'marimba',
      name: 'Zimbabwe Marimba',
      description: 'Resonant wooden African marimba chime with warm harmonics',
      icon: '🪵',
    },
    {
      id: 'bell',
      name: 'Crystalline Alert Bell',
      description: 'Clear, high-visibility ringing bell with shimmer',
      icon: '🔔',
    },
    {
      id: 'echo',
      name: 'Double Echo Pulse',
      description: 'Fast dual chirp alert for high-urgency notifications',
      icon: '⚡',
    },
  ];

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Bell className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Notification Options & Alert Settings
              </h3>
              <p className="text-xs text-slate-300">
                Configure sounds, screen wake, silent mode, and top bar notification tile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close notification settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Master Notification Mode: Silent vs Sound */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
              1. Choose Notification Alert Mode
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSettings({ ...settings, silentMode: false, soundEnabled: true });
                }}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                  !settings.silentMode
                    ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white/50 text-slate-600 hover:bg-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    !settings.silentMode ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">Sound Mode</h4>
                  <p className="text-[10px] text-slate-500">Audible chimes on alerts</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettings({ ...settings, silentMode: true, soundEnabled: false });
                }}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                  settings.silentMode
                    ? 'border-rose-600 bg-white ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 bg-white/50 text-slate-600 hover:bg-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    settings.silentMode ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <VolumeX className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">Silent Mode</h4>
                  <p className="text-[10px] text-slate-500">Mutes audio & vibration</p>
                </div>
              </button>
            </div>
          </div>

          {/* Sound Tone Selector (Active if not in silent mode) */}
          {!settings.silentMode && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                  2. Notification Sound Chime (Plays even when phone is sleeping)
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Web Audio Synthesized
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {soundOptions.map(opt => {
                  const isSelected = settings.soundChoice === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSoundToneChange(opt.id)}
                      className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500 text-emerald-950 font-bold'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{opt.icon}</span>
                        <div>
                          <div className="text-xs font-bold">{opt.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal leading-tight">
                            {opt.description}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleSoundToneChange(opt.id);
                        }}
                        title={`Preview ${opt.name}`}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-emerald-700 cursor-pointer shadow-2xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feature Controls: Wake Device & Top Bar Notification Tile */}
          <div className="space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
              3. Device Behaviour & Notification Tile
            </span>

            {/* Wake Device Toggle */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>Wake Device on Alert</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                      Screen Wake Lock
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Illuminates the device screen and prevents auto-dimming while notification is displayed, waking sleeping phones when new rental matches or offers arrive.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={settings.wakeDeviceEnabled}
                  onChange={handleToggleWakeDevice}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Top Bar Notification Tile Toggle */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                  <LayoutTemplate className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>Notification Tile on Top Bar</span>
                    <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.2 rounded-full">
                      Top Bar Shade
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Drops down an interactive, high-contrast notification tile at the top of the device screen with alert badges, quick action buttons, and one-touch silent controls.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={settings.topBarTileEnabled}
                  onChange={handleToggleTopBarTile}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Haptic Vibration Toggle */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">
                    Haptic Hardware Vibration
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Dual-pulse haptic vibration to wake device when phone is in your pocket or resting on a table.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={settings.vibrateEnabled}
                  onChange={handleToggleVibrate}
                  disabled={settings.silentMode}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-50"></div>
              </label>
            </div>
          </div>

          {/* Browser / System Push Permission Status */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-extrabold text-slate-900 block">
                System / Browser Push Permission
              </span>
              <span className="text-[11px] text-slate-500">
                Status:{' '}
                <strong
                  className={
                    permissionStatus === 'granted'
                      ? 'text-emerald-700'
                      : permissionStatus === 'denied'
                      ? 'text-rose-700'
                      : 'text-amber-700'
                  }
                >
                  {permissionStatus.toUpperCase()}
                </strong>
              </span>
            </div>

            {permissionStatus !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPush}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Grant Push Permission
              </button>
            )}
          </div>

          {/* Interactive Test Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testTriggered}
              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>
                {testTriggered
                  ? 'Testing Notification (Playing Chime & Top Bar Tile)...'
                  : 'Test Live Notification (Sound + Wake + Top Bar Tile)'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setSettings(DEFAULT_NOTIFICATION_SETTINGS)}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer"
          >
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Notification Options</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
