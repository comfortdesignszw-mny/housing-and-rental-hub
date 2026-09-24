import React, { useState } from 'react';
import { Lease } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAuth } from '../../context/AuthContext';
import { FileText, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const LeaseManagement: React.FC = () => {
  const { currentUser } = useAuth();

  const leases: Lease[] =
    useLiveQuery(
      async () => {
        if (!currentUser) return [];
        return db.leases.where('landlordId').equals(currentUser.id).toArray();
      },
      [currentUser?.id],
      []
    ) || [];

  const calculateDaysLeft = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Leases & Tenancy Agreements ({leases.length})
          </h3>
          <p className="text-xs text-slate-500">
            Track expiry countdowns, deposits held, renewal dates, and residential terms
          </p>
        </div>
      </div>

      {leases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No leases on record. Registering a tenant automatically generates their active lease.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leases.map(lease => {
            const daysLeft = calculateDaysLeft(lease.endDate);
            const isExpiringSoon = daysLeft <= 60 && daysLeft > 0;
            const isExpired = daysLeft <= 0;

            return (
              <div
                key={lease.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {lease.tenantName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {lease.propertyName} {lease.unitNumber ? `• Unit ${lease.unitNumber}` : ''}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isExpired
                        ? 'bg-rose-100 text-rose-800'
                        : isExpiringSoon
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isExpired ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : isExpiringSoon ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    <span>
                      {isExpired
                        ? 'EXPIRED'
                        : isExpiringSoon
                        ? `${daysLeft} DAYS LEFT`
                        : `${daysLeft} DAYS REMAINING`}
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Lease Term
                    </span>
                    <span className="font-semibold text-slate-800">
                      {lease.startDate} to {lease.endDate}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Monthly Rent / Deposit
                    </span>
                    <span className="font-semibold text-slate-800">
                      ${lease.monthlyRent} / ${lease.deposit} USD
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">
                    Terms & Document Notes:
                  </span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {lease.terms}
                  </p>
                  {lease.documentNotes && (
                    <p className="text-emerald-700 text-[11px] mt-1 font-medium">
                      Archived: {lease.documentNotes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
