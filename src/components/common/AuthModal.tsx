import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Mail, User, Phone, CheckCircle2, ShieldCheck } from 'lucide-react';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+263 77 ');
  const [role, setRole] = useState<UserRole>('tenant');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const ok = await loginWithGoogle();
      if (ok) {
        onClose();
      } else {
        setErrorMessage('Google sign in was cancelled or failed.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (mode === 'signin') {
        const ok = await loginWithEmail(email.trim(), password);
        if (ok) {
          onClose();
        } else {
          setErrorMessage('Invalid credentials. Please verify your email & password.');
        }
      } else {
        const ok = await signupWithEmail(name.trim(), email.trim(), password, role, phone.trim());
        if (ok) {
          onClose();
        } else {
          setErrorMessage('Could not complete signup. Please check details or sign in if you already have an account.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <span>Comfort Housing Hub</span>
            </h3>
            <p className="text-xs text-emerald-100">
              {mode === 'signin' ? 'Welcome back! Sign in to access your properties & chats.' : 'Create your account for Zimbabwe rentals & roommate matching.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition ${
              mode === 'signin'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition ${
              mode === 'signup'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Create New Account
          </button>
        </div>

        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2 text-[10px] uppercase font-bold text-slate-400 absolute">
              or with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nyasha Makoni"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white font-medium"
                  >
                    <option value="tenant">Tenant (Looking for housing / roommate)</option>
                    <option value="landlord">Landlord (Rent properties & manage units)</option>
                    <option value="property_manager">Property Manager (Portfolios)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    WhatsApp / Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-xs cursor-pointer mt-2"
            >
              {loading
                ? 'Processing...'
                : mode === 'signin'
                ? 'Sign In to Comfort Housing'
                : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
