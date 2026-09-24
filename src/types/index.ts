export type UserRole = 'tenant' | 'landlord' | 'property_manager' | 'admin' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  role: UserRole;
  avatar?: string;
  verified: boolean;
  createdAt: number;
  bio?: string;
  city?: string;
}

export type PropertyType =
  | 'House'
  | 'Flat'
  | 'Apartment'
  | 'Cottage'
  | 'Room'
  | 'Shared Room'
  | 'Student Accommodation'
  | 'Boarding House'
  | 'Commercial Property'
  | 'Office'
  | 'Warehouse'
  | 'Land';

export type AvailabilityStatus = 'Immediate' | 'Next Month' | 'From Date' | 'Occupied';

export type RentBasis = 'per month' | 'per room' | 'per house' | 'per space' | 'per bed';

export interface Property {
  id: string;
  landlordId: string;
  landlordName: string;
  landlordPhone: string;
  landlordEmail?: string;
  name: string;
  propertyType: PropertyType;
  rentUsd: number;
  rentZig?: number;
  rentBasis?: RentBasis;
  depositUsd: number;
  province: string;
  city: string;
  town?: string;
  suburb: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  roomsAvailable?: number;
  photos: string[];
  amenities: string[]; // e.g. 'Solar Power', 'Borehole Water', 'WiFi', 'Parking', '24/7 Security', 'Furnished', 'Pet Friendly', 'Prepaid ZESA', 'Water Tank', 'Backup Generator', 'Walled & Gated'
  description: string;
  availability: AvailabilityStatus;
  availableDate?: string;
  occupiedAt?: number;
  gpsLat?: number;
  gpsLng?: number;
  featured?: boolean;
  views: number;
  rating?: number;
  ratingCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Tenant {
  id: string;
  landlordId: string;
  propertyId: string;
  propertyName: string;
  unitNumber?: string;
  name: string;
  phone: string;
  email: string;
  moveInDate: string;
  depositPaid: number;
  rentAmount: number;
  currency: 'USD' | 'ZiG';
  leaseEnd: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: 'active' | 'notice_given' | 'overdue' | 'past';
  notes?: string;
  createdAt: number;
}

export type PaymentMethod =
  | 'Cash (USD)'
  | 'EcoCash'
  | 'InnBucks'
  | 'Mukuru'
  | 'Bank Transfer (ZIPIT)'
  | 'Card Payment';

export interface RentPayment {
  id: string;
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  landlordId: string;
  amount: number;
  currency: 'USD' | 'ZiG';
  dueDate: string;
  paymentDate?: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  paymentMethod?: PaymentMethod;
  reference?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: number;
}

export interface Lease {
  id: string;
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  landlordId: string;
  unitNumber?: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  terms: string;
  renewalDate?: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'terminated';
  documentNotes?: string;
  createdAt: number;
}

export type MaintenanceCategory =
  | 'Plumbing'
  | 'Electrical'
  | 'Damage Report'
  | 'Security / Locks'
  | 'Borehole / Water'
  | 'Solar / Power'
  | 'Roof / Ceiling'
  | 'General Request';

export type MaintenanceUrgency = 'low' | 'medium' | 'high' | 'emergency';
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  landlordId: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  photos: string[];
  reportedAt: number;
  resolvedAt?: number;
  estimatedCost?: number;
  assignedTo?: string;
}

export interface RoommateProfile {
  id: string;
  userId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  occupation: string;
  budgetUsd: number;
  studentStatus: 'Student' | 'Working Professional' | 'Both';
  universityOrWorkplace: string;
  preferredProvinces: string[];
  preferredCities: string[];
  preferredSuburbs: string[];
  accommodationTypeWanted: PropertyType[];
  moveInDate: string;
  cleanliness: 'Very Clean' | 'Moderate' | 'Relaxed';
  sleepSchedule: 'Early Bird' | 'Night Owl' | 'Flexible';
  smokingPreference: 'Non-Smoker' | 'Smoker' | 'Outside Only' | 'Doesn\'t Matter';
  drinkingPreference: 'Non-Drinker' | 'Social Drinker' | 'Doesn\'t Matter';
  guestPolicy: 'No Overnight Guests' | 'Weekends Only' | 'Occasional' | 'Flexible';
  petTolerance: 'Loves Pets' | 'No Pets' | 'Neutral';
  bio: string;
  avatar: string;
  phone: string;
  email: string;
  verified: boolean;
  createdAt: number;
}

export interface RentalApplication {
  id: string;
  propertyId: string;
  propertyName: string;
  landlordId: string;
  applicantId: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  proposedMoveInDate: string;
  occupantsCount: number;
  employmentStatus: string;
  monthlyIncomeUsd?: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  content: string;
  photoUrl?: string;
  status: 'sent' | 'delivered' | 'read' | 'queued';
  timestamp: number;
  offlineId?: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  participantRoles: Record<string, UserRole>;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  propertyId?: string;
  propertyName?: string;
}

export interface SavedListing {
  id: string;
  userId: string;
  propertyId: string;
  savedAt: number;
}

export interface LikedRoommate {
  id: string;
  userId: string;
  roommateProfileId: string;
  likedAt: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type:
    | 'rent_due'
    | 'property_match'
    | 'roommate_match'
    | 'lease_expiry'
    | 'application_update'
    | 'maintenance_update'
    | 'message';
  read: boolean;
  timestamp: number;
  actionUrl?: string;
}

export interface OfflineQueueItem {
  id: string;
  actionType:
    | 'create_listing'
    | 'update_listing'
    | 'send_message'
    | 'submit_application'
    | 'submit_maintenance'
    | 'record_payment'
    | 'update_maintenance_status';
  payload: any;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: number;
  retryCount: number;
  errorMessage?: string;
}
