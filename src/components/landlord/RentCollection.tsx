import React, { useState } from 'react';
import { RentPayment, PaymentMethod, Tenant } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import {
  DollarSign,
  Plus,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Share2,
} from 'lucide-react';
import { offlineSyncService } from '../../services/offlineSync';

export const RentCollection: React.FC = () => {
  const { currentUser } = useAuth();
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<RentPayment | null>(null);

  // Load tenants for selection
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
        return db.rentPayments
          .where('landlordId')
          .equals(currentUser.id)
          .reverse()
          .sortBy('createdAt');
      },
      [currentUser?.id],
      []
    ) || [];

  // Form State
  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState<number>(380);
  const [dueDate, setDueDate] = useState('2026-10-01');
  const [paymentDate, setPaymentDate] = useState('2026-10-01');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash (USD)');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('Rent received in full.');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'overdue'>('paid');

  const paymentMethods: PaymentMethod[] = [
    'Cash (USD)',
    'EcoCash',
    'InnBucks',
    'Mukuru',
    'Bank Transfer (ZIPIT)',
    'Card Payment',
  ];

  // Statistics
  const totalPaidThisMonth = payments
    .filter(p => p.status === 'paid' && p.dueDate.startsWith('2026-09'))
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const tenant = tenants.find(t => t.id === tenantId) || tenants[0];
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment: RentPayment = {
      id: `pay_${Date.now()}`,
      propertyId: tenant?.propertyId || 'prop_1',
      propertyName: tenant?.propertyName || 'Main Property',
      tenantId: tenant?.id || 'tenant_1',
      tenantName: tenant?.name || 'Tenant',
      landlordId: currentUser.id,
      amount: Number(amount),
      currency: 'USD',
      dueDate,
      paymentDate: paymentStatus === 'paid' ? paymentDate : undefined,
      status: paymentStatus,
      paymentMethod: paymentStatus === 'paid' ? paymentMethod : undefined,
      reference: reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      receiptNumber,
      notes,
      createdAt: Date.now(),
    };

    await db.rentPayments.add(newPayment);
    await offlineSyncService.enqueueAction('record_payment', newPayment);

    setShowRecordModal(false);
    if (paymentStatus === 'paid') {
      setSelectedReceipt(newPayment);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Collection Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            Collected (Current Month)
          </span>
          <p className="text-xl font-black text-emerald-800 mt-1">
            ${totalPaidThisMonth} <span className="text-xs text-slate-500 font-normal">USD</span>
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" /> Fully verified
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            Pending / Due Rent
          </span>
          <p className="text-xl font-black text-amber-700 mt-1">
            ${totalPending} <span className="text-xs text-slate-500 font-normal">USD</span>
          </p>
          <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> Due next cycle
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            Payment Methods Accepted
          </span>
          <p className="text-xs font-semibold text-slate-700 mt-1">
            EcoCash, InnBucks, Cash USD, Mukuru & ZIPIT
          </p>
          <button
            onClick={() => setShowRecordModal(true)}
            className="mt-2 w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Payment History List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h4 className="font-bold text-slate-900 text-sm">
            Payment & Rent History ({payments.length})
          </h4>
          <span className="text-xs text-slate-400">Stored offline on device</span>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No rent payment entries recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map(pay => (
              <div
                key={pay.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {pay.tenantName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        pay.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : pay.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {pay.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{pay.propertyName}</p>
                  <p className="text-[11px] text-slate-400">
                    Due: {pay.dueDate} {pay.paymentDate ? `• Paid on: ${pay.paymentDate}` : ''}
                    {pay.paymentMethod ? ` via ${pay.paymentMethod}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900">
                      ${pay.amount} USD
                    </p>
                    {pay.reference && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        {pay.reference}
                      </p>
                    )}
                  </div>

                  {pay.status === 'paid' && (
                    <button
                      onClick={() => setSelectedReceipt(pay)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                      title="View & Share Receipt"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                Record Rent Payment
              </h3>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Select Tenant</label>
                <select
                  required
                  value={tenantId}
                  onChange={e => {
                    setTenantId(e.target.value);
                    const t = tenants.find(item => item.id === e.target.value);
                    if (t) setAmount(t.rentAmount);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">-- Choose Tenant --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.propertyName}) - ${t.rentAmount}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Amount Paid (USD) *
                  </label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Status</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="paid">Paid in Full</option>
                    <option value="pending">Pending Schedule</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {paymentStatus === 'paid' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Payment Channel
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      {paymentMethods.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Date Received
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  EcoCash / InnBucks Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. EC-USD-992384 or Cash handover"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold"
                >
                  Confirm & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150 border-2 border-slate-100">
            <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Official Housing Hub Receipt
              </span>
              <h3 className="font-extrabold text-base text-slate-900 mt-1">
                Comfort Housing Hub 🇿🇼
              </h3>
              <p className="text-[10px] text-slate-400">
                Receipt No: {selectedReceipt.receiptNumber || 'REC-2026-992'}
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Tenant:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Property:</span>
                <span className="font-semibold">{selectedReceipt.propertyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date Paid:</span>
                <span>{selectedReceipt.paymentDate || selectedReceipt.dueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-medium">{selectedReceipt.paymentMethod || 'Cash (USD)'}</span>
              </div>
              {selectedReceipt.reference && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Ref Code:</span>
                  <span className="font-mono text-[11px]">{selectedReceipt.reference}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                <span>Amount Paid:</span>
                <span className="text-emerald-700">${selectedReceipt.amount} USD</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl text-[10px] text-slate-500 text-center">
              Verified & recorded offline. Status: PAID IN FULL.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const receiptText = `Rent Receipt for ${selectedReceipt.propertyName}: $${selectedReceipt.amount} USD received via ${selectedReceipt.paymentMethod}. Ref: ${selectedReceipt.receiptNumber}`;
                  if (navigator.share) {
                    navigator.share({
                      title: `Rent Receipt - ${selectedReceipt.tenantName}`,
                      text: receiptText,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard?.writeText(receiptText);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Receipt</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
