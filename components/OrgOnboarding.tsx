import React, { useEffect, useRef, useState } from 'react';
import { getAuthSession } from '../lib/auth';
import { apiClient } from '../services/apiClient';

interface Props {
  onComplete: (data: { name: string; phone: string; city: string; orgName?: string }) => void;
}

const OrgOnboarding: React.FC<Props> = ({ onComplete }) => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
    orgName: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'error' | 'success' } | null>(null);
  const toastTimeout = useRef<number | null>(null);

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

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const session = getAuthSession();
    if (!session?.accessToken) {
      setSubmitting(false);
      onComplete(form);
      return;
    }

    try {
      await apiClient.post(
        '/api/orgs/profile',
        {
          contactName: form.name,
          phone: form.phone,
          city: form.city,
          orgName: form.orgName || null
        },
        { auth: true }
      );
      showToast('Organization profile saved.', 'success');
      onComplete(form);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save org profile.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center p-6">
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
      <div className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl p-10 space-y-8">
        <div className="text-center space-y-3">
          <span className="text-brand-500 font-black text-[10px] uppercase tracking-[0.3em]">NGO / General User</span>
          <h2 className="text-3xl font-display font-black text-brand-900">Set Up Your Profile</h2>
          <p className="text-brand-800/50 text-sm">We keep this minimal so you can view and manage adoption listings.</p>
        </div>
        <div className="space-y-4">
          <input
            placeholder="Full Name"
            className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Mobile Number"
            className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            placeholder="City"
            className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <input
            placeholder="Organization Name (optional)"
            className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
            value={form.orgName}
            onChange={(e) => setForm({ ...form, orgName: e.target.value })}
          />
        </div>
        {error && <p className="text-center text-sm text-red-500 font-bold">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-brand-900 text-white py-4 rounded-[2rem] font-black text-sm uppercase tracking-widest disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default OrgOnboarding;
