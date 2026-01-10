
import React, { useState } from 'react';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

const Auth: React.FC<Props> = ({ onComplete, onBack }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('signup');
  const [loading, setLoading] = useState(false);
  const [sentReset, setSentReset] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (mode === 'forgot') {
        setSentReset(true);
      } else {
        onComplete();
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col p-6 items-center justify-center">
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
            <input 
              required
              type="email" 
              placeholder="Email Address" 
              className="w-full bg-brand-50/50 border border-brand-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
            {mode !== 'forgot' && (
              <input 
                required
                type="password" 
                placeholder="Password" 
                className="w-full bg-brand-50/50 border border-brand-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            )}
          </div>

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
              onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              className="text-brand-500 font-bold hover:underline block w-full"
            >
              {mode === 'signup' ? 'Already have an account? Login' : "Don't have an account? Sign up"}
            </button>
          )}
          {mode !== 'forgot' && (
            <button
              onClick={() => {
                setMode('forgot');
                setSentReset(false);
              }}
              className="text-brand-400 font-bold hover:underline"
            >
              Forgot password?
            </button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => setMode('login')} className="text-brand-500 font-bold hover:underline">
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
