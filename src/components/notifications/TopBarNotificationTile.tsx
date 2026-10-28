import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  X,
  ExternalLink,
  Zap,
  Home,
  MessageSquare,
  FileText,
  DollarSign,
  AlertTriangle,
  Sparkles,
  Star,
  Heart,
} from 'lucide-react';
import { notificationService, TopBarTileData } from '../../services/notificationService';

interface TopBarNotificationTileProps {
  onSelectAction?: (url: string) => void;
  onOpenSettings?: () => void;
}

export const TopBarNotificationTile: React.FC<TopBarNotificationTileProps> = ({
  onSelectAction,
  onOpenSettings,
}) => {
  const [activeTile, setActiveTile] = useState<TopBarTileData | null>(null);
  const [settings, setSettings] = useState(notificationService.getSettings());
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const unsub = notificationService.subscribeTopBarTile(tile => {
      setActiveTile(tile);
      setSettings(notificationService.getSettings());
      setProgress(100);
    });
    return unsub;
  }, []);

  // Countdown timer bar for tile auto-dismiss
  useEffect(() => {
    if (!activeTile) return;
    const interval = 100;
    const totalTime = 8000;
    const step = (interval / totalTime) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return Math.max(0, prev - step);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeTile]);

  if (!activeTile) return null;

  const handleDismiss = () => {
    notificationService.dismissTopBarTile();
  };

  const handleActionClick = () => {
    const url = activeTile.actionUrl;
    notificationService.dismissTopBarTile();
    if (url && onSelectAction) {
      onSelectAction(url);
    }
  };

  const handleToggleSilent = () => {
    const updated = { ...settings, silentMode: !settings.silentMode };
    notificationService.saveSettings(updated);
    setSettings(updated);
  };

  const getCategoryBadge = () => {
    switch (activeTile.type) {
      case 'property_rating':
        return { label: 'Property Rating ★', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: Star };
      case 'property_favorite':
        return { label: 'Listing Saved ❤️', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: Heart };
      case 'property_offer':
        return { label: 'Property Owner Offer', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40', icon: Home };
      case 'message':
        return { label: 'Direct Message', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: MessageSquare };
      case 'rent_due':
        return { label: 'Rent Due Alert', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: DollarSign };
      case 'application_update':
        return { label: 'Application Status', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: FileText };
      default:
        return { label: 'Comfort Hub Alert', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: Bell };
    }
  };

  const badge = getCategoryBadge();
  const IconComponent = badge.icon;

  return (
    <div className="fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 w-[94%] max-w-lg z-90 animate-in slide-in-from-top-6 duration-200">
      <div className="bg-slate-900/98 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-emerald-500/40 overflow-hidden ring-1 ring-black/40">
        {/* Header strip */}
        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <IconComponent className="w-3.5 h-3.5" />
            </div>
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-400">
              Top Bar Notification Tile
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Silent / Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleSilent}
              title={settings.silentMode ? 'Currently Silent (Tap for Sound)' : 'Sound Enabled (Tap for Silent)'}
              className={`p-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                settings.silentMode
                  ? 'bg-rose-900/50 text-rose-300 hover:bg-rose-900/80 border border-rose-700/50'
                  : 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-700/50'
              }`}
            >
              {settings.silentMode ? (
                <>
                  <VolumeX className="w-3 h-3 text-rose-400" />
                  <span className="text-[10px] hidden sm:inline">Silent</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] hidden sm:inline">Sound</span>
                </>
              )}
            </button>

            {/* Wake device indicator */}
            {settings.wakeDeviceEnabled && (
              <span
                className="p-1 rounded-lg bg-amber-900/40 text-amber-300 border border-amber-700/40"
                title="Wake Device Active on this alert"
              >
                <Zap className="w-3 h-3 text-amber-400" />
              </span>
            )}

            {/* Dismiss X */}
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Dismiss notification tile"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tile Content Body */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 flex-1 min-w-0">
              <h4 className="font-extrabold text-sm text-white tracking-tight truncate">
                {activeTile.title}
              </h4>
              <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                {activeTile.message}
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(activeTile.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            <div className="flex items-center gap-2">
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    handleDismiss();
                    onOpenSettings();
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2 cursor-pointer"
                >
                  Notification Options
                </button>
              )}

              {activeTile.actionUrl && onSelectAction && (
                <button
                  type="button"
                  onClick={handleActionClick}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Now</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar line for auto-dismiss timer */}
        <div className="h-0.5 bg-slate-800 w-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
