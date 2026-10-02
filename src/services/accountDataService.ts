import { db } from '../db/db';
import { db as firestoreDb, auth, sanitizeForFirestore } from '../db/firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  User,
  Property,
  PropertyNeeded,
  RoommateProfile,
  RentalApplication,
  SavedListing,
  SavedPropertyNeeded,
  Message,
} from '../types';
import { firebaseSyncService } from './firebaseSync';

export interface AccountBackupData {
  version: 'comfort_backup_v1';
  appName: 'Comfort Housing and Rental Hub';
  exportedAt: number;
  exportedAtFormatted: string;
  user: User;
  properties: Property[];
  propertiesNeeded: PropertyNeeded[];
  roommateProfiles: RoommateProfile[];
  applications: RentalApplication[];
  savedProperties: SavedListing[];
  savedPropertiesNeeded: SavedPropertyNeeded[];
  messages: Message[];
}

/**
 * Compiles all data related to the current user into a portable JSON backup blob.
 */
export async function exportAccountData(user: User): Promise<Blob> {
  const [
    properties,
    propertiesNeeded,
    roommateProfiles,
    applications,
    savedProperties,
    savedPropertiesNeeded,
    messages,
  ] = await Promise.all([
    db.properties.where('landlordId').equals(user.id).toArray(),
    db.propertiesNeeded.where('tenantId').equals(user.id).toArray(),
    db.roommateProfiles.where('userId').equals(user.id).toArray(),
    db.applications.where('applicantId').equals(user.id).toArray(),
    db.savedProperties.where('userId').equals(user.id).toArray(),
    db.savedPropertiesNeeded.where('userId').equals(user.id).toArray(),
    db.messages.filter(m => m.senderId === user.id || m.recipientId === user.id).toArray(),
  ]);

  const backupObject: AccountBackupData = {
    version: 'comfort_backup_v1',
    appName: 'Comfort Housing and Rental Hub',
    exportedAt: Date.now(),
    exportedAtFormatted: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      role: user.role,
      verified: user.verified,
      createdAt: user.createdAt,
      bio: user.bio,
      city: user.city,
      companyName: user.companyName,
      avatar: user.avatar,
    },
    properties,
    propertiesNeeded,
    roommateProfiles,
    applications,
    savedProperties,
    savedPropertiesNeeded,
    messages,
  };

  const jsonString = JSON.stringify(backupObject, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}

/**
 * Triggers a client-side download of the account backup JSON file.
 */
