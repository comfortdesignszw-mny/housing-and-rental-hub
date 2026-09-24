import React, { useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { offlineSyncService } from '../../services/offlineSync';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const pendingQueue = useLiveQuery(
    () => db.offlineQueue.where('status').equals('pending').toArray(),
    []
  );

  const pendingCount = pendingQueue?.length || 0;

  const handleManualSync = async () => {
    if (!isOnline) return;
    setSyncing(true);
    await offlineSyncService.processQueue();
    setSyncing(false);
    setJustSynced(true);
    setTimeout(() => setJustSynced(false), 3000);
  };

  // If online and nothing queued, keep screen clean
  if (isOnline && pendingCount === 0 && !justSynced) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-slate-950 px-3 py-1.5 text-xs font-medium flex items-center justify-between shadow-xs sticky top-0 z-40">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-slate-900 shrink-0" />
            <span>
              <strong>Offline Mode</strong> — All listings, tenants & searches work offline.
            </span>
          </>
        ) : justSynced ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-950 shrink-0" />
            <span>All local changes synced successfully!</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
            <span>{pendingCount} offline update{pendingCount > 1 ? 's' : ''} queued locally.</span>
          </>
        )}
      </div>

      {pendingCount > 0 && isOnline && (
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center gap-1 rounded bg-slate-900 text-white px-2 py-0.5 text-[11px] font-semibold hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      )}
    </div>
  );
};
