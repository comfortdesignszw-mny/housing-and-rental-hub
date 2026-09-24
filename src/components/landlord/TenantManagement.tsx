import React, { useState } from 'react';
import { Tenant, Property } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Plus,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

interface TenantManagementProps {
  onStartChat: (recipientId: string, recipientName: string) => void;
}

export const TenantManagement: React.FC<TenantManagementProps> = ({ onStartChat }) => {
  const { currentUser } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);

  // Load properties owned by current landlord
  const myProperties: Property[] =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.properties.where('landlordId').equals(currentUser.id).toArray();
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

  // Form State
  const [selectedPropId, setSelectedPropId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [moveInDate, setMoveInDate] = useState('2026-09-01');
  const [depositPaid, setDepositPaid] = useState<number>(300);
  const [rentAmount, setRentAmount] = useState<number>(300);
  const [leaseEnd, setLeaseEnd] = useState('2027-08-31');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const prop = myProperties.find(p => p.id === selectedPropId) || myProperties[0];
    const propertyId = prop?.id || 'prop_default';
    const propertyName = prop?.name || 'Main Property';

    const newTenant: Tenant = {
      id: `tenant_${Date.now()}`,
      landlordId: currentUser.id,
      propertyId,
      propertyName,
      unitNumber,
      name,
      phone,
      email,
      moveInDate,
      depositPaid: Number(depositPaid),
      rentAmount: Number(rentAmount),
      currency: 'USD',
      leaseEnd,
      emergencyContactName,
      emergencyContactPhone,
      status: 'active',
      notes,
      createdAt: Date.now(),
    };

    await db.tenants.add(newTenant);

    // Also auto-create active lease record
    await db.leases.add({
      id: `lease_${Date.now()}`,
      propertyId,
      propertyName,
      tenantId: newTenant.id,
      tenantName: name,
      landlordId: currentUser.id,
      unitNumber,
      startDate: moveInDate,
      endDate: leaseEnd,
      monthlyRent: Number(rentAmount),
      deposit: Number(depositPaid),
      terms: 'Standard residential lease agreement. Rent due on 1st of month.',
      status: 'active',
      createdAt: Date.now(),
    });

    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Tenants ({tenants.length})
          </h3>
          <p className="text-xs text-slate-500">
            Manage your tenants, occupancy units, and emergency contacts offline
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Tenant</span>
        </button>
      </div>

      {/* Tenants Table / Cards */}
      {tenants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-900 text-sm">No tenants registered yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add a tenant to track monthly rent payments, lease expiration dates, and send automated notices.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {tenants.map(tenant => (
            <div
              key={tenant.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{tenant.name}</h4>
                    <p className="text-xs text-slate-500">
                      {tenant.propertyName} {tenant.unitNumber ? `• Unit ${tenant.unitNumber}` : ''}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      tenant.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : tenant.status === 'overdue'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tenant.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Rent Amount
                    </span>
                    <span className="font-extrabold text-slate-900">
                      ${tenant.rentAmount} /month
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Deposit Held
                    </span>
                    <span className="font-bold text-slate-700">
                      ${tenant.depositPaid}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 pt-1">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tenant.phone}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lease ends: {tenant.leaseEnd}</span>
                  </p>
                  {tenant.emergencyContactName && (
                    <p className="text-[11px] text-slate-500">
                      Emergency: {tenant.emergencyContactName} ({tenant.emergencyContactPhone})
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={`tel:${tenant.phone.replace(/\D/g, '')}`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Call Tenant
                </a>

                <a
                  href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}?text=Hello ${tenant.name}, message from your landlord regarding ${tenant.propertyName}.`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                Register New Tenant (Offline Safe)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Assigned Property
                </label>
                <select
                  value={selectedPropId}
                  onChange={e => setSelectedPropId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {myProperties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.suburb}, {p.city})
                    </option>
                  ))}
                  {myProperties.length === 0 && (
                    <option value="prop_main">Standard Property</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Tenant Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tatenda Madziva"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Unit Number / Room
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cottage B or Room 3"
                    value={unitNumber}
                    onChange={e => setUnitNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Phone (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+263 77 123 4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <div>
                  <label className="block font-bold text-emerald-950 mb-1">
                    Monthly Rent (USD) *
                  </label>
                  <input
                    type="number"
                    required
                    value={rentAmount}
                    onChange={e => setRentAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-950 mb-1">
                    Deposit Paid (USD)
                  </label>
                  <input
                    type="number"
                    value={depositPaid}
                    onChange={e => setDepositPaid(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Move-in Date
                  </label>
                  <input
                    type="date"
                    value={moveInDate}
                    onChange={e => setMoveInDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Lease Expiry Date
                  </label>
                  <input
                    type="date"
                    value={leaseEnd}
                    onChange={e => setLeaseEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="Next of kin / Relative"
                    value={emergencyContactName}
                    onChange={e => setEmergencyContactName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={e => setEmergencyContactPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold"
                >
                  Save Tenant Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
