/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initializeDatabase } from './db/db';
import { Header } from './components/common/Header';
import { Navigation, NavTab } from './components/common/Navigation';
import { OfflineBanner } from './components/common/OfflineBanner';
import { PropertyList } from './components/listings/PropertyList';
import { CreateListingModal } from './components/listings/CreateListingModal';
import { RoommateHub } from './components/roommates/RoommateHub';
import { LandlordDashboard } from './components/landlord/LandlordDashboard';
import { MessagingHub } from './components/messages/MessagingHub';
import { NotificationsDrawer } from './components/notifications/NotificationsDrawer';
import { UserProfile } from './components/profile/UserProfile';
import { AuthModal } from './components/common/AuthModal';

function MainAppContent() {
  const { isGuest } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('listings');
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Cross-component direct chat state
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null);
  const [chatRecipientName, setChatRecipientName] = useState<string | null>(null);
  const [chatPropertyId, setChatPropertyId] = useState<string | null>(null);

  const handleStartChat = (
    recipientId: string,
    recipientName: string,
    propertyId?: string
  ) => {
    if (isGuest) {
      setShowAuthModal(true);
      return;
    }
    setChatRecipientId(recipientId);
    setChatRecipientName(recipientName);
    setChatPropertyId(propertyId || null);
    setCurrentTab('messages');
  };

  const handleOpenCreateListing = () => {
    if (isGuest) {
      setShowAuthModal(true);
      return;
    }
    setShowCreateListing(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-20 md:pb-8">
      {/* Offline Status & Sync Queue Banner */}
      <OfflineBanner />

      {/* Main App Bar Header */}
      <Header
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenCreateListing={handleOpenCreateListing}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />

      {/* Desktop Navigation Tabs */}
      <Navigation
        currentTab={currentTab}
        onTabChange={tab => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'listings' && (
          <PropertyList
            onOpenCreateListing={handleOpenCreateListing}
            onStartChat={handleStartChat}
          />
        )}

        {currentTab === 'roommates' && (
          <RoommateHub onStartChat={handleStartChat} />
        )}

        {currentTab === 'landlord' && (
          <LandlordDashboard
            onOpenCreateListing={handleOpenCreateListing}
            onStartChat={handleStartChat}
          />
        )}

        {currentTab === 'messages' && (
          <MessagingHub
            initialRecipientId={chatRecipientId}
            initialRecipientName={chatRecipientName}
            initialPropertyId={chatPropertyId}
            onClearInitial={() => {
              setChatRecipientId(null);
              setChatRecipientName(null);
            }}
          />
        )}

        {currentTab === 'profile' && (
          <UserProfile onOpenAuthModal={() => setShowAuthModal(true)} />
        )}
      </main>

      {/* Create Listing Modal */}
      {showCreateListing && (
        <CreateListingModal
          onClose={() => setShowCreateListing(false)}
          onCreated={() => {
            setCurrentTab('listings');
          }}
        />
      )}

      {/* In-App Notifications Drawer */}
      <NotificationsDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

export default function App() {
  // Initialize local offline database on startup
  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
