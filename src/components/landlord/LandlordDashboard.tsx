import React, { useState } from 'react';
import { Property, Tenant, RentPayment, RentalApplication } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { TenantManagement } from './TenantManagement';
import { RentCollection } from './RentCollection';
import { LeaseManagement } from './LeaseManagement';
import { MaintenanceTracker } from './MaintenanceTracker';
import { CreateListingModal } from '../listings/CreateListingModal';
import { PropertyDetails } from '../listings/PropertyDetails';
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  FileText,
  TrendingUp,
  AlertCircle,
  Plus,
  CheckCircle2,
  Edit3,
  Trash2,
  Eye,
  Star,
  Clock,
  Check,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  CheckCircle,
} from 'lucide-react';

interface LandlordDashboardProps {
  onOpenCreateListing: () => void;
  onStartChat: (recipientId: string, recipientName: string) => void;
}

export const LandlordDashboard: React.FC<LandlordDashboardProps> = ({
  onOpenCreateListing,
  onStartChat,
}) => {
  const { currentUser, role, isGuest, switchUserRole } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'properties' | 'applications' | 'tenants' | 'rent' | 'leases' | 'maintenance'
  >('overview');

  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [previewingProperty, setPreviewingProperty] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string; name: string } | null>(null);
  const [dashboardNotice, setDashboardNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setDashboardNotice(msg);
    setTimeout(() => setDashboardNotice(null), 4000);
  };

  // Load properties
  const properties: Property[] =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.properties.where('landlordId').equals(currentUser.id).toArray();
      },
      [currentUser?.id],
      []
    ) || [];

  // Load applications for landlord properties
  const applications: RentalApplication[] =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.applications
          .where('landlordId')
          .equals(currentUser.id)
          .reverse()
          .sortBy('appliedAt');
      },
      [currentUser?.id],
      []
    ) || [];

  // Load tenants
  const tenants: Tenant[] =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.tenants.where('landlordId').equals(currentUser.id).toArray();
      },
      [currentUser?.id],
      []
    ) || [];

  // Load payments
  const payments: RentPayment[] =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.rentPayments.where('landlordId').equals(currentUser.id).toArray();
      },
      [currentUser?.id],
      []
    ) || [];

  // Load maintenance
  const openMaintenance: number =
    useLiveQuery(
      async () => {
        if (!currentUser) return 0;
        return db.maintenanceRequests
          .where('landlordId')
          .equals(currentUser.id)
          .filter(m => m.status !== 'resolved' && m.status !== 'closed')
          .count();
      },
      [currentUser?.id],
      0
    ) || 0;

  // Real stats calculations
  const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
  const ratedProperties = properties.filter(p => (p.ratingCount || 0) > 0);
  const avgRating =
    ratedProperties.length > 0
      ? (
          ratedProperties.reduce((sum, p) => sum + (p.rating || 0), 0) /
          ratedProperties.length
        ).toFixed(1)
      : '5.0';

  // Revenue metrics
  const monthlyRevenueExpected = tenants.reduce((sum, t) => sum + t.rentAmount, 0);
  const monthlyRevenueCollected = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const occupancyRate =
    properties.length > 0
      ? Math.min(100, Math.round((tenants.length / Math.max(1, properties.length * 2)) * 100))
      : 100;

  const isTenantView = role === 'tenant';

  // One-tap toggle Taken / Occupied (24hr countdown)
  const handleToggleOccupied = async (property: Property) => {
    if (property.availability === 'Occupied') {
      await db.properties.update(property.id, {
        availability: 'Immediate',
        occupiedAt: undefined,
        updatedAt: Date.now(),
      });
      showNotice(`"${property.name}" is now marked Available and active in public search.`);
    } else {
      const now = Date.now();
      await db.properties.update(property.id, {
        availability: 'Occupied',
        occupiedAt: now,
        updatedAt: now,
      });
      showNotice(
        `"${property.name}" marked Taken/Occupied. It will remain visible for 24 hours then automatically disappear from public search.`
      );
    }
  };

  const getTakenStatus = (property: Property) => {
    if (property.availability !== 'Occupied' || !property.occupiedAt) {
      return null;
    }
    const elapsed = Date.now() - property.occupiedAt;
    const remainingMs = 24 * 60 * 60 * 1000 - elapsed;
    if (remainingMs <= 0) {
      return {
        isExpired: true,
        text: 'Expired from Public Search (>24h)',
      };
    }
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      isExpired: false,
      text: `Taken • Disappears in ${hours}h ${mins}m`,
    };
  };

  const confirmDeleteProperty = async () => {
    if (!propertyToDelete) return;
    const id = propertyToDelete.id;
    const name = propertyToDelete.name;

    await db.properties.delete(id);
    await db.savedProperties.where('propertyId').equals(id).delete();
    await db.applications.where('propertyId').equals(id).delete();

    showNotice(`Property "${name}" has been permanently deleted.`);
    setPropertyToDelete(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* Toast Notice */}
      {dashboardNotice && (
        <div className="bg-emerald-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-in fade-in duration-200">
          <span>{dashboardNotice}</span>
          <button
            onClick={() => setDashboardNotice(null)}
            className="text-emerald-200 hover:text-white ml-2 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {isGuest ? 'Guest View Mode' : isTenantView ? 'Tenant Portal' : 'Property Management Suite'}
          </span>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            {isTenantView ? 'My Tenancy & Accommodation' : 'Landlord Management Hub'}
          </h1>
          <p className="text-xs text-slate-500">
            {isGuest
              ? 'Guest access is read-only. Guests are permitted to apply for rentals; listing management is restricted to registered landlords.'
              : isTenantView
              ? 'View your rent receipts, submit repair tickets, and inspect lease terms offline.'
              : 'Full CRUD management: Create, read, update, delete, one-tap mark taken (24h visibility), and real-time view tracking.'}
          </p>
        </div>

        {!isTenantView && !isGuest && (
          <button
            onClick={onOpenCreateListing}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Property Listing</span>
          </button>
        )}
      </div>

      {/* Guest Mode Restriction Notice Banner */}
      {isGuest && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <h4 className="font-bold text-amber-900">Guest Browsing Active (Strict Permissions)</h4>
            <p className="text-amber-800 text-[11px] mt-0.5">
              You are exploring without an account with read-only permissions. You can view all listings and apply for rentals freely. To manage properties, leases, or tenancies, switch to a Landlord account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => switchUserRole('landlord')}
            className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            Switch to Landlord Account
          </button>
        </div>
      )}

      {/* KPI Cards (Landlord / Manager view) with Real Views & Ratings Stats */}
      {!isTenantView && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Properties / Units
              </span>
              <Building2 className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-xl font-black text-slate-900 mt-1">
              {properties.length}{' '}
              <span className="text-xs text-slate-400 font-normal">Managed</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {tenants.length} occupied units
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Real Stats: Views
              </span>
              <Eye className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-black text-blue-800 mt-1">
              {totalViews}{' '}
              <span className="text-xs text-slate-400 font-normal">Real Views</span>
            </p>
            <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
              Across all your listings
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Average Rating
              </span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            </div>
            <p className="text-xl font-black text-amber-700 mt-1">
              {avgRating} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
            </p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
              Tenant verified ratings
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Monthly Expected
              </span>
              <DollarSign className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-xl font-black text-slate-900 mt-1">
              ${monthlyRevenueExpected}{' '}
              <span className="text-xs text-slate-400 font-normal">USD</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ${monthlyRevenueCollected} collected
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Applications
              </span>
              <FileText className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-800 mt-1">
              {applications.length}{' '}
              <span className="text-xs text-slate-400 font-normal">Received</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {openMaintenance} open repair tickets
            </p>
          </div>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex-1 min-w-[85px] py-2 text-xs font-bold rounded-xl transition text-center cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Overview
        </button>

        {!isTenantView && (
          <button
            onClick={() => setActiveSubTab('properties')}
            className={`flex-1 min-w-[125px] py-2 text-xs font-bold rounded-xl transition text-center cursor-pointer ${
              activeSubTab === 'properties'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Listings ({properties.length})
          </button>
        )}

        {!isTenantView && (
          <button
            onClick={() => setActiveSubTab('applications')}
            className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-xl transition text-center cursor-pointer ${
              activeSubTab === 'applications'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Applications ({applications.length})
          </button>
        )}

        {!isTenantView && (
          <button
            onClick={() => setActiveSubTab('tenants')}
            className={`flex-1 min-w-[85px] py-2 text-xs font-bold rounded-xl transition text-center cursor-pointer ${
              activeSubTab === 'tenants'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tenants ({tenants.length})
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('rent')}
          className={`flex-1 min-w-[110px] py-2 text-xs font-bold rounded-xl transition text-center cursor-pointer ${
            activeSubTab === 'rent'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Rent & Receipts
        </button>

        <button
          onClick={() => setActiveSubTab('leases')}
          className={`flex-1 min-w-[85px] py-2 text-xs font-bold rounded-xl transition text-center cursor-pointer ${
            activeSubTab === 'leases'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Leases
        </button>

        <button
          onClick={() => setActiveSubTab('maintenance')}
          className={`flex-1 min-w-[95px] py-2 text-xs font-bold rounded-xl transition text-center cursor-pointer ${
            activeSubTab === 'maintenance'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Repairs ({openMaintenance})
        </button>
      </div>

      {/* Subtab Contents */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          {/* Quick Properties Overview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Managed Properties ({properties.length})
              </h3>
              {!isTenantView && (
                <button
                  onClick={() => setActiveSubTab('properties')}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Manage Listings (Full CRUD) →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {properties.slice(0, 4).map(p => (
                <div
                  key={p.id}
                  onClick={() => setPreviewingProperty(p)}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  <img
                    src={p.photos[0]}
                    alt={p.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs truncate">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {p.suburb}, {p.city} • ${p.rentUsd} {p.rentBasis ? `(${p.rentBasis})` : '/mo'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        {p.availability}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                        <Eye className="w-3 h-3 text-slate-400" /> {p.views || 0} views
                      </span>
                      <span className="text-[10px] text-amber-700 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {p.rating || 5.0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Quick Rental Management Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => setActiveSubTab('properties')}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition cursor-pointer"
              >
                <Building2 className="w-5 h-5 text-emerald-700 mb-1" />
                <strong className="block text-slate-900">Manage Properties (CRUD)</strong>
                <span className="text-slate-500 text-[11px]">
                  Add, edit, delete, mark taken (24h countdown), track views
                </span>
              </button>

              <button
                onClick={() => setActiveSubTab('applications')}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition cursor-pointer"
              >
                <FileText className="w-5 h-5 text-emerald-700 mb-1" />
                <strong className="block text-slate-900">Rental Applications</strong>
                <span className="text-slate-500 text-[11px]">
                  View tenant applications with move-in dates & WhatsApp replies
                </span>
              </button>

              <button
                onClick={() => setActiveSubTab('rent')}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition cursor-pointer"
              >
                <DollarSign className="w-5 h-5 text-emerald-700 mb-1" />
                <strong className="block text-slate-900">Record Rent Payment</strong>
                <span className="text-slate-500 text-[11px]">
                  Generate official EcoCash, USD Cash or InnBucks receipts
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtab: Properties Full CRUD View */}
      {activeSubTab === 'properties' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Your Property Listings & Inventory ({properties.length})
              </h3>
              <p className="text-xs text-slate-500">
                Full CRUD control: Create listings, update details, delete, mark taken/occupied with 24h automatic countdown, and inspect real views and ratings.
              </p>
            </div>
            <button
              onClick={onOpenCreateListing}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Property</span>
            </button>
          </div>

          {properties.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No Property Listings Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Advertise your house, flat, cottage, or room to prospective tenants in Zimbabwe. Works 100% offline!
              </p>
              <button
                onClick={onOpenCreateListing}
                className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition cursor-pointer"
              >
                Create First Listing
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {properties.map(property => {
                const isOccupied = property.availability === 'Occupied';
                const takenInfo = getTakenStatus(property);

                return (
                  <div
                    key={property.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                      <img
                        src={property.photos[0]}
                        alt={property.name}
                        onClick={() => setPreviewingProperty(property)}
                        className="w-20 h-20 rounded-xl object-cover shrink-0 cursor-pointer hover:opacity-90 transition"
                        title="Click to view details"
                      />

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            onClick={() => setPreviewingProperty(property)}
                            className="font-extrabold text-slate-900 text-sm hover:text-emerald-700 cursor-pointer transition truncate"
                          >
                            {property.name}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                            {property.propertyType}
                          </span>
                          {property.roomsAvailable !== undefined && property.roomsAvailable > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 font-semibold border border-sky-200">
                              {property.roomsAvailable} Rooms Open
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOccupied
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOccupied ? 'TAKEN / OCCUPIED' : 'AVAILABLE'}
                          </span>
                          {takenInfo && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                takenInfo.isExpired
                                  ? 'bg-slate-100 text-slate-600 border-slate-300'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              }`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              {takenInfo.text}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500">
                          {property.address} • {property.suburb}, {property.city}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs pt-0.5">
                          <span className="font-extrabold text-slate-900">
                            ${property.rentUsd}{' '}
                            <span className="text-slate-500 text-[11px] font-normal">
                              {property.rentBasis || '/month'}
                            </span>
                          </span>

                          <span className="text-slate-600 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-semibold text-slate-800">{property.views || 0}</span> real views
                          </span>

                          <span className="text-amber-800 flex items-center gap-1 font-semibold">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            <span>{property.rating || 5.0} ({property.ratingCount || 1} ratings)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Landlord Action Buttons - Full CRUD */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      {/* One-tap Taken / Occupied Button */}
                      <button
                        onClick={() => handleToggleOccupied(property)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                          isOccupied
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                        title={
                          isOccupied
                            ? 'Make this listing available again on public search'
                            : 'Mark as taken. It will remain visible for 24h then disappear from listings'
                        }
                      >
                        {isOccupied ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Mark Available</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Taken / Occupied</span>
                          </>
                        )}
                      </button>

                      {/* Read / View Details Button */}
                      <button
                        onClick={() => setPreviewingProperty(property)}
                        className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                        title="View full listing details as tenant"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      {/* Update / Edit Button */}
                      <button
                        onClick={() => setEditingProperty(property)}
                        className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                        title="Edit property details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setPropertyToDelete({ id: property.id, name: property.name })}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 cursor-pointer"
                        title="Delete property listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Subtab: Applications Received */}
      {activeSubTab === 'applications' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">
              Rental Applications Received ({applications.length})
            </h3>
            <p className="text-xs text-slate-500">
              When tenants submit an application on WhatsApp or in-app, their complete details and messages appear here instantly.
            </p>
          </div>

          {applications.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No Applications Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When prospective tenants apply for your listed properties, all their verified contact details and messages will be listed here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => {
                const cleanPhone = app.applicantPhone.replace(/\D/g, '');
                const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                  `Hello ${app.applicantName}, I am following up on your rental application for "${app.propertyName}" on Comfort Housing Hub.`
                )}`;

                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            {app.propertyName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-1">
                          Applicant: {app.applicantName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>WhatsApp Applicant</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Phone Number
                        </span>
                        <span className="font-semibold text-slate-900">{app.applicantPhone}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Email Address
                        </span>
                        <span className="font-semibold text-slate-900 truncate block">
                          {app.applicantEmail}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Proposed Move-In
                        </span>
                        <span className="font-semibold text-slate-900">{app.proposedMoveInDate}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Occupants
                        </span>
                        <span className="font-semibold text-slate-900">
                          {app.occupantsCount} {app.occupantsCount === 1 ? 'Person' : 'People'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Employment
                        </span>
                        <span className="font-semibold text-slate-900">{app.employmentStatus}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Monthly Income
                        </span>
                        <span className="font-semibold text-emerald-800">
                          {app.monthlyIncomeUsd ? `$${app.monthlyIncomeUsd} USD` : 'Not specified'}
                        </span>
                      </div>
                    </div>

                    {app.message && (
                      <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-700 block mb-0.5">Message:</span>
                        <p className="text-slate-600 italic">"{app.message}"</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'tenants' && (
        <TenantManagement onStartChat={onStartChat} />
      )}

      {activeSubTab === 'rent' && (
        <RentCollection />
      )}

      {activeSubTab === 'leases' && (
        <LeaseManagement />
      )}

      {activeSubTab === 'maintenance' && (
        <MaintenanceTracker />
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <CreateListingModal
          propertyToEdit={editingProperty}
          onClose={() => setEditingProperty(null)}
          onCreated={() => {
            setEditingProperty(null);
            showNotice('Property listing successfully updated!');
          }}
        />
      )}

      {/* Preview Property Modal (Read Action) */}
      {previewingProperty && (
        <PropertyDetails
          property={previewingProperty}
          onClose={() => setPreviewingProperty(null)}
          onStartChat={(recId, recName, propId) => {
            setPreviewingProperty(null);
            onStartChat(recId, recName);
          }}
        />
      )}

      {/* Custom Confirmation Modal for Deleting Property */}
      {propertyToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                Delete Property Listing?
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900">"{propertyToDelete.name}"</strong>?
              This listing will be removed from your database and offline storage.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPropertyToDelete(null)}
                className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProperty}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
