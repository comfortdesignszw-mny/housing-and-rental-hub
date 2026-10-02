import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, RefreshCw, Database } from 'lucide-react';
import { User } from '../../types';
import {
  AccountBackupData,
  parseAndValidateBackup,
  restoreAccountData,
  RestoreResult,
} from '../../services/accountDataService';

interface RestoreAccountModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onRestoreSuccess: (result: RestoreResult) => void;
}

export const RestoreAccountModal: React.FC<RestoreAccountModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onRestoreSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupPreview, setBackupPreview] = useState<AccountBackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setSelectedFile(file);

    try {
      const data = await parseAndValidateBackup(file);
      setBackupPreview(data);
    } catch (err: any) {
      setParseError(err?.message || 'Failed to read backup file.');
      setBackupPreview(null);
    }
  };

  const handleExecuteRestore = async () => {
    if (!backupPreview) return;
    setIsRestoring(true);
    setParseError(null);

    try {
      const result = await restoreAccountData(backupPreview, currentUser);
      setIsRestoring(false);
      onRestoreSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Error during data restore:', err);
      setParseError(err?.message || 'Restore failed. Please verify your backup file format.');
      setIsRestoring(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setBackupPreview(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl ring-1 ring-emerald-500/30">
              <Upload className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Restore My Account Data
              </h3>
              <p className="text-xs text-slate-300">
                Import and restore from a JSON backup file
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {!backupPreview ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5"
              >
                <div className="p-3 bg-white rounded-2xl shadow-xs text-emerald-600 border border-slate-200">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-800 text-sm">
                    {selectedFile ? selectedFile.name : 'Select Comfort Housing JSON Backup'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Click to browse your device for your <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">.json</code> backup file
                  </p>
                </div>
                <span className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs mt-1">
                  Choose JSON File
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="bg-slate-100/80 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-900">Supported formats:</p>
                <p>
                  Comfort Housing and Rental Hub JSON export files (e.g., <span className="font-mono text-slate-800">comfort_housing_backup_*.json</span>).
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-extrabold text-emerald-950 text-sm">
                      Valid Backup File Verified
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-emerald-800 font-bold hover:underline cursor-pointer"
                  >
                    Change File
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Account Profile
                    </span>
                    <span className="font-extrabold text-slate-900 block truncate">
                      {backupPreview.user.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {backupPreview.user.role}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Backup Created
                    </span>
                    <span className="font-extrabold text-slate-900 block truncate">
                      {new Date(backupPreview.exportedAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(backupPreview.exportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Counts Summary */}
                <div className="bg-white/80 p-3 rounded-xl border border-emerald-100 space-y-1.5 text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block">
                    Contents to be restored:
                  </span>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-semibold">
                      {backupPreview.properties.length} Properties
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 font-semibold">
                      {backupPreview.propertiesNeeded.length} Accommodation Requests
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-semibold">
                      {backupPreview.roommateProfiles.length} Roommate Profiles
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold">
                      {backupPreview.applications.length} Applications
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Clicking restore will update your active profile and sync these records to your cloud database and local device storage.
              </p>
            </div>
          )}

          {parseError && (
            <div className="p-3 rounded-xl bg-rose-100 text-rose-800 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer text-center"
          >
            Cancel
          </button>

          {backupPreview && (
            <button
              type="button"
              onClick={handleExecuteRestore}
              disabled={isRestoring}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Restoring Account Data...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-white" />
                  <span>Confirm & Restore Account Data</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
