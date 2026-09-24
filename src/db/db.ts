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
import {
  SEED_USERS,
  SEED_PROPERTIES,
  SEED_ROOMMATES,
  SEED_TENANTS,
  SEED_PAYMENTS,
  SEED_LEASES,
  SEED_MAINTENANCE,
  SEED_APPLICATIONS,
  SEED_NOTIFICATIONS,
} from './seedData';

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
 * Initializes database with offline seed data on first launch
 * Zero network requests!
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const propertyCount = await db.properties.count();
    if (propertyCount === 0) {
      console.log('ComfortHub: Seeding initial offline Zimbabwe database...');
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
          db.notifications,
        ],
        async () => {
          await db.users.bulkAdd(SEED_USERS);
          await db.properties.bulkAdd(SEED_PROPERTIES);
          await db.roommateProfiles.bulkAdd(SEED_ROOMMATES);
          await db.tenants.bulkAdd(SEED_TENANTS);
          await db.rentPayments.bulkAdd(SEED_PAYMENTS);
          await db.leases.bulkAdd(SEED_LEASES);
          await db.maintenanceRequests.bulkAdd(SEED_MAINTENANCE);
          await db.applications.bulkAdd(SEED_APPLICATIONS);
          await db.notifications.bulkAdd(SEED_NOTIFICATIONS);
        }
      );
      console.log('ComfortHub: Database seeded successfully offline.');
    }
  } catch (error) {
    console.error('ComfortHub: Error initializing local database', error);
  }
}

/**
 * Resets local database back to default seed data if user requests it
 */
export async function resetDatabaseToDefaults(): Promise<void> {
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

      await db.users.bulkAdd(SEED_USERS);
      await db.properties.bulkAdd(SEED_PROPERTIES);
      await db.roommateProfiles.bulkAdd(SEED_ROOMMATES);
      await db.tenants.bulkAdd(SEED_TENANTS);
      await db.rentPayments.bulkAdd(SEED_PAYMENTS);
      await db.leases.bulkAdd(SEED_LEASES);
      await db.maintenanceRequests.bulkAdd(SEED_MAINTENANCE);
      await db.applications.bulkAdd(SEED_APPLICATIONS);
      await db.notifications.bulkAdd(SEED_NOTIFICATIONS);
    }
  );
}
