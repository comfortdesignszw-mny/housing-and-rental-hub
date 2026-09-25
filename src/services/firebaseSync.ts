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
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db as firestoreDb, auth, handleFirestoreError, OperationType, sanitizeForFirestore } from '../db/firebase';
import { db as dexieDb } from '../db/db';
import { Property, RoommateProfile, RentalApplication, Message, NotificationItem, User } from '../types';

class FirebaseSyncService {
  private publicUnsubscribers: Unsubscribe[] = [];
  private userUnsubscribers: Unsubscribe[] = [];
  private isProcessingQueue = false;
  private isPublicSyncRunning = false;
  private currentSyncedUserId: string | null = null;

  /**
   * Starts live public listeners for Properties and Roommate Matching.
   * Runs for all users, all sessions, and all guest browsers across devices.
   */
  public async startPublicSync() {
    if (this.isPublicSyncRunning) return;
    this.isPublicSyncRunning = true;

    // Fast initial population from Firestore into IndexedDB cache
    try {
      const [propSnap, roomSnap] = await Promise.allSettled([
        getDocs(query(collection(firestoreDb, 'properties'), limit(200))),
        getDocs(query(collection(firestoreDb, 'roommateProfiles'), limit(200))),
      ]);

      if (propSnap.status === 'fulfilled' && !propSnap.value.empty) {
        const props: Property[] = [];
        propSnap.value.forEach(d => props.push(d.data() as Property));
        await dexieDb.properties.bulkPut(props);
      }

      if (roomSnap.status === 'fulfilled' && !roomSnap.value.empty) {
        const rooms: RoommateProfile[] = [];
        roomSnap.value.forEach(d => rooms.push(d.data() as RoommateProfile));
        await dexieDb.roommateProfiles.bulkPut(rooms);
      }
    } catch (err) {
      console.warn('Initial public cloud cache hydration note:', err);
    }

    // 1. Real-time Properties Listener (all sessions, all devices, including guests)
    const propertiesPath = 'properties';
    const unsubProps = onSnapshot(
      collection(firestoreDb, propertiesPath),
      async snapshot => {
        try {
          const cloudIds = new Set<string>();
          const props: Property[] = [];

          snapshot.forEach(docSnap => {
            cloudIds.add(docSnap.id);
            props.push(docSnap.data() as Property);
          });

          // Reconcile removed properties from IndexedDB
          const localProps = await dexieDb.properties.toArray();
          for (const lp of localProps) {
            if (!cloudIds.has(lp.id)) {
              await dexieDb.properties.delete(lp.id);
            }
          }

          if (props.length > 0) {
            await dexieDb.properties.bulkPut(props);
          }
        } catch (syncErr) {
          console.error('Properties sync error:', syncErr);
        }
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, propertiesPath);
      }
    );
    this.publicUnsubscribers.push(unsubProps);

    // 2. Real-time Roommate Matching Profiles Listener (all sessions, all devices, including guests)
    const roommatesPath = 'roommateProfiles';
    const unsubRoommates = onSnapshot(
      collection(firestoreDb, roommatesPath),
      async snapshot => {
        try {
          const cloudIds = new Set<string>();
          const profiles: RoommateProfile[] = [];

          snapshot.forEach(docSnap => {
            cloudIds.add(docSnap.id);
            profiles.push(docSnap.data() as RoommateProfile);
          });

          // Reconcile removed roommate profiles from IndexedDB
          const localProfiles = await dexieDb.roommateProfiles.toArray();
          for (const lp of localProfiles) {
            if (!cloudIds.has(lp.id)) {
              await dexieDb.roommateProfiles.delete(lp.id);
            }
          }

          if (profiles.length > 0) {
            await dexieDb.roommateProfiles.bulkPut(profiles);
          }
        } catch (syncErr) {
          console.error('Roommate sync error:', syncErr);
        }
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, roommatesPath);
      }
    );
    this.publicUnsubscribers.push(unsubRoommates);
  }

  /**
   * Starts authenticated user-specific listeners:
   * Real-time encrypted messages, rental applications, user notifications, and admin user directory.
   */
  public startUserSync(userId: string, isAdmin: boolean) {
    if (this.currentSyncedUserId === userId) return;
    this.stopUserSync();
    this.currentSyncedUserId = userId;

    try {
      // 1. Messages Listener (where user is recipient)
      const messagesPath = 'messages';
      const unsubRecvMsgs = onSnapshot(
        query(collection(firestoreDb, messagesPath), where('recipientId', '==', userId)),
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
      this.userUnsubscribers.push(unsubRecvMsgs);

      // 2. Messages Listener (where user is sender)
      const unsubSentMsgs = onSnapshot(
        query(collection(firestoreDb, messagesPath), where('senderId', '==', userId)),
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
      this.userUnsubscribers.push(unsubSentMsgs);

      // 3. Rental Applications Listener (as applicant)
      const appsPath = 'applications';
      const unsubApplicant = onSnapshot(
        query(collection(firestoreDb, appsPath), where('applicantId', '==', userId)),
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
      this.userUnsubscribers.push(unsubApplicant);

      // 4. Rental Applications Listener (as landlord)
      const unsubLandlordApps = onSnapshot(
        query(collection(firestoreDb, appsPath), where('landlordId', '==', userId)),
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
      this.userUnsubscribers.push(unsubLandlordApps);

      // 5. Notifications Listener
      const notifsPath = 'notifications';
      const unsubNotifs = onSnapshot(
        query(collection(firestoreDb, notifsPath), where('userId', '==', userId)),
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
      this.userUnsubscribers.push(unsubNotifs);

      // 6. Registered Users Directory (Admin RBAC only)
      if (isAdmin) {
        const usersPath = 'users';
        const unsubUsers = onSnapshot(
          collection(firestoreDb, usersPath),
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
        this.userUnsubscribers.push(unsubUsers);
      }
    } catch (err) {
      console.warn('User sync setup warning:', err);
    }
  }

  /**
   * Stops authenticated user listeners, but keeps public sync running
   */
  public stopUserSync() {
    this.userUnsubscribers.forEach(unsub => unsub());
    this.userUnsubscribers = [];
    this.currentSyncedUserId = null;
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
            const message = sanitizeForFirestore(item.payload as Message);
            await setDoc(doc(firestoreDb, 'messages', message.id), message);
            await dexieDb.messages.update(message.id, { status: 'sent' });
          } else if (item.actionType === 'create_listing') {
            const property = sanitizeForFirestore(item.payload as Property);
            await setDoc(doc(firestoreDb, 'properties', property.id), property);
          } else if (item.actionType === 'update_listing') {
            const { id, updates } = item.payload;
            await updateDoc(doc(firestoreDb, 'properties', id), sanitizeForFirestore(updates));
          } else if (item.actionType === 'submit_application') {
            const app = sanitizeForFirestore(item.payload as RentalApplication);
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
