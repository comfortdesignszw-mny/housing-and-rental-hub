import Dexie, { type Table } from 'dexie';
import {
  User,
  Property,
  Tenant,
  RentPayment,
  Lease,
  MaintenanceRequest,
  RoommateProfile,
  RentalApplication,
  Message,
  Conversation,
  SavedListing,
  LikedRoommate,
  NotificationItem,
  OfflineQueueItem,
} from '../types';

export class ComfortHubDatabase extends Dexie {
  users!: Table<User, string>;
  properties!: Table<Property, string>;
  tenants!: Table<Tenant, string>;
  rentPayments!: Table<RentPayment, string>;
  leases!: Table<Lease, string>;
  maintenanceRequests!: Table<MaintenanceRequest, string>;
  roommateProfiles!: Table<RoommateProfile, string>;
  applications!: Table<RentalApplication, string>;
  messages!: Table<Message, string>;
  conversations!: Table<Conversation, string>;
  savedProperties!: Table<SavedListing, string>;
  likedRoommates!: Table<LikedRoommate, string>;
  notifications!: Table<NotificationItem, string>;
  offlineQueue!: Table<OfflineQueueItem, string>;

  constructor() {
    super('ComfortHousingHubDB');
    this.version(1).stores({
      users: 'id, email, phone, role, verified, createdAt',
      properties:
        'id, landlordId, propertyType, rentUsd, province, city, suburb, bedrooms, bathrooms, availability, featured, createdAt',
      tenants: 'id, landlordId, propertyId, status, createdAt',
      rentPayments: 'id, propertyId, tenantId, landlordId, dueDate, status, createdAt',
      leases: 'id, propertyId, tenantId, landlordId, status, startDate, endDate',
      maintenanceRequests:
        'id, propertyId, tenantId, landlordId, category, urgency, status, reportedAt',
      roommateProfiles:
        'id, userId, gender, budgetUsd, studentStatus, moveInDate, createdAt',
      applications: 'id, propertyId, landlordId, applicantId, status, appliedAt',
      messages: 'id, conversationId, senderId, recipientId, status, timestamp',
      conversations: 'id, lastMessageTime',
      savedProperties: 'id, [userId+propertyId], userId, propertyId, savedAt',
      likedRoommates: 'id, [userId+roommateProfileId], userId, roommateProfileId, likedAt',
      notifications: 'id, userId, read, timestamp',
      offlineQueue: 'id, actionType, status, createdAt',
    });
  }
}

export const db = new ComfortHubDatabase();

/**
 * Initializes clean local offline IndexedDB cache.
 * All seeded and mock users/data removed to handle real-world industry data.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await db.open();
    console.log('ComfortHub: Local offline IndexedDB cache ready for production data.');
  } catch (error) {
    console.error('ComfortHub: Error initializing local database', error);
  }
}

/**
 * Clears local offline cache without seeding fake data.
 */
export async function clearLocalCache(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.users,
      db.properties,
      db.roommateProfiles,
      db.tenants,
      db.rentPayments,
      db.leases,
      db.maintenanceRequests,
      db.applications,
      db.messages,
      db.conversations,
      db.savedProperties,
      db.likedRoommates,
      db.notifications,
      db.offlineQueue,
    ],
    async () => {
      await db.users.clear();
      await db.properties.clear();
      await db.roommateProfiles.clear();
      await db.tenants.clear();
      await db.rentPayments.clear();
      await db.leases.clear();
      await db.maintenanceRequests.clear();
      await db.applications.clear();
      await db.messages.clear();
      await db.conversations.clear();
      await db.savedProperties.clear();
      await db.likedRoommates.clear();
      await db.notifications.clear();
      await db.offlineQueue.clear();
    }
  );
}
