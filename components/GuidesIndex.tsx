import React from 'react';
import { Link } from 'react-router-dom';
import { getAllPillars } from '../lib/content';
import PublicShell from './PublicShell';

const GuidesIndex: React.FC = () => {
  const pillars = getAllPillars();

  return (
    <PublicShell
      title="Guides Library"
      subtitle="Deep dives on nutrition, safety, and everyday care to complement your daily brief."
      kicker="Guides & pillars"
    >
      {pillars.length === 0 ? (
        <p className="text-sm text-brand-800/60">Guides are being prepared.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pillars.map(entry => (
            <Link
              key={entry.slug}
              to={`/guides/${entry.slug}`}
              className="block bg-white/90 border border-brand-50 rounded-[2rem] p-6 shadow-sm hover:border-brand-200 hover:shadow-lg transition-all"
            >
              <h2 className="text-lg font-display font-black text-brand-900">{entry.title}</h2>
              <p className="text-xs text-brand-800/60 mt-2">Explore the guide in full.</p>
            </Link>
          ))}
        </div>
      )}
    </PublicShell>
  );
};

export default GuidesIndex;
