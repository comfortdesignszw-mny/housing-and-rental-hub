import { db } from '../db/db';
import { OfflineQueueItem, Message, RentalApplication, Property } from '../types';
import { db as firestoreDb, sanitizeForFirestore } from '../db/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

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

          // 1. Send Message
          if (item.actionType === 'send_message') {
            const msg = item.payload as Message;
            if (msg && msg.id) {
              const cleanMsg = sanitizeForFirestore({ ...msg, status: 'sent' });
              await setDoc(doc(firestoreDb, 'messages', msg.id), cleanMsg);
              await db.messages.update(msg.id, { status: 'sent' });
            }
          }

          // 2. Submit Rental Application
          else if (item.actionType === 'submit_application') {
            const app = item.payload as RentalApplication;
            if (app && app.id) {
              const cleanApp = sanitizeForFirestore(app);
              await setDoc(doc(firestoreDb, 'applications', app.id), cleanApp);
            }
          }

          // 3. Update Listing
          else if (item.actionType === 'update_listing') {
            const { id, ...data } = item.payload;
            if (id) {
              const cleanData = sanitizeForFirestore(data);
              await updateDoc(doc(firestoreDb, 'properties', id), cleanData);
            }
          }

          // 4. Create Listing
          else if (item.actionType === 'create_listing') {
            const prop = item.payload as Property;
            if (prop && prop.id) {
              const cleanProp = sanitizeForFirestore(prop);
              await setDoc(doc(firestoreDb, 'properties', prop.id), cleanProp);
            }
          }

          // Mark item as synced
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
