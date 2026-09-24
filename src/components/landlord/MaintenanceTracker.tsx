import React, { useState } from 'react';
import { MaintenanceRequest, MaintenanceCategory, MaintenanceUrgency, MaintenanceStatus } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  X,
} from 'lucide-react';
import { offlineSyncService } from '../../services/offlineSync';

export const MaintenanceTracker: React.FC = () => {
  const { currentUser, role } = useAuth();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Load all maintenance requests
  const tickets: MaintenanceRequest[] =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return role === 'tenant'
          ? db.maintenanceRequests.where('tenantId').equals(currentUser.id).toArray()
          : db.maintenanceRequests.where('landlordId').equals(currentUser.id).toArray();
      },
      [currentUser?.id, role],
      []
    ) || [];

  // Form State
  const [category, setCategory] = useState<MaintenanceCategory>('Plumbing');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<MaintenanceUrgency>('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(20);

  const categories: MaintenanceCategory[] = [
    'Plumbing',
    'Electrical',
    'Solar / Power',
    'Borehole / Water',
    'Damage Report',
    'Security / Locks',
    'Roof / Ceiling',
    'General Request',
  ];

  const handleStatusChange = async (ticketId: string, newStatus: MaintenanceStatus) => {
    const updateData: Partial<MaintenanceRequest> = {
      status: newStatus,
      resolvedAt: newStatus === 'resolved' ? Date.now() : undefined,
    };
    await db.maintenanceRequests.update(ticketId, updateData);
    await offlineSyncService.enqueueAction('update_maintenance_status', {
      ticketId,
      status: newStatus,
    });
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const newTicket: MaintenanceRequest = {
      id: `maint_${Date.now()}`,
      propertyId: 'prop_harare_avondale_cottage',
      propertyName: 'Modern 2-Bed Cottage with Solar & Borehole',
      tenantId: currentUser.id,
      tenantName: currentUser.name,
      landlordId: 'user_landlord_1',
      category,
      title,
      description,
      urgency,
      status: 'open',
      photos: [],
      reportedAt: Date.now(),
      estimatedCost: Number(estimatedCost),
      assignedTo: assignedTo || 'Pending Technician',
    };

    await db.maintenanceRequests.add(newTicket);
    await offlineSyncService.enqueueAction('submit_maintenance', newTicket);

    setShowSubmitModal(false);
    setTitle('');
    setDescription('');
  };

  const filteredTickets = filterCategory === 'All'
    ? tickets
    : tickets.filter(t => t.category === filterCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Maintenance Tickets ({tickets.length})
          </h3>
          <p className="text-xs text-slate-500">
            Track plumbing, solar inverters, boreholes, and repairs
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Report Issue</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCategory('All')}
          className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition ${
            filterCategory === 'All'
              ? 'bg-slate-900 text-white font-semibold'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          All Issues
        </button>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition ${
              filterCategory === c
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-slate-900 text-sm">No active maintenance issues</h4>
          <p className="text-xs text-slate-500">All properties and utility systems are running normally.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map(ticket => (
            <div
              key={ticket.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {ticket.category}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">
                      {ticket.title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {ticket.propertyName} • Tenant: {ticket.tenantName}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      ticket.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ticket.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ticket.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {ticket.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <span>Urgency: <strong className="text-slate-800 uppercase">{ticket.urgency}</strong></span>
                  <span>Est. Cost: <strong className="text-slate-800">${ticket.estimatedCost || 0} USD</strong></span>
                </div>

                {ticket.assignedTo && (
                  <p className="text-[11px] text-slate-600 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Tech Assigned: <strong>{ticket.assignedTo}</strong></span>
                  </p>
                )}
              </div>

              {/* Status Update Quick Bar (Landlords) */}
              {role !== 'tenant' && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-medium">Update Status:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        ticket.status === 'in_progress'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange(ticket.id, 'resolved')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        ticket.status === 'resolved'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Resolved
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Report Maintenance Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                Submit Maintenance Request
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Issue Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Urgency Level</label>
                  <select
                    value={urgency}
                    onChange={e => setUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="low">Low (Standard)</option>
                    <option value="medium">Medium (Requires attention)</option>
                    <option value="high">High (Urgent)</option>
                    <option value="emergency">Emergency (Burst pipe / No power)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Issue Summary / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Borehole pressure pump not activating"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain exactly what happens, when it started, and whether electricity or water is interrupted..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Assigned Technician (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tendai Electrician"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Estimated Cost (USD)
                  </label>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={e => setEstimatedCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold"
                >
                  Submit Ticket (Offline Safe)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
