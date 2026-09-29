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
  }
}

export const db = new ComfortHubDatabase();

/**
 * Initializes clean local offline IndexedDB cache with essential verified tenant requests.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await db.open();
    console.log('ComfortHub: Local offline IndexedDB cache ready.');

    // Seed realistic Zimbabwe tenant requests if needed table is empty
    const neededCount = await db.propertiesNeeded.count();
    if (neededCount === 0) {
      const now = Date.now();
      const initialRequests: PropertyNeeded[] = [
        {
          id: 'need_avondale_1bed',
          tenantId: 'user_tenant',
          tenantName: 'Tariro Moyo',
          tenantPhone: '+263 77 234 5678',
          tenantWhatsApp: '+263 77 234 5678',
          tenantEmail: 'tariro.moyo@gmail.com',
          propertyTypeNeeded: '1 Bedroom Flat / Cottage',
          locationPreferred: 'Avondale, Harare',
          city: 'Harare',
          suburb: 'Avondale',
          province: 'Harare Province',
          availabilityDate: 'Immediate',
          amenitiesPreferred: ['Borehole Water', 'Prepaid ZESA', 'Solar System', 'Walled and Gated', 'WiFi Available'],
          budgetUsd: 280,
          description: 'Young accounting professional looking for a secure, quiet 1-bed flat or cottage with reliable water and solar in Avondale.',
          contactPreference: 'Both',
          status: 'active',
          offersCount: 1,
          createdAt: now - 3600000 * 5,
          updatedAt: now - 3600000 * 2,
        },
        {
          id: 'need_mt_pleasant_2bed',
          tenantId: 'tenant_farai_c',
          tenantName: 'Farai Chidzero',
          tenantPhone: '+263 71 890 1234',
          tenantWhatsApp: '+263 71 890 1234',
          tenantEmail: 'farai.chidzero@gmail.com',
          propertyTypeNeeded: '2 Bedroom Flat',
          locationPreferred: 'Mount Pleasant, Harare',
          city: 'Harare',
          suburb: 'Mount Pleasant',
          province: 'Harare Province',
          availabilityDate: 'Within 2 Weeks',
          amenitiesPreferred: ['Borehole Water', 'Prepaid ZESA', 'Solar System', 'Parking Space', 'Walled and Gated'],
          budgetUsd: 450,
          description: 'Looking for a clean 2-bedroom apartment or cottage close to Arundel or UZ. Need parking space for 1 vehicle.',
          contactPreference: 'WhatsApp',
          status: 'active',
          offersCount: 0,
          createdAt: now - 3600000 * 12,
          updatedAt: now - 3600000 * 12,
        },
        {
          id: 'need_belvedere_house',
          tenantId: 'tenant_simbarashe',
          tenantName: 'Simbarashe Ndlovu',
          tenantPhone: '+263 78 456 7890',
          tenantWhatsApp: '+263 78 456 7890',
          propertyTypeNeeded: 'Full House (3-4 Beds)',
          locationPreferred: 'Belvedere, Harare',
          city: 'Harare',
          suburb: 'Belvedere',
          province: 'Harare Province',
          availabilityDate: 'Next Month',
          amenitiesPreferred: ['Borehole Water', 'Prepaid ZESA', 'Solar System', 'Parking Space', 'Pet Friendly', 'Walled and Gated'],
          budgetUsd: 750,
          description: 'Family with 2 children relocating to Harare. Looking for a neat 3 or 4 bedroom house with garden, borehole and walled/gated.',
          contactPreference: 'Both',
          status: 'active',
          offersCount: 0,
          createdAt: now - 3600000 * 24,
          updatedAt: now - 3600000 * 24,
        },
        {
          id: 'need_hillside_room',
          tenantId: 'tenant_nokuthula',
          tenantName: 'Nokuthula Dube',
          tenantPhone: '+263 77 654 3210',
          tenantWhatsApp: '+263 77 654 3210',
          propertyTypeNeeded: '1 Room / Bachelor Room',
          locationPreferred: 'Hillside, Bulawayo',
          city: 'Bulawayo',
          suburb: 'Hillside',
          province: 'Bulawayo',
          availabilityDate: 'Immediate',
          amenitiesPreferred: ['Prepaid ZESA', 'Borehole Water', 'Own Entrance'],
          budgetUsd: 130,
          description: 'Working lady seeking a spacious inside or outside room with own entrance in Hillside or Bradfield area.',
          contactPreference: 'Phone Call',
          status: 'active',
          offersCount: 0,
          createdAt: now - 3600000 * 30,
          updatedAt: now - 3600000 * 30,
        },
      ];
      await db.propertiesNeeded.bulkPut(initialRequests);

      // Seed 1 sample offer for Tariro Moyo (user_tenant) to demonstrate the Property Owners Offers section
      const sampleOffer: PropertyOffer = {
        id: 'offer_sample_avondale',
        propertyNeededId: 'need_avondale_1bed',
        tenantId: 'user_tenant',
        tenantName: 'Tariro Moyo',
        landlordId: 'user_landlord_demo',
        landlordName: 'Kudzai Marume (Property Owner)',
        landlordRole: 'landlord',
        landlordPhone: '+263 77 111 2233',
        landlordWhatsApp: '+263 77 111 2233',
        propertyName: 'Avondale West 1-Bed Garden Cottage',
        propertyType: 'Cottage',
        location: 'Avondale West, Harare',
        rentUsd: 280,
        depositUsd: 280,
        availableFrom: 'Immediate',
        amenities: ['Borehole Water', 'Solar System', 'Prepaid ZESA', 'Walled and Gated', 'WiFi Available'],
        notes: 'Hello Tariro, I saw your request for a 1-bed cottage in Avondale. I have a neat self-contained garden cottage with solar power and nonstop borehole water available immediately. Rent is $280/month inclusive of water.',
        status: 'pending',
        createdAt: now - 3600000 * 2,
      };
      await db.propertyOffers.put(sampleOffer);

      // Add corresponding notification for the tenant
      await db.notifications.put({
        id: 'notif_offer_sample',
        userId: 'user_tenant',
        title: 'New Property Offer from Kudzai Marume',
        message: 'Kudzai Marume (Property Owner) offered "Avondale West 1-Bed Garden Cottage" ($280/mo in Avondale West) for your accommodation request.',
        type: 'property_offer',
        read: false,
        timestamp: now - 3600000 * 2,
        actionUrl: 'landlord?tab=property_offers&offerId=offer_sample_avondale',
      });
    }
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
      await db.likedRoommates.clear();
      await db.notifications.clear();
      await db.offlineQueue.clear();
      await db.propertiesNeeded.clear();
      await db.propertyOffers.clear();
    }
  );
}
