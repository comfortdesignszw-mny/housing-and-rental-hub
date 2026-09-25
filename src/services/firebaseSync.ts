import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db as firestoreDb, auth, handleFirestoreError, OperationType } from '../db/firebase';
import { db as dexieDb } from '../db/db';
import { Property, RoommateProfile, RentalApplication, Message, Conversation, NotificationItem, User } from '../types';

class FirebaseSyncService {
  private unsubscribers: Unsubscribe[] = [];
  private isProcessingQueue = false;

  /**
   * Starts live Firestore listeners and syncs documents to local Dexie IndexedDB cache.
   */
  public startSync(currentUserId: string, isAdmin: boolean) {
    this.stopSync();

    try {
      // 1. Properties Listener (Public Real World Listings)
      const propertiesPath = 'properties';
      const propertiesQuery = query(collection(firestoreDb, propertiesPath), limit(100));
      const unsubProps = onSnapshot(
        propertiesQuery,
        async snapshot => {
          const properties: Property[] = [];
          snapshot.forEach(docSnap => {
            properties.push(docSnap.data() as Property);
          });
          if (properties.length > 0) {
            await dexieDb.properties.bulkPut(properties);
          }
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, propertiesPath);
        }
      );
      this.unsubscribers.push(unsubProps);

      // 2. Roommate Profiles Listener
      const roommatesPath = 'roommateProfiles';
      const roommatesQuery = query(collection(firestoreDb, roommatesPath), limit(100));
      const unsubRoommates = onSnapshot(
        roommatesQuery,
        async snapshot => {
          const profiles: RoommateProfile[] = [];
          snapshot.forEach(docSnap => {
            profiles.push(docSnap.data() as RoommateProfile);
          });
          if (profiles.length > 0) {
            await dexieDb.roommateProfiles.bulkPut(profiles);
          }
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, roommatesPath);
        }
      );
      this.unsubscribers.push(unsubRoommates);

      // 3. User Messages (Realtime WhatsApp-like synchronization)
      // Listen to messages where user is sender or recipient
      const messagesPath = 'messages';
      const messagesRecipientQuery = query(
        collection(firestoreDb, messagesPath),
        where('recipientId', '==', currentUserId)
      );
      const unsubRecvMsgs = onSnapshot(
        messagesRecipientQuery,
        async snapshot => {
          const msgs: Message[] = [];
          snapshot.forEach(docSnap => {
            msgs.push(docSnap.data() as Message);
          });
          if (msgs.length > 0) {
            await dexieDb.messages.bulkPut(msgs);
          }
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, messagesPath);
        }
      );
      this.unsubscribers.push(unsubRecvMsgs);

      const messagesSenderQuery = query(
        collection(firestoreDb, messagesPath),
        where('senderId', '==', currentUserId)
      );
      const unsubSentMsgs = onSnapshot(
        messagesSenderQuery,
        async snapshot => {
          const msgs: Message[] = [];
          snapshot.forEach(docSnap => {
            msgs.push(docSnap.data() as Message);
          });
          if (msgs.length > 0) {
            await dexieDb.messages.bulkPut(msgs);
          }
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, messagesPath);
        }
      );
      this.unsubscribers.push(unsubSentMsgs);

      // 4. Rental Applications
      const appsPath = 'applications';
      const applicantQuery = query(
        collection(firestoreDb, appsPath),
        where('applicantId', '==', currentUserId)
      );
      const unsubApplicant = onSnapshot(
        applicantQuery,
        async snapshot => {
          const apps: RentalApplication[] = [];
          snapshot.forEach(docSnap => {
            apps.push(docSnap.data() as RentalApplication);
          });
          if (apps.length > 0) {
            await dexieDb.applications.bulkPut(apps);
          }
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, appsPath);
        }
      );
      this.unsubscribers.push(unsubApplicant);

      const landlordAppQuery = query(
        collection(firestoreDb, appsPath),
        where('landlordId', '==', currentUserId)
      );
      const unsubLandlordApps = onSnapshot(
        landlordAppQuery,
        async snapshot => {
          const apps: RentalApplication[] = [];
          snapshot.forEach(docSnap => {
            apps.push(docSnap.data() as RentalApplication);
          });
          if (apps.length > 0) {
            await dexieDb.applications.bulkPut(apps);
          }
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, appsPath);
        }
      );
      this.unsubscribers.push(unsubLandlordApps);

      // 5. Notifications
      const notifsPath = 'notifications';
      const notifsQuery = query(
        collection(firestoreDb, notifsPath),
        where('userId', '==', currentUserId)
      );
      const unsubNotifs = onSnapshot(
        notifsQuery,
        async snapshot => {
          const notifs: NotificationItem[] = [];
          snapshot.forEach(docSnap => {
            notifs.push(docSnap.data() as NotificationItem);
          });
          if (notifs.length > 0) {
            await dexieDb.notifications.bulkPut(notifs);
          }
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, notifsPath);
        }
      );
      this.unsubscribers.push(unsubNotifs);

      // 6. If Admin, sync registered users directory
      if (isAdmin) {
        const usersPath = 'users';
        const usersQuery = query(collection(firestoreDb, usersPath));
        const unsubUsers = onSnapshot(
          usersQuery,
          async snapshot => {
            const users: User[] = [];
            snapshot.forEach(docSnap => {
              users.push(docSnap.data() as User);
            });
            if (users.length > 0) {
              await dexieDb.users.bulkPut(users);
            }
          },
          error => {
            handleFirestoreError(error, OperationType.LIST, usersPath);
          }
        );
        this.unsubscribers.push(unsubUsers);
      }
    } catch (err) {
      console.warn('Sync initialization warning:', err);
    }
  }

  public stopSync() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  /**
   * Process pending offline changes from Dexie queue to Firestore
   */
  public async processOfflineQueue(): Promise<{ processed: number; errors: number }> {
    if (this.isProcessingQueue) return { processed: 0, errors: 0 };
    if (!navigator.onLine || !auth.currentUser) return { processed: 0, errors: 0 };

    this.isProcessingQueue = true;
    let processed = 0;
    let errors = 0;

    try {
      const pendingItems = await dexieDb.offlineQueue
        .where('status')
        .equals('pending')
        .toArray();

      for (const item of pendingItems) {
        try {
          await dexieDb.offlineQueue.update(item.id, { status: 'syncing' });

          if (item.actionType === 'send_message') {
            const message = item.payload as Message;
            const path = `messages/${message.id}`;
            await setDoc(doc(firestoreDb, 'messages', message.id), message);
            await dexieDb.messages.update(message.id, { status: 'sent' });
          } else if (item.actionType === 'create_listing') {
            const property = item.payload as Property;
            await setDoc(doc(firestoreDb, 'properties', property.id), property);
          } else if (item.actionType === 'update_listing') {
            const { id, updates } = item.payload;
            await updateDoc(doc(firestoreDb, 'properties', id), updates);
          } else if (item.actionType === 'submit_application') {
            const app = item.payload as RentalApplication;
            await setDoc(doc(firestoreDb, 'applications', app.id), app);
          }

          await dexieDb.offlineQueue.update(item.id, { status: 'synced' });
          processed++;
        } catch (err) {
          console.error(`Error syncing queue item ${item.id}:`, err);
          errors++;
          await dexieDb.offlineQueue.update(item.id, {
            status: 'failed',
            retryCount: item.retryCount + 1,
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }

    return { processed, errors };
  }
}

export const firebaseSyncService = new FirebaseSyncService();
