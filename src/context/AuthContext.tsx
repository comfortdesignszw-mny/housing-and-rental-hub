import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { db } from '../db/db';
import { SEED_USERS } from '../db/seedData';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isGuest: boolean;
  switchUserRole: (newRole: UserRole) => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  loginWithEmail: (email: string) => Promise<boolean>;
  loginWithPhone: (phone: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  signup: (name: string, email: string, phone: string, role: UserRole) => Promise<boolean>;
  updateUserProfile: (userUpdates: Partial<User>) => Promise<void>;
  createNewUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  allDemoUsers: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_SESSION_KEY = 'comfort_hub_active_user_id';

export const GUEST_USER: User = {
  id: 'user_guest',
  name: 'Guest Explorer',
  email: 'guest@comfort.zw',
  phone: '',
  whatsappNumber: '',
  role: 'guest',
  verified: false,
  createdAt: 0,
  bio: 'Browsing rentals and properties in Guest mode with read-only permissions.',
  city: 'Harare',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allDemoUsers, setAllDemoUsers] = useState<User[]>(SEED_USERS);

  // Initialize offline session from localStorage
  useEffect(() => {
    async function loadSession() {
      try {
        const storedUserId = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (storedUserId === 'user_guest') {
          setCurrentUser(GUEST_USER);
          return;
        }
        if (storedUserId) {
          const user = await db.users.get(storedUserId);
          if (user) {
            setCurrentUser(user);
            return;
          }
        }
        // Default to the first seed tenant or landlord if no prior session
        const defaultUser = (await db.users.get('user_tenant_1')) || SEED_USERS[1];
        if (defaultUser) {
          setCurrentUser(defaultUser);
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, defaultUser.id);
        }
      } catch (err) {
        console.error('Error loading offline auth session:', err);
        setCurrentUser(SEED_USERS[1]);
      }
    }

    loadSession();
  }, []);

  // Keep demo users updated from DB
  useEffect(() => {
    async function refreshUsers() {
      try {
        const users = await db.users.toArray();
        if (users.length > 0) {
          setAllDemoUsers(users);
        }
      } catch (e) {
        // use fallback seed
      }
    }
    refreshUsers();
  }, [currentUser]);

  const switchUser = async (userId: string) => {
    const user = await db.users.get(userId) || SEED_USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, user.id);
    }
  };

  const switchUserRole = async (newRole: UserRole) => {
    // Find an existing user with this role or update current user
    const match = allDemoUsers.find(u => u.role === newRole);
    if (match) {
      await switchUser(match.id);
    } else if (currentUser) {
      const updated: User = { ...currentUser, role: newRole };
      await db.users.put(updated);
      setCurrentUser(updated);
    }
  };

  const loginWithEmail = async (email: string): Promise<boolean> => {
    const found = await db.users.where('email').equalsIgnoreCase(email).first();
    if (found) {
      setCurrentUser(found);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, found.id);
      return true;
    }
    // Auto-create or login with simple credential
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: email.split('@')[0],
      email,
      phone: '+263 77 ' + Math.floor(100000 + Math.random() * 900000),
      role: 'tenant',
      verified: true,
      createdAt: Date.now(),
      city: 'Harare',
    };
    await db.users.add(newUser);
    setCurrentUser(newUser);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, newUser.id);
    return true;
  };

  const loginWithPhone = async (phone: string): Promise<boolean> => {
    const found = await db.users.where('phone').equals(phone).first();
    if (found) {
      setCurrentUser(found);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, found.id);
      return true;
    }
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: `User ${phone.slice(-4)}`,
      email: `user_${phone.replace(/\D/g, '')}@comfort.zw`,
      phone,
      role: 'tenant',
      verified: true,
      createdAt: Date.now(),
      city: 'Harare',
    };
    await db.users.add(newUser);
    setCurrentUser(newUser);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, newUser.id);
    return true;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    // Offline-safe instant Google SSO simulation
    const googleUser: User = {
      id: 'user_google_sso',
      name: 'Simba Munetsi',
      email: 'simba.munetsi@gmail.com',
      phone: '+263 77 912 3456',
      role: 'tenant',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      verified: true,
      createdAt: Date.now(),
      city: 'Harare',
    };
    await db.users.put(googleUser);
    setCurrentUser(googleUser);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, googleUser.id);
    return true;
  };

  const signup = async (
    name: string,
    email: string,
    phone: string,
    role: UserRole
  ): Promise<boolean> => {
    const newUser: User = {
      id: `user_${Date.now()}`,
      name,
      email,
      phone,
      role,
      verified: true,
      createdAt: Date.now(),
      city: 'Harare',
    };
    await db.users.add(newUser);
    setCurrentUser(newUser);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, newUser.id);
    return true;
  };

  const updateUserProfile = async (userUpdates: Partial<User>) => {
    if (!currentUser) return;
    const updated: User = {
      ...currentUser,
      ...userUpdates,
    };
    if (updated.id !== 'user_guest') {
      await db.users.put(updated);
    }
    setCurrentUser(updated);
  };

  const createNewUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}`,
      createdAt: Date.now(),
    };
    await db.users.add(newUser);
    setAllDemoUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, newUser.id);
    return newUser;
  };

  const deleteUser = async (userId: string) => {
    if (userId === 'user_guest') return;
    await db.users.delete(userId);
    setAllDemoUsers(prev => prev.filter(u => u.id !== userId));
    if (currentUser?.id === userId) {
      // Fallback to first remaining or default
      const remaining = allDemoUsers.filter(u => u.id !== userId);
      if (remaining.length > 0) {
        await switchUser(remaining[0].id);
      } else {
        loginAsGuest();
      }
    }
  };

  const loginAsGuest = () => {
    setCurrentUser(GUEST_USER);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, 'user_guest');
  };

  const logout = () => {
    loginAsGuest();
  };

  const isGuest = !currentUser || currentUser.role === 'guest' || currentUser.id === 'user_guest';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || 'guest',
        isAuthenticated: !!currentUser && !isGuest,
        isGuest,
        switchUserRole,
        switchUser,
        loginWithEmail,
        loginWithPhone,
        loginWithGoogle,
        signup,
        updateUserProfile,
        createNewUser,
        deleteUser,
        loginAsGuest,
        logout,
        allDemoUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
