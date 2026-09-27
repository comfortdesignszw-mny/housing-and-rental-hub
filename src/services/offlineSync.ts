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
            const id = item.payload?.id;
            if (id) {
              const dataToUpdate = item.payload.updates ? item.payload.updates : { ...item.payload };
              delete dataToUpdate.id;
              const cleanData = sanitizeForFirestore(dataToUpdate);
              await setDoc(doc(firestoreDb, 'properties', id), cleanData, { merge: true });
            }
          }

          // 4. Create Listing
          else if (item.actionType === 'create_listing') {
            const prop = item.payload as Property;
            if (prop && prop.id) {
              const cleanProp = sanitizeForFirestore(prop);
              await setDoc(doc(firestoreDb, 'properties', prop.id), cleanProp, { merge: true });
            }
          }

          // 5. Rent Payment
          else if (item.actionType === 'record_payment') {
            const payment = sanitizeForFirestore(item.payload);
            if (payment && payment.id) {
              await setDoc(doc(firestoreDb, 'rentPayments', payment.id), payment, { merge: true });
            }
          }

          // 6. Submit Maintenance
          else if (item.actionType === 'submit_maintenance') {
            const ticket = sanitizeForFirestore(item.payload);
            if (ticket && ticket.id) {
              await setDoc(doc(firestoreDb, 'maintenanceRequests', ticket.id), ticket, { merge: true });
            }
          }

          // 7. Update Maintenance Status
          else if (item.actionType === 'update_maintenance_status') {
            const { id, ...data } = item.payload;
            if (id) {
              await setDoc(doc(firestoreDb, 'maintenanceRequests', id), sanitizeForFirestore(data), { merge: true });
            }
          }

          // Mark item as synced
          await db.offlineQueue.update(item.id, { status: 'synced' });
          processed++;
        } catch (err: any) {
          const isPermError =
            err?.code === 'permission-denied' ||
            err?.message?.includes('Missing or insufficient permissions') ||
            err?.message?.includes('permission');
          console.warn(`OfflineSync: Queue item ${item.id} sync note:`, err?.message || err);
          errors++;
          // If unauthorized, permission denied, or retried too many times, dismiss it from the queue cleanly
          if (isPermError || item.retryCount >= 2) {
            console.info(`OfflineSync: Dismissing un-syncable queue item ${item.id}.`);
            await db.offlineQueue.delete(item.id);
          } else {
            await db.offlineQueue.update(item.id, {
              status: 'failed',
              retryCount: item.retryCount + 1,
              errorMessage: err?.message || 'Sync error',
            });
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { processed, errors };
  }

  /**
   * Purge stuck failed items caused by old permission roadblocks
   */
  async purgeStalePermissionQueue(): Promise<void> {
    try {
      const failed = await db.offlineQueue.where('status').equals('failed').toArray();
      for (const item of failed) {
        if (
          item.errorMessage?.includes('permission') ||
          item.errorMessage?.includes('Missing or insufficient permissions') ||
          item.retryCount >= 2
        ) {
          await db.offlineQueue.delete(item.id);
        }
      }
    } catch (e) {
      console.warn('Queue purge note:', e);
    }
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
