import { NotificationItem, NotificationSettings, NotificationSoundChoice } from '../types';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  soundEnabled: true,
  soundChoice: 'chime',
  wakeDeviceEnabled: true,
  topBarTileEnabled: true,
  vibrateEnabled: true,
  silentMode: false,
};

const STORAGE_KEY = 'comfort_notification_settings_v1';

export interface TopBarTileData {
  id: string;
  title: string;
  message: string;
  type?: NotificationItem['type'] | string;
  actionUrl?: string;
  timestamp: number;
}

type TileListener = (tile: TopBarTileData | null) => void;

class NotificationEngine {
  private audioCtx: AudioContext | null = null;
  private audioUnlocked = false;
  private currentWakeLock: any = null;
  private wakeLockTimeout: any = null;
  private tileListeners: Set<TileListener> = new Set();
  private activeTile: TopBarTileData | null = null;
  private tileDismissTimeout: any = null;

  constructor() {
    this.setupAudioUnlockListeners();
  }

  /**
   * Pre-warm AudioContext on first user interaction so sounds can play freely
   * even when phone is sleeping or app is in background idle.
   */
  private setupAudioUnlockListeners() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!this.audioCtx) {
            this.audioCtx = new AudioContextClass();
          }
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }
          this.audioUnlocked = true;
        }
      } catch (e) {
        console.warn('Audio unlock warning:', e);
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('click', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('Failed to get AudioContext:', e);
      return null;
    }
  }

  /**
   * Loads current notification preferences from local storage or returns defaults.
   */
  public getSettings(): NotificationSettings {
    if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse stored notification settings:', e);
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  /**
   * Saves notification preferences to local storage.
   */
  public saveSettings(settings: NotificationSettings): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to persist notification settings:', e);
    }
  }

  /**
   * Synthesize real, high-fidelity notification audio tones using the Web Audio API.
   * Works offline with zero network latency and no external assets required.
   */
  public playSound(choice: NotificationSoundChoice = 'chime'): void {
    const settings = this.getSettings();
    if (settings.silentMode || choice === 'none') {
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) {
      this.playFallbackBeep();
      return;
    }

    try {
      const now = ctx.currentTime;

      if (choice === 'chime') {
        // 3-Tone Ascending Emerald Chime (C5, E5, G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);

          gain.gain.setValueAtTime(0.001, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.09 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.46);
        });
      } else if (choice === 'marimba') {
        // Zimbabwean Marimba Wood Chime with dual harmonics
        const frequencies = [440, 554.37, 659.25, 880];
        frequencies.forEach((freq, idx) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'triangle';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(freq, now + idx * 0.07);
          osc2.frequency.setValueAtTime(freq * 2.02, now + idx * 0.07);

          gain.gain.setValueAtTime(0.001, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.35, now + idx * 0.07 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now + idx * 0.07);
          osc2.start(now + idx * 0.07);
          osc1.stop(now + idx * 0.07 + 0.36);
          osc2.stop(now + idx * 0.07 + 0.36);
        });
      } else if (choice === 'bell') {
        // Crystalline Alert Bell with shimmer ring
        const fundamental = 880; // A5
        const shimmer = 1760;

        const osc = ctx.createOscillator();
        const shimOsc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        shimOsc.type = 'sine';
        osc.frequency.setValueAtTime(fundamental, now);
        shimOsc.frequency.setValueAtTime(shimmer, now);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        shimOsc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        shimOsc.start(now);
        osc.stop(now + 0.95);
        shimOsc.stop(now + 0.95);
      } else if (choice === 'echo') {
        // High-clarity double chirp alert
        [880, 1174.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gain.gain.setValueAtTime(0.001, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.2);
        });
      }
    } catch (err) {
      console.warn('Audio playback error:', err);
      this.playFallbackBeep();
    }
  }

  /**
   * Fallback beep using minimal Web Audio oscillator
   */
  private playFallbackBeep() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 600;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore fallback failures
    }
  }

  /**
   * Wake the device using Screen Wake Lock API and haptic vibration.
   * Illuminates device screen and triggers dual pulse motor to wake sleeping hardware.
   */
  public async wakeDevice(durationMs = 15000): Promise<boolean> {
    const settings = this.getSettings();
    if (!settings.wakeDeviceEnabled) return false;

    let lockSuccess = false;

    // 1. Request Screen Wake Lock API
    if ('wakeLock' in navigator) {
      try {
        if (this.currentWakeLock) {
          try {
            await this.currentWakeLock.release();
          } catch {}
          this.currentWakeLock = null;
        }

        const lock = await (navigator as any).wakeLock.request('screen');
        this.currentWakeLock = lock;
        lockSuccess = true;

        if (this.wakeLockTimeout) {
          clearTimeout(this.wakeLockTimeout);
        }
        this.wakeLockTimeout = setTimeout(async () => {
          try {
            if (this.currentWakeLock) {
              await this.currentWakeLock.release();
              this.currentWakeLock = null;
            }
          } catch {}
        }, durationMs);
      } catch (err) {
        // Can fail if tab is not active or battery saver is active
        console.debug('Wake lock request notice:', err);
      }
    }

    // 2. Hardware vibration to wake phone in pocket or on nightstand
    if (settings.vibrateEnabled && !settings.silentMode && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 450]);
      } catch {}
    }

    return lockSuccess;
  }

  /**
   * Request push notification permission from browser/OS
   */
  public async requestPushPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      const current = this.getSettings();
      this.saveSettings({ ...current, pushEnabled: permission === 'granted' });
      return permission;
    } catch (err) {
      console.warn('Push permission request error:', err);
      return 'denied';
    }
  }

  public getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Subscribe to in-app Top Bar Notification Tile updates.
   */
  public subscribeTopBarTile(listener: TileListener): () => void {
    this.tileListeners.add(listener);
    if (this.activeTile) {
      listener(this.activeTile);
    }
    return () => {
      this.tileListeners.delete(listener);
    };
  }

  public getActiveTopBarTile(): TopBarTileData | null {
    return this.activeTile;
  }

  public dismissTopBarTile(): void {
    this.activeTile = null;
    if (this.tileDismissTimeout) {
      clearTimeout(this.tileDismissTimeout);
      this.tileDismissTimeout = null;
    }
    this.tileListeners.forEach(listener => listener(null));
  }

  public triggerTopBarTile(tile: TopBarTileData, autoDismissMs = 8000): void {
    const settings = this.getSettings();
    if (!settings.topBarTileEnabled) return;

    this.activeTile = tile;
    this.tileListeners.forEach(listener => listener(tile));

    if (this.tileDismissTimeout) {
      clearTimeout(this.tileDismissTimeout);
    }
    if (autoDismissMs > 0) {
      this.tileDismissTimeout = setTimeout(() => {
        this.dismissTopBarTile();
      }, autoDismissMs);
    }
  }

  /**
   * Dispatch a notification across all enabled channels:
   * 1. Audio Sound (even when phone is sleeping/idle)
   * 2. Device Wake (Screen Wake Lock + haptic vibration)
   * 3. In-App Top Bar Notification Tile
   * 4. System / OS Push Notification via Service Worker (with badge tile on Android top bar)
   */
  public async dispatchNotification(item: {
    id?: string;
    title: string;
    message: string;
    type?: NotificationItem['type'] | string;
    actionUrl?: string;
    timestamp?: number;
  }): Promise<void> {
    const settings = this.getSettings();
    const notifId = item.id || `notif_${Date.now()}`;
    const timestamp = item.timestamp || Date.now();

    // 1. Play audible sound if not in silent mode
    if (!settings.silentMode && settings.soundEnabled) {
      this.playSound(settings.soundChoice);
    }

    // 2. Wake device screen & trigger vibration
    if (settings.wakeDeviceEnabled) {
      this.wakeDevice(15000);
    }

    // 3. Show In-App Top Bar Notification Tile
    if (settings.topBarTileEnabled) {
      this.triggerTopBarTile(
        {
          id: notifId,
          title: item.title,
          message: item.message,
          type: item.type,
          actionUrl: item.actionUrl,
          timestamp,
        },
        8000
      );
    }

    // 4. Update Device / PWA App Badge in top status bar
    try {
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(1);
      }
    } catch {}

    // 5. System / Browser Push Notification
    if (
      settings.pushEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        const notifOptions: NotificationOptions & { renotify?: boolean } = {
          body: item.message,
          icon: '/pwa-192x192.png',
          // Badge displays in the Android status bar / top notification tile area
          badge: '/pwa-192x192.png',
          tag: notifId,
          renotify: true,
          silent: settings.silentMode,
          requireInteraction: settings.wakeDeviceEnabled,
          data: {
            actionUrl: item.actionUrl || '/',
            id: notifId,
          },
        };

        if (settings.vibrateEnabled && !settings.silentMode) {
          (notifOptions as any).vibrate = [300, 150, 300, 150, 450];
        }

        // Try Service Worker registration first for native Android background wake
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(item.title, notifOptions);
            return;
          }
        }

        // Fallback to window Notification constructor
        const n = new Notification(item.title, notifOptions);
        n.onclick = () => {
          window.focus();
          n.close();
          if (item.actionUrl) {
            window.location.hash = item.actionUrl;
          }
        };
      } catch (err) {
        console.warn('System push notification dispatch error:', err);
      }
    }
  }

  /**
   * Clear app badge from device status bar
   */
  public async clearBadge(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
      }
    } catch {}
  }
}

export const notificationService = new NotificationEngine();
