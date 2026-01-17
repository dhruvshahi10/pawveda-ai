
import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { coerceRole, setAuthSession } from '../lib/auth';

type AuthMode = 'login' | 'signup' | 'forgot';

interface Props {
  onComplete: (role: 'pet-parent' | 'ngo') => void;
  onBack: () => void;
  initialMode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
}

const Auth: React.FC<Props> = ({ onComplete, onBack, initialMode = 'signup', onModeChange }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [sentReset, setSentReset] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [role, setRole] = useState<'pet-parent' | 'ngo'>('pet-parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'error' | 'success' } | null>(null);
  const toastTimeout = useRef<number | null>(null);

  useEffect(() => {
    setError('');
    setSentReset(false);
    setToast(null);
  }, [mode]);

  useEffect(() => {
    setMode(prev => (prev !== initialMode ? initialMode : prev));
  }, [initialMode]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  const showToast = (message: string, tone: 'error' | 'success' = 'error') => {
    setToast({ message, tone });
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhoneNumber('');
    setError('');
  };

  const updateMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    onModeChange?.(nextMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    if (mode === 'forgot') {
      setTimeout(() => {
        setLoading(false);
        setSentReset(true);
        showToast('Reset link sent. Check your email.', 'success');
      }, 800);
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setLoading(false);
      const message = 'Email and password are required.';
      setError(message);
      showToast(message, 'error');
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setLoading(false);
      const message = 'Full name is required.';
      setError(message);
      showToast(message, 'error');
      return;
    }

    const sanitizedPhone = phoneNumber.replace(/\D/g, '');
    const phoneE164 = mode === 'signup' && sanitizedPhone ? `${countryCode}${sanitizedPhone}` : undefined;

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'signup'
          ? { email: trimmedEmail, password, fullName: fullName.trim(), phoneE164, role }
          : { email: trimmedEmail, password };

      const data = await apiClient.post<{
        accessToken?: string;
        refreshToken?: string;
        user?: { role?: unknown } | null;
      }>(endpoint, payload);

      if (data?.accessToken) {
        setAuthSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user || null
        });
      }

      const resolvedRole = coerceRole(data?.user?.role) ?? role;
      showToast(mode === 'signup' ? 'Account created. Welcome!' : 'Login successful.', 'success');
      onComplete(resolvedRole);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col p-6 items-center justify-center">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 rounded-2xl px-5 py-4 text-sm font-semibold shadow-2xl border backdrop-blur-xl bg-white/70 animate-in slide-in-from-top-2 duration-300 md:left-auto md:right-6 md:translate-x-0 md:max-w-sm ${
            toast.tone === 'success'
              ? 'text-emerald-900 border-emerald-200 shadow-emerald-200/40'
              : 'text-red-900 border-red-200 shadow-red-200/40'
          }`}
        >
          {toast.message}
        </div>
      )}
      <button onClick={onBack} className="absolute top-8 left-8 text-brand-900 font-bold flex items-center gap-2 group">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back
      </button>

      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand-900 rounded-[1.5rem] flex items-center justify-center text-white font-display font-bold text-3xl mx-auto mb-6 shadow-xl">P</div>
          <h2 className="text-3xl font-display font-black text-brand-900">
            {mode === 'signup' ? 'Join the Pack' : mode === 'login' ? 'Welcome Back' : 'Reset Access'}
          </h2>
          <p className="text-brand-800/50 mt-2">
            {mode === 'signup'
              ? 'Start your journey to better pet care.'
              : mode === 'login'
              ? 'Ready to check on your companion?'
              : 'We will send a reset link to your email.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {mode !== 'forgot' && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'pet-parent', label: 'Pet Parent' },
                  { id: 'ngo', label: 'NGO / General' }
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRole(option.id as 'pet-parent' | 'ngo')}
                    className={`py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                      role === option.id ? 'bg-brand-900 text-white border-brand-900' : 'bg-white text-brand-900 border-brand-50 hover:border-brand-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            <input 
              required
              type="email" 
              placeholder="Email Address" 
              className="w-full bg-brand-50/50 border border-brand-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {mode === 'signup' && (
              <>
                <input 
                  required
                  type="text" 
                  placeholder="Full Name" 
                  className="w-full bg-brand-50/50 border border-brand-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <div className="flex gap-3">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-brand-50/50 border border-brand-100 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+65">🇸🇬 +65</option>
                </select>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{6,15}"
                  placeholder="Mobile Number"
                  className="flex-1 bg-brand-50/50 border border-brand-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                </div>
              </>
            )}
            {mode !== 'forgot' && (
              <input 
                required
                type="password" 
                placeholder="Password" 
                className="w-full bg-brand-50/50 border border-brand-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </div>
          {error && (
            <p className="text-center text-sm text-red-500 font-bold">{error}</p>
          )}

          <button 
            disabled={loading}
            className="w-full bg-brand-900 text-white py-5 rounded-[2rem] font-bold text-lg shadow-xl shadow-brand-100 hover:bg-brand-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : mode === 'signup' ? 'Create Account' : mode === 'login' ? 'Login' : 'Send Reset Link'}
          </button>
          {mode === 'forgot' && sentReset && (
            <p className="text-center text-sm text-brand-500 font-bold">Reset link sent. Check your email.</p>
          )}
        </form>

        <div className="mt-8 text-center text-sm space-y-3">
          {mode !== 'forgot' && (
            <button 
              onClick={() => updateMode(mode === 'signup' ? 'login' : 'signup')}
              className="text-brand-500 font-bold hover:underline block w-full"
            >
              {mode === 'signup' ? 'Already have an account? Login' : "Don't have an account? Sign up"}
            </button>
          )}
          {mode !== 'forgot' && (
            <button
              onClick={() => {
                updateMode('forgot');
                setSentReset(false);
              }}
              className="text-brand-400 font-bold hover:underline"
            >
              Forgot password?
            </button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => updateMode('login')} className="text-brand-500 font-bold hover:underline">
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
