import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { User } from '../../types';

interface DeleteAccountModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  user,
  onClose,
  onConfirmDelete,
}) => {
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmationValid =
    confirmedCheckbox && confirmationInput.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmationValid) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirmDelete();
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setErrorMessage(err?.message || 'Failed to wipe account data. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-rose-200 my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-rose-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-800 rounded-2xl text-rose-300 ring-2 ring-rose-400/40">
              <AlertTriangle className="w-6 h-6 text-rose-300 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Delete Account & Wipe Data
              </h3>
              <p className="text-xs text-rose-200">
                Permanent and irreversible action
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-xl text-rose-200 hover:text-white hover:bg-rose-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-slate-700">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
              <span>Warning: Immediate Account & Data Purge</span>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              You are about to wipe the account of <strong>{user.name}</strong> ({user.email || user.phone}). This action will permanently remove:
            </p>
            <ul className="list-disc pl-5 text-xs text-rose-900 space-y-1">
              <li>Your user profile, login credentials, and contact preferences.</li>
              <li>All your published property listings (if landlord or agent).</li>
              <li>All your "Properties Needed" accommodation requests (if tenant).</li>
              <li>Your rental applications, roommate profiles, and saved bookmarks.</li>
              <li>Your offline device cache and synchronization records.</li>
            </ul>
          </div>

          <p className="text-xs text-slate-600 font-medium">
            Once executed, this data cannot be recovered. If you wish to save your records first, please click <strong>"Backup my Account Data"</strong> before proceeding.
          </p>

          {/* First Confirmation Checkpoint */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition">
              <input
                type="checkbox"
                checked={confirmedCheckbox}
                onChange={e => setConfirmedCheckbox(e.target.checked)}
                disabled={isDeleting}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
              />
              <span className="text-xs text-slate-800 font-semibold leading-relaxed">
                I understand that deleting my account and data is permanent and cannot be undone under any circumstances.
              </span>
            </label>
          </div>

          {/* Second Confirmation Checkpoint: Type DELETE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Second Confirmation: Type <span className="font-mono text-rose-600 font-black">DELETE</span> below to confirm:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={e => setConfirmationInput(e.target.value)}
              disabled={isDeleting || !confirmedCheckbox}
              placeholder="Type DELETE"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden disabled:opacity-50 disabled:bg-slate-100"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-100 text-rose-800 text-xs font-semibold">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer Actions with Second Confirmation Button */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer text-center"
          >
            Cancel & Keep Account
          </button>

          {/* Second Confirmation Button */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isDeleting ? (
              <span>Wiping Account & Data...</span>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-white" />
                <span>Confirm & Delete My Account and Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
