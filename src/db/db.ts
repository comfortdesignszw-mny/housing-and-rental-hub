import Dexie, { Table } from 'dexie';
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
  SavedPropertyNeeded,
  LikedRoommate,
  NotificationItem,
  OfflineQueueItem,
  PropertyNeeded,
  PropertyOffer,
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
  savedPropertiesNeeded!: Table<SavedPropertyNeeded, string>;
  likedRoommates!: Table<LikedRoommate, string>;
  notifications!: Table<NotificationItem, string>;
  offlineQueue!: Table<OfflineQueueItem, string>;
  propertiesNeeded!: Table<PropertyNeeded, string>;
  propertyOffers!: Table<PropertyOffer, string>;

  constructor() {
    super('ComfortHousingHubDB');
    this.version(2).stores({
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
      propertiesNeeded: 'id, tenantId, propertyTypeNeeded, budgetUsd, city, suburb, status, createdAt',
      propertyOffers: 'id, propertyNeededId, tenantId, landlordId, status, createdAt',
    });

    this.version(3).stores({
      savedPropertiesNeeded: 'id, [userId+propertyNeededId], userId, propertyNeededId, savedAt',
      propertiesNeeded: 'id, tenantId, propertyTypeNeeded, budgetUsd, city, suburb, status, foundAt, createdAt',
    });
  }
}

export const db = new ComfortHubDatabase();

/**
 * Initializes clean local offline IndexedDB cache ready for production and industry data.
 * All seeded and sample data removed to receive real user records.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await db.open();
    console.log('ComfortHub: Local offline IndexedDB cache ready for production data.');

    // Remove any leftover sample data from previous development runs
    const sampleIds = ['need_avondale_1bed', 'need_mt_pleasant_2bed', 'need_belvedere_house', 'need_hillside_room'];
    for (const sId of sampleIds) {
      await db.propertiesNeeded.delete(sId).catch(() => {});
    }
    await db.propertyOffers.delete('offer_sample_avondale').catch(() => {});
    await db.notifications.delete('notif_offer_sample').catch(() => {});
  } catch (error) {
    console.error('ComfortHub: Error initializing local database', error);
  }
}

/**
 * Clears local offline cache.
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
      db.savedPropertiesNeeded,
      db.likedRoommates,
      db.notifications,
      db.offlineQueue,
      db.propertiesNeeded,
      db.propertyOffers,
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
      await db.savedPropertiesNeeded.clear();
      await db.likedRoommates.clear();
      await db.notifications.clear();
      await db.offlineQueue.clear();
      await db.propertiesNeeded.clear();
      await db.propertyOffers.clear();
    }
  );
}
