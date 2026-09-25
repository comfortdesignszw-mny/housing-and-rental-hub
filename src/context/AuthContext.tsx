import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  limit,
} from 'firebase/firestore';
import { auth, db as firestoreDb, handleFirestoreError, OperationType } from '../db/firebase';
import { db as dexieDb } from '../db/db';
import { User, UserRole } from '../types';
import { firebaseSyncService } from '../services/firebaseSync';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  loginWithEmail: (email: string, password?: string) => Promise<boolean>;
  signupWithEmail: (name: string, email: string, password?: string, role?: UserRole, phone?: string) => Promise<boolean>;
  updateUserProfile: (userUpdates: Partial<User>) => Promise<void>;
  updateUserRoleByAdmin: (targetUserId: string, newRole: UserRole) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  allRegisteredUsers: User[];
  refreshRegisteredUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_KEY = 'comfort_hub_auth_user';
const ADMIN_BOOTSTRAP_EMAIL = 'comfort.designszw@gmail.com';

export const GUEST_USER: User = {
  id: 'guest_explorer',
  name: 'Guest Explorer',
  email: 'guest@comfort.zw',
  phone: '',
  whatsappNumber: '',
  role: 'guest',
  verified: false,
  createdAt: 0,
  bio: 'Browsing rentals and properties in Guest mode. Sign in to post listings or apply.',
  city: 'Harare',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<User[]>([]);

  // Fast offline session recovery on boot
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_SESSION_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as User;
        setCurrentUser(parsed);
      }
    } catch (err) {
      console.warn('Could not read cached session:', err);
    }
  }, []);

  const refreshRegisteredUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setAllRegisteredUsers([]);
      return;
    }
    try {
      const usersSnap = await getDocs(collection(firestoreDb, 'users'));
      const list: User[] = [];
      usersSnap.forEach(d => list.push(d.data() as User));
      setAllRegisteredUsers(list);
      await dexieDb.users.bulkPut(list);
    } catch (err) {
      console.warn('Could not load all users from online, falling back to local cache:', err);
      const local = await dexieDb.users.toArray();
      setAllRegisteredUsers(local);
    }
  }, [currentUser]);

  // Sync users when admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      refreshRegisteredUsers();
    }
  }, [currentUser?.role, refreshRegisteredUsers]);

  // Online/Offline queue processor listener
  useEffect(() => {
    const handleOnline = () => {
      firebaseSyncService.processOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const userDocRef = doc(firestoreDb, 'users', fbUser.uid);
          let userProfile: User | null = null;

          try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              userProfile = userSnap.data() as User;
            }
          } catch (e) {
            console.warn('Network read error, checking local cache:', e);
            userProfile = (await dexieDb.users.get(fbUser.uid)) || null;
          }

          // If no user profile exists, create on first signup
          if (!userProfile) {
            // Check if this is the very first user or the bootstrap email
            let isFirstUser = false;
            try {
              const allUsersSnapshot = await getDocs(queryDocLimitOne());
              if (allUsersSnapshot.empty) {
                isFirstUser = true;
              }
            } catch (e) {
              console.warn('Check first user count failed:', e);
            }

            const shouldBeAdmin =
              isFirstUser ||
              (fbUser.email && fbUser.email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase());

            const assignedRole: UserRole = shouldBeAdmin ? 'admin' : 'tenant';

            userProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Comfort Resident',
              email: fbUser.email || '',
              phone: fbUser.phoneNumber || '+263 77 ',
              whatsappNumber: fbUser.phoneNumber || '+263 77 ',
              role: assignedRole,
              avatar: fbUser.photoURL || undefined,
              verified: fbUser.emailVerified || false,
              createdAt: Date.now(),
              bio: shouldBeAdmin
                ? 'System Administrator - Overseeing Zimbabwe properties, verifications, and platform governance.'
                : 'Zimbabwe renter and resident exploring secure accommodation.',
              city: 'Harare',
            };

            await setDoc(userDocRef, userProfile);

            if (shouldBeAdmin) {
              await setDoc(doc(firestoreDb, 'admins', fbUser.uid), {
                uid: fbUser.uid,
                email: fbUser.email,
                createdAt: Date.now(),
              });
            }
          } else {
            // Check if existing user email is the bootstrap admin email but not marked admin
            if (
              fbUser.email &&
              fbUser.email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase() &&
              userProfile.role !== 'admin'
            ) {
              userProfile.role = 'admin';
              await updateDoc(userDocRef, { role: 'admin' });
              await setDoc(doc(firestoreDb, 'admins', fbUser.uid), {
                uid: fbUser.uid,
                email: fbUser.email,
                createdAt: Date.now(),
              });
            }
          }

          // Cache in Dexie & LocalStorage
          await dexieDb.users.put(userProfile);
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(userProfile));
          setCurrentUser(userProfile);

          // Start live sync
          firebaseSyncService.startSync(userProfile.id, userProfile.role === 'admin');
        } catch (err) {
          console.error('Error hydrating user profile from Firebase:', err);
        }
      } else {
        // No authenticated Firebase user
        firebaseSyncService.stopSync();
        // If there was no prior cached session, switch to guest
        const cached = localStorage.getItem(LOCAL_SESSION_KEY);
        if (!cached || cached === JSON.stringify(GUEST_USER)) {
          setCurrentUser(GUEST_USER);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      return true;
    } catch (err) {
      console.error('Google Sign In Error:', err);
      return false;
    }
  };

  const loginWithEmail = async (email: string, password = 'Password@123'): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err: any) {
      // If user not found, auto-register seamless credential
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          return true;
        } catch (signupErr) {
          console.error('Sign in/up error:', signupErr);
          return false;
        }
      }
      console.error('Email login error:', err);
      return false;
    }
  };

  const signupWithEmail = async (
    name: string,
    email: string,
    password = 'Password@123',
    role: UserRole = 'tenant',
    phone = '+263 77 '
  ): Promise<boolean> => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Check if bootstrap email
      const isBootstrapAdmin = email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase();
      const finalRole = isBootstrapAdmin ? 'admin' : role;

      const newUser: User = {
        id: uid,
        name,
        email,
        phone,
        whatsappNumber: phone,
        role: finalRole,
        verified: cred.user.emailVerified,
        createdAt: Date.now(),
        city: 'Harare',
        bio: `${finalRole.replace('_', ' ')} active in Zimbabwe real estate.`,
      };

      await setDoc(doc(firestoreDb, 'users', uid), newUser);
      if (finalRole === 'admin') {
        await setDoc(doc(firestoreDb, 'admins', uid), {
          uid,
          email,
          createdAt: Date.now(),
        });
      }

      await dexieDb.users.put(newUser);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newUser));
      setCurrentUser(newUser);
      return true;
    } catch (err: any) {
      // If already in use, try logging in
      if (err.code === 'auth/email-already-in-use') {
        return loginWithEmail(email, password);
      }
      console.error('Signup error:', err);
      return false;
    }
  };

  const updateUserProfile = async (userUpdates: Partial<User>) => {
    if (!currentUser || currentUser.id === 'guest_explorer') return;

    const updated: User = {
      ...currentUser,
      ...userUpdates,
      id: currentUser.id, // Preserve ID
      createdAt: currentUser.createdAt, // Preserve creation timestamp
    };

    // If non-admin tries to change role, keep existing role
    if (currentUser.role !== 'admin' && userUpdates.role && userUpdates.role !== currentUser.role) {
      updated.role = currentUser.role;
    }

    try {
      await updateDoc(doc(firestoreDb, 'users', currentUser.id), {
        name: updated.name,
        phone: updated.phone,
        whatsappNumber: updated.whatsappNumber || updated.phone,
        bio: updated.bio || '',
        city: updated.city || 'Harare',
        avatar: updated.avatar || '',
      });
    } catch (err) {
      console.warn('Network update failed, saved locally:', err);
    }

    await dexieDb.users.put(updated);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updated));
    setCurrentUser(updated);
  };

  const updateUserRoleByAdmin = async (targetUserId: string, newRole: UserRole) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only an Administrator can change user roles.');
    }

    try {
      await updateDoc(doc(firestoreDb, 'users', targetUserId), {
        role: newRole,
      });

      if (newRole === 'admin') {
        await setDoc(doc(firestoreDb, 'admins', targetUserId), {
          uid: targetUserId,
          createdAt: Date.now(),
        });
      } else {
        // Remove from admins collection if demoted
        try {
          const adminDocRef = doc(firestoreDb, 'admins', targetUserId);
          const adminSnap = await getDoc(adminDocRef);
          if (adminSnap.exists()) {
            // Set role non-admin or delete
          }
        } catch (e) {
          // ignore
        }
      }

      // Update in local Dexie
      const target = await dexieDb.users.get(targetUserId);
      if (target) {
        target.role = newRole;
        await dexieDb.users.put(target);
      }

      await refreshRegisteredUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
    }
  };

  const loginAsGuest = () => {
    setCurrentUser(GUEST_USER);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(GUEST_USER));
    firebaseSyncService.stopSync();
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut warning:', e);
    }
    loginAsGuest();
  };

  const isGuest = !currentUser || currentUser.role === 'guest' || currentUser.id === 'guest_explorer';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || 'guest',
        isAdmin,
        isAuthenticated: !!currentUser && !isGuest,
        isGuest,
        isLoading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        updateUserProfile,
        updateUserRoleByAdmin,
        loginAsGuest,
        logout,
        allRegisteredUsers,
        refreshRegisteredUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

function queryDocLimitOne() {
  return collection(firestoreDb, 'users');
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
