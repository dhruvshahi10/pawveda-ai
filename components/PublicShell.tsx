import React from 'react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  kicker?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}

const PublicShell: React.FC<Props> = ({ title, subtitle, kicker, children, aside }) => {
  return (
    <div className="min-h-screen bg-[#FAF8F6] text-brand-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-24 -left-32 w-[420px] h-[420px] bg-brand-200/60 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-[-120px] w-[360px] h-[360px] bg-brand-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-120px] left-[15%] w-[520px] h-[520px] bg-[#f3e7da] rounded-full blur-[140px]" />
      </div>

      <header className="relative px-6 pt-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-brand-900 rounded-[1.4rem] flex items-center justify-center text-white font-display font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
              P
            </div>
            <span className="text-xl font-display font-black tracking-tight">PawVeda</span>
          </Link>
          <nav className="hidden md:flex items-center gap-10 text-[11px] font-black uppercase tracking-[0.35em] text-brand-800/70">
            <Link to="/guides" className="hover:text-brand-500 transition-colors">Guides</Link>
            <Link to="/blog" className="hover:text-brand-500 transition-colors">Blog</Link>
            <Link to="/support" className="hover:text-brand-500 transition-colors">Support</Link>
            <Link to="/privacy" className="hover:text-brand-500 transition-colors">Privacy</Link>
          </nav>
          <Link
            to="/auth?mode=signup"
            className="px-6 py-3 rounded-full bg-brand-900 text-white text-[10px] font-black uppercase tracking-[0.35em] shadow-[0_15px_30px_rgba(82,54,26,0.25)] hover:bg-brand-500 transition-colors"
          >
            Join
          </Link>
        </div>
        <div className="mt-4 flex md:hidden gap-3 overflow-x-auto pb-2 text-[10px] font-black uppercase tracking-[0.3em] text-brand-800/70">
          {[
            { label: 'Guides', to: '/guides' },
            { label: 'Blog', to: '/blog' },
            { label: 'Support', to: '/support' },
            { label: 'Privacy', to: '/privacy' },
            { label: 'Terms', to: '/terms' }
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="px-4 py-2 rounded-full border border-brand-100 bg-white/70 whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="relative px-6 pb-20">
        <div className="mx-auto max-w-6xl mt-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-20 h-20 border border-brand-200/70 rounded-[2rem]" />
              <div className="absolute -bottom-6 right-10 w-28 h-28 border border-brand-100/80 rounded-[2rem]" />
              <div className="relative bg-white/90 backdrop-blur-2xl border border-brand-100 rounded-[3rem] p-10 md:p-14 shadow-[0_35px_80px_-40px_rgba(82,54,26,0.45)]">
                <div className="flex flex-col gap-4">
                  {kicker && (
                    <span className="text-[10px] font-black uppercase tracking-[0.45em] text-brand-500">{kicker}</span>
                  )}
                  <h1 className="text-4xl md:text-5xl font-display font-black text-brand-900 leading-tight">{title}</h1>
                  {subtitle && <p className="text-sm md:text-base text-brand-800/70 max-w-2xl leading-relaxed">{subtitle}</p>}
                </div>
                <div className="mt-10 space-y-6 text-sm text-brand-800/70 leading-relaxed">{children}</div>
              </div>
            </div>
            <aside className="space-y-6">
              {aside || (
                <>
                  <div className="bg-brand-900 text-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_-25px_rgba(82,54,26,0.6)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-200">PawVeda Stack</p>
                    <h3 className="text-2xl font-display font-black mt-3">Everyday care, elevated.</h3>
                    <p className="text-xs text-brand-100/80 mt-3 leading-relaxed">
                      Trusted guidance for Indian pet parents, tailored to local climate, breed, and lifestyle.
                    </p>
                    <Link
                      to="/auth?mode=signup"
                      className="mt-6 inline-flex px-5 py-3 rounded-full bg-white text-brand-900 text-[10px] font-black uppercase tracking-[0.35em]"
                    >
                      Start Free
                    </Link>
                  </div>
                  <div className="bg-white/90 border border-brand-100 rounded-[2.5rem] p-6 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Explore</p>
                    <Link to="/blog" className="block text-sm font-bold text-brand-900 hover:text-brand-500 transition-colors">
                      Read the latest blog guides
                    </Link>
                    <Link to="/guides" className="block text-sm font-bold text-brand-900 hover:text-brand-500 transition-colors">
                      Browse the guides library
                    </Link>
                    <Link to="/support" className="block text-sm font-bold text-brand-900 hover:text-brand-500 transition-colors">
                      Contact support
                    </Link>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      </main>

      <footer className="relative px-6 pb-12">
        <div className="mx-auto max-w-6xl border-t border-brand-100 pt-8 flex flex-col md:flex-row md:items-center justify-between gap-6 text-[10px] font-bold uppercase tracking-[0.35em] text-brand-800/40">
          <div className="flex flex-wrap gap-6">
            <Link to="/privacy" className="hover:text-brand-500 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-500 transition-colors">Terms</Link>
            <Link to="/safety" className="hover:text-brand-500 transition-colors">Safety</Link>
          </div>
          <p className="text-brand-800/30">PawVeda Intelligence Layer</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicShell;
