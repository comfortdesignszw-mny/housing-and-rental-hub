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
import { CreatePropertyNeededModal } from './components/tenants/CreatePropertyNeededModal';
import { Footer } from './components/common/Footer';
import { TermsOfServiceModal } from './components/legal/TermsOfServiceModal';
import { PrivacyPolicyModal } from './components/legal/PrivacyPolicyModal';
import { RenewalTermsModal } from './components/legal/RenewalTermsModal';
import { CopyrightAgentModal } from './components/legal/CopyrightAgentModal';

function MainAppContent() {
  const { isGuest } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('listings');
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showCreatePropertyNeeded, setShowCreatePropertyNeeded] = useState(false);
  const [landlordSubTab, setLandlordSubTab] = useState<string | undefined>(undefined);
  const [highlightedOfferId, setHighlightedOfferId] = useState<string | undefined>(undefined);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showRenewalTerms, setShowRenewalTerms] = useState(false);
  const [showCopyrightAgent, setShowCopyrightAgent] = useState(false);

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

  const handleOpenCreatePropertyNeeded = () => {
    if (isGuest) {
      setShowAuthModal(true);
      return;
    }
    setShowCreatePropertyNeeded(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-20 md:pb-8">
      {/* Offline Status & Sync Queue Banner */}
      <OfflineBanner />

      {/* Main App Bar Header */}
      <Header
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenCreateListing={handleOpenCreateListing}
        onOpenCreatePropertyNeeded={handleOpenCreatePropertyNeeded}
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
            onOpenCreatePropertyNeeded={handleOpenCreatePropertyNeeded}
            onStartChat={handleStartChat}
          />
        )}

        {currentTab === 'roommates' && (
          <RoommateHub onStartChat={handleStartChat} />
        )}

        {currentTab === 'landlord' && !isGuest && (
          <LandlordDashboard
            initialSubTab={landlordSubTab}
            highlightedOfferId={highlightedOfferId}
            onOpenCreateListing={handleOpenCreateListing}
            onOpenCreatePropertyNeeded={handleOpenCreatePropertyNeeded}
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
            onNavigateToListings={() => setCurrentTab('listings')}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}

        {currentTab === 'profile' && (
          <UserProfile
            onOpenAuthModal={() => setShowAuthModal(true)}
            onOpenCreatePropertyNeeded={handleOpenCreatePropertyNeeded}
          />
        )}
      </main>

      {/* App Footer with Legal Links, Copyright and Brand Statement */}
      <Footer
        onNavigateTab={tab => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenTerms={() => setShowTerms(true)}
        onOpenPrivacy={() => setShowPrivacy(true)}
        onOpenRenewalTerms={() => setShowRenewalTerms(true)}
        onOpenCopyrightAgent={() => setShowCopyrightAgent(true)}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Create Listing Modal */}
      {showCreateListing && (
        <CreateListingModal
          onClose={() => setShowCreateListing(false)}
          onCreated={() => {
            setCurrentTab('listings');
          }}
        />
      )}

      {/* Create Rental Property Needed Modal (Tenant Request) */}
      {showCreatePropertyNeeded && (
        <CreatePropertyNeededModal
          isOpen={showCreatePropertyNeeded}
          onClose={() => setShowCreatePropertyNeeded(false)}
          onCreated={() => {
            setCurrentTab('listings');
          }}
        />
      )}

      {/* In-App Notifications Drawer */}
      <NotificationsDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onSelectAction={(url) => {
          setShowNotifications(false);
          if (url?.startsWith('messages')) {
            const queryPart = url.includes('?') ? url.split('?')[1] : '';
            const params = new URLSearchParams(queryPart);
            const userId = params.get('user');
            const userName = params.get('name') || 'User';
            if (userId) {
              handleStartChat(userId, decodeURIComponent(userName));
            } else {
              setCurrentTab('messages');
            }
          } else if (url?.startsWith('landlord')) {
            const queryPart = url.includes('?') ? url.split('?')[1] : '';
            const params = new URLSearchParams(queryPart);
            const tab = params.get('tab');
            const offerId = params.get('offerId');
            if (tab) {
              setLandlordSubTab(tab);
            }
            if (offerId) {
              setHighlightedOfferId(offerId);
            }
            setCurrentTab('landlord');
          } else if (url?.startsWith('listings')) {
            setCurrentTab('listings');
          }
        }}
      />

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={() => {
          setCurrentTab('profile');
        }}
      />

      {/* Terms of Service Legal Modal */}
      {showTerms && (
        <TermsOfServiceModal
          isOpen={showTerms}
          onClose={() => setShowTerms(false)}
        />
      )}

      {/* Privacy Policy Legal Modal */}
      {showPrivacy && (
        <PrivacyPolicyModal
          isOpen={showPrivacy}
          onClose={() => setShowPrivacy(false)}
        />
      )}

      {/* Pro Subscription Renewal Terms Modal */}
      {showRenewalTerms && (
        <RenewalTermsModal
          isOpen={showRenewalTerms}
          onClose={() => setShowRenewalTerms(false)}
        />
      )}

      {/* DMCA Copyright Agent Modal */}
      {showCopyrightAgent && (
        <CopyrightAgentModal
          isOpen={showCopyrightAgent}
          onClose={() => setShowCopyrightAgent(false)}
        />
      )}
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
