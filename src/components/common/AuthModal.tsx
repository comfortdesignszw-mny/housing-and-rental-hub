import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Mail, User, Phone, Building2, Home, Users, ArrowRight } from 'lucide-react';
import { UserRole } from '../../types';
import { phoneToVirtualEmail } from '../../utils/phoneAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthenticated }) => {
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');

  // Fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<'tenant' | 'landlord' | 'property_manager'>('tenant');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const ok = await loginWithGoogle();
      if (ok) {
        if (onAuthenticated) onAuthenticated();
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

    // Resolve target email based on authMethod
    let targetEmail = '';
    let targetPhone = '';

    if (authMethod === 'phone') {
      const cleanDigits = phoneNumber.replace(/\D/g, '');
      if (cleanDigits.length < 9) {
        setErrorMessage('Please enter a valid Zimbabwean phone number (e.g. 0772 123 456).');
        setLoading(false);
        return;
      }
      targetEmail = phoneToVirtualEmail(phoneNumber);
      targetPhone = phoneNumber.trim();
    } else {
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        setLoading(false);
        return;
      }
      targetEmail = email.trim();
      targetPhone = phoneNumber.trim() || '+263 77 ';
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signin') {
        const ok = await loginWithEmail(targetEmail, password);
        if (ok) {
          if (onAuthenticated) onAuthenticated();
          onClose();
        } else {
          setErrorMessage(
            authMethod === 'phone'
              ? 'Could not sign in with this phone and password. Check details or create an account.'
              : 'Invalid credentials. Please verify your email & password.'
          );
        }
      } else {
        // Sign up
        if (!name.trim()) {
          setErrorMessage('Please enter your full name or primary contact name.');
          setLoading(false);
          return;
        }

        if (role === 'property_manager' && !companyName.trim()) {
          setErrorMessage('Please enter your registered Company / Agency name.');
          setLoading(false);
          return;
        }

        const ok = await signupWithEmail(
          name.trim(),
          targetEmail,
          password,
          role,
          targetPhone,
          role === 'property_manager' ? companyName.trim() : undefined
        );

        if (ok) {
          // Redirect user to the profile section first to configure details
          if (onAuthenticated) onAuthenticated();
          onClose();
        } else {
          setErrorMessage('Could not complete signup. Please verify details or sign in if you already have an account.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <span>Comfort Housing Hub</span>
            </h3>
            <p className="text-xs text-emerald-100">
              {mode === 'signin'
                ? 'Welcome back! Sign in with your phone or email to manage rentals & chats.'
                : 'Choose your account type and get started with verified Zimbabwe housing.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: Sign In vs Create Account */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
              mode === 'signin'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
              mode === 'signup'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Create New Account
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Account Type Selector for Sign Up (Requirement 2) */}
          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-800">
                1. Select Account Type:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Tenant Card */}
                <button
                  type="button"
                  onClick={() => setRole('tenant')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    role === 'tenant'
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Users className={`w-4 h-4 ${role === 'tenant' ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span className={`w-2 h-2 rounded-full ${role === 'tenant' ? 'bg-emerald-600' : 'bg-transparent'}`} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs">Tenant</h4>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      Rent homes, rooms & find roommates
                    </p>
                  </div>
                </button>

                {/* Landlord Card */}
                <button
                  type="button"
                  onClick={() => setRole('landlord')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    role === 'landlord'
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Home className={`w-4 h-4 ${role === 'landlord' ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span className={`w-2 h-2 rounded-full ${role === 'landlord' ? 'bg-emerald-600' : 'bg-transparent'}`} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs">Landlord</h4>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      List & lease your own properties
                    </p>
                  </div>
                </button>

                {/* Property Manager (Companies) */}
                <button
                  type="button"
                  onClick={() => setRole('property_manager')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    role === 'property_manager'
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Building2 className={`w-4 h-4 ${role === 'property_manager' ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span className={`w-2 h-2 rounded-full ${role === 'property_manager' ? 'bg-emerald-600' : 'bg-transparent'}`} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs">Property Manager</h4>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      Agencies & property companies
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Auth Method Switcher: Phone vs Email (Requirement 5) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600 block">
              {mode === 'signup' ? '2. Choose Sign Up Method:' : 'Sign in using:'}
            </span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAuthMethod('phone')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  authMethod === 'phone'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone & Password</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('email')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  authMethod === 'email'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email & Password</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs pt-1">
            {mode === 'signup' && (
              <>
                {/* Property Manager Company Name */}
                {role === 'property_manager' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Company / Agency Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Zimbabwe Property Portfolio Ltd"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {role === 'property_manager' ? 'Primary Contact Person Name' : 'Full Name'} <span className="text-rose-500">*</span>
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

                {/* For Property Manager when using Phone auth, also request company email */}
                {role === 'property_manager' && authMethod === 'phone' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Company Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        placeholder="info@company.co.zw"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Phone Number Input (When Phone Auth selected) */}
            {authMethod === 'phone' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile / WhatsApp Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0772 123 456 or +263 77 123 456"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Supports Econet, NetOne, and Telecel phone numbers.
                </p>
              </div>
            )}

            {/* Email Input (When Email Auth selected) */}
            {authMethod === 'email' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
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
            )}

            {/* Password */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-xs cursor-pointer mt-2 flex items-center justify-center gap-2"
            >
              <span>
                {loading
                  ? 'Processing...'
                  : mode === 'signin'
                  ? 'Sign In to Comfort Housing'
                  : 'Create Account & Continue'}
              </span>
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          {/* Alternative Google Sign In */}
          <div className="relative flex items-center justify-center pt-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2 text-[10px] uppercase font-bold text-slate-400 absolute">
              or continue with Google
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-slate-300 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
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
        </div>
      </div>
    </div>
  );
};