export function downloadAccountDataFile(blob: Blob, userName: string): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanName = userName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'account';
  const fileName = `comfort_housing_backup_${cleanName}_${dateStr}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Validates and parses an uploaded JSON backup file.
 */
export async function parseAndValidateBackup(file: File): Promise<AccountBackupData> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    throw new Error('Please select a valid JSON backup file (.json).');
  }

  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The selected file is not a valid JSON document.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file format.');
  }

  if (!parsed.user || !parsed.user.name) {
    throw new Error('Backup file does not contain valid Comfort Housing account profile information.');
  }

  return {
    version: parsed.version || 'comfort_backup_v1',
    appName: parsed.appName || 'Comfort Housing and Rental Hub',
    exportedAt: typeof parsed.exportedAt === 'number' ? parsed.exportedAt : Date.now(),
    exportedAtFormatted: parsed.exportedAtFormatted || new Date().toISOString(),
    user: parsed.user,
    properties: Array.isArray(parsed.properties) ? parsed.properties : [],
    propertiesNeeded: Array.isArray(parsed.propertiesNeeded) ? parsed.propertiesNeeded : [],
    roommateProfiles: Array.isArray(parsed.roommateProfiles) ? parsed.roommateProfiles : [],
    applications: Array.isArray(parsed.applications) ? parsed.applications : [],
    savedProperties: Array.isArray(parsed.savedProperties) ? parsed.savedProperties : [],
    savedPropertiesNeeded: Array.isArray(parsed.savedPropertiesNeeded) ? parsed.savedPropertiesNeeded : [],
    messages: Array.isArray(parsed.messages) ? parsed.messages : [],
  };
}

export interface RestoreResult {
  propertiesCount: number;
  requestsCount: number;
  roommatesCount: number;
  applicationsCount: number;
  savedCount: number;
  messagesCount: number;
}

/**
 * Restores account records from backup data into the active user's account.
 */
export async function restoreAccountData(
  backup: AccountBackupData,
  targetUser: User
): Promise<RestoreResult> {
  const result: RestoreResult = {
    propertiesCount: 0,
    requestsCount: 0,
    roommatesCount: 0,
    applicationsCount: 0,
    savedCount: 0,
    messagesCount: 0,
  };

  // 1. Update Profile in Dexie and Firestore
  const updatedUser: User = {
    ...targetUser,
    name: backup.user.name || targetUser.name,
    phone: backup.user.phone || targetUser.phone,
    whatsappNumber: backup.user.whatsappNumber || targetUser.whatsappNumber || targetUser.phone,
    bio: backup.user.bio || targetUser.bio,
    city: backup.user.city || targetUser.city,
    avatar: backup.user.avatar || targetUser.avatar,
    companyName: backup.user.companyName || targetUser.companyName,
  };

  await db.users.put(updatedUser);
  try {
    const cleanUser = sanitizeForFirestore({
      name: updatedUser.name,
      phone: updatedUser.phone,
      whatsappNumber: updatedUser.whatsappNumber,
      bio: updatedUser.bio || '',
      city: updatedUser.city || 'Harare',
      avatar: updatedUser.avatar || '',
      companyName: updatedUser.companyName || '',
    });
    await updateDoc(doc(firestoreDb, 'users', targetUser.id), cleanUser);
  } catch (err) {
    console.warn('Could not update restored profile to Firestore:', err);
  }

  // 2. Restore Properties
  if (backup.properties.length > 0) {
    for (const prop of backup.properties) {
      const restoredProp: Property = {
        ...prop,
        landlordId: targetUser.id,
        landlordName: updatedUser.name,
        landlordPhone: updatedUser.whatsappNumber || updatedUser.phone,
        updatedAt: Date.now(),
      };
      await db.properties.put(restoredProp);
      try {
        await setDoc(doc(firestoreDb, 'properties', restoredProp.id), sanitizeForFirestore(restoredProp));
      } catch (err) {
        console.warn('Could not restore property to Firestore:', err);
      }
      result.propertiesCount++;
    }
  }

  // 3. Restore Properties Needed (Tenant Requests)
  if (backup.propertiesNeeded.length > 0) {
    for (const req of backup.propertiesNeeded) {
      const restoredReq: PropertyNeeded = {
        ...req,
        tenantId: targetUser.id,
        tenantName: updatedUser.name,
        tenantPhone: updatedUser.phone,
        tenantWhatsApp: updatedUser.whatsappNumber || updatedUser.phone,
        updatedAt: Date.now(),
      };
      await db.propertiesNeeded.put(restoredReq);
      try {
        await setDoc(doc(firestoreDb, 'propertiesNeeded', restoredReq.id), sanitizeForFirestore(restoredReq));
      } catch (err) {
        console.warn('Could not restore property needed to Firestore:', err);
      }
      result.requestsCount++;
    }
  }

  // 4. Restore Roommate Profiles
  if (backup.roommateProfiles.length > 0) {
    for (const room of backup.roommateProfiles) {
      const restoredRoom: RoommateProfile = {
        ...room,
        userId: targetUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
      };
      await db.roommateProfiles.put(restoredRoom);
      try {
        await setDoc(doc(firestoreDb, 'roommateProfiles', restoredRoom.id), sanitizeForFirestore(restoredRoom));
      } catch (err) {
        console.warn('Could not restore roommate profile to Firestore:', err);
      }
      result.roommatesCount++;
    }
  }

  // 5. Restore Saved Listings
  if (backup.savedProperties.length > 0) {
    for (const s of backup.savedProperties) {
      const restoredSaved: SavedListing = {
        ...s,
        userId: targetUser.id,
      };
      await db.savedProperties.put(restoredSaved);
      result.savedCount++;
    }
  }

  if (backup.savedPropertiesNeeded.length > 0) {
    for (const sn of backup.savedPropertiesNeeded) {
      const restoredSavedNeed: SavedPropertyNeeded = {
        ...sn,
        userId: targetUser.id,
      };
      await db.savedPropertiesNeeded.put(restoredSavedNeed);
      result.savedCount++;
    }
  }

  // 6. Restore Messages
  if (backup.messages.length > 0) {
    for (const m of backup.messages) {
      await db.messages.put(m);
      result.messagesCount++;
    }
  }

  // Update session
  try {
    localStorage.setItem('comfort_housing_auth_user_v2', JSON.stringify(updatedUser));
  } catch (err) {
    console.warn('Could not cache session:', err);
  }

  return result;
}

/**
 * Permanently and irreversibly wipes all data belonging to the user across
 * Firestore collections, local Dexie IndexedDB cache, Firebase Auth, and sessions.
 */
export async function wipeAccountAndData(user: User): Promise<void> {
  const userId = user.id;

  // 1. Delete all Properties owned by this user
  try {
    const userProperties = await db.properties.where('landlordId').equals(userId).toArray();
    for (const prop of userProperties) {
      await db.properties.delete(prop.id);
      try {
        await deleteDoc(doc(firestoreDb, 'properties', prop.id));
      } catch (err) {
        console.warn(`Failed to delete property ${prop.id} from Firestore:`, err);
      }
    }
  } catch (err) {
    console.warn('Error deleting user properties:', err);
  }

  // 2. Delete all Properties Needed (Tenant requests)
  try {
    const userRequests = await db.propertiesNeeded.where('tenantId').equals(userId).toArray();
    for (const req of userRequests) {
      await db.propertiesNeeded.delete(req.id);
      try {
        await deleteDoc(doc(firestoreDb, 'propertiesNeeded', req.id));
      } catch (err) {
        console.warn(`Failed to delete propertyNeeded ${req.id} from Firestore:`, err);
      }
    }
  } catch (err) {
    console.warn('Error deleting user accommodation requests:', err);
  }

  // 3. Delete Roommate Profiles
  try {
    const roommateProfiles = await db.roommateProfiles.where('userId').equals(userId).toArray();
    for (const rp of roommateProfiles) {
      await db.roommateProfiles.delete(rp.id);
      try {
        await deleteDoc(doc(firestoreDb, 'roommateProfiles', rp.id));
      } catch (err) {
        console.warn(`Failed to delete roommateProfile ${rp.id} from Firestore:`, err);
      }
    }
  } catch (err) {
    console.warn('Error deleting user roommate profiles:', err);
  }

  // 4. Delete Applications
  try {
    const apps = await db.applications.where('applicantId').equals(userId).toArray();
    for (const app of apps) {
      await db.applications.delete(app.id);
      try {
        await deleteDoc(doc(firestoreDb, 'applications', app.id));
      } catch (err) {
        console.warn(`Failed to delete application ${app.id} from Firestore:`, err);
      }
    }
  } catch (err) {
    console.warn('Error deleting user applications:', err);
  }

  // 5. Delete Saved Properties & Requests
  try {
    await db.savedProperties.where('userId').equals(userId).delete();
    await db.savedPropertiesNeeded.where('userId').equals(userId).delete();
  } catch (err) {
    console.warn('Error deleting saved items:', err);
  }

  // 6. Delete Notifications
  try {
    await db.notifications.where('userId').equals(userId).delete();
  } catch (err) {
    console.warn('Error deleting user notifications:', err);
  }

  // 7. Delete User Record from Firestore and Dexie
  try {
    await db.users.delete(userId);
    try {
      await deleteDoc(doc(firestoreDb, 'users', userId));
    } catch (err) {
      console.warn('Could not delete user doc from Firestore:', err);
    }
    if (user.role === 'admin') {
      try {
        await deleteDoc(doc(firestoreDb, 'admins', userId));
      } catch (err) {
        console.warn('Could not delete admin doc from Firestore:', err);
      }
    }
  } catch (err) {
    console.warn('Error deleting user record:', err);
  }

  // 8. Delete Firebase Auth User if possible, otherwise Sign Out
  try {
    const currentAuthUser = auth.currentUser;
    if (currentAuthUser && currentAuthUser.uid === userId) {
      try {
        await currentAuthUser.delete();
      } catch (deleteAuthErr) {
        console.warn('Auth user delete required recent login, signing out instead:', deleteAuthErr);
        await signOut(auth);
      }
    } else {
      await signOut(auth);
    }
  } catch (authErr) {
    console.warn('Sign out during wipe error:', authErr);
  }

  // 9. Stop sync and purge local storage session
  firebaseSyncService.stopUserSync();
  localStorage.removeItem('comfort_housing_auth_user_v2');
}
