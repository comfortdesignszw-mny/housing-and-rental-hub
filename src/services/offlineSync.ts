import { db } from '../db/db';
import { OfflineQueueItem } from '../types';

export class OfflineSyncService {
  private isSyncing = false;

  /**
   * Enqueues an offline action into IndexedDB
   */
  async enqueueAction(
    actionType: OfflineQueueItem['actionType'],
    payload: any
  ): Promise<string> {
    const queueItem: OfflineQueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actionType,
      payload,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
    };

    await db.offlineQueue.add(queueItem);
    return queueItem.id;
  }

  /**
   * Process all pending offline queue items
   */
  async processQueue(): Promise<{ processed: number; errors: number }> {
    if (this.isSyncing) return { processed: 0, errors: 0 };
    this.isSyncing = true;

    let processed = 0;
    let errors = 0;

    try {
      const pendingItems = await db.offlineQueue
        .where('status')
        .equals('pending')
        .toArray();

      for (const item of pendingItems) {
        try {
          await db.offlineQueue.update(item.id, { status: 'syncing' });

          // Process action based on type
          if (item.actionType === 'send_message') {
            // Update message status from 'queued' to 'sent'
            if (item.payload.messageId) {
              await db.messages.update(item.payload.messageId, { status: 'sent' });
            }
          }

          // Mark item as synced or remove it
          await db.offlineQueue.update(item.id, { status: 'synced' });
          processed++;
        } catch (err: any) {
          console.error('Failed to sync queue item:', item.id, err);
          errors++;
          await db.offlineQueue.update(item.id, {
            status: 'failed',
            retryCount: item.retryCount + 1,
            errorMessage: err?.message || 'Sync error',
          });
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { processed, errors };
  }

  /**
   * Clear synced items older than 24 hours to keep IndexedDB lean
   */
  async cleanupSynced(): Promise<void> {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    await db.offlineQueue
      .where('status')
      .equals('synced')
      .filter(item => item.createdAt < cutoff)
      .delete();
  }
}

export const offlineSyncService = new OfflineSyncService();
