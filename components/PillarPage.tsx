import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPillarBySlug } from '../lib/content';
import MarkdownRenderer from './MarkdownRenderer';
import PublicShell from './PublicShell';

const PillarPage: React.FC = () => {
  const { pillar } = useParams();
  const content = pillar ? getPillarBySlug(pillar) : null;

  if (!content) {
    return (
      <PublicShell title="Guide not found" subtitle="This pillar is no longer available." kicker="Guides Library">
        <Link to="/guides" className="content-link">Return to the guides library.</Link>
      </PublicShell>
    );
  }

  return (
    <PublicShell
      title={content.title}
      subtitle="Long-form guidance built for Indian pet care routines."
      kicker="Guides Library"
    >
      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-brand-500">
        <Link to="/guides" className="hover:text-brand-900 transition-colors">All guides</Link>
      </div>
      <div className="bg-white/90 border border-brand-50 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
        <MarkdownRenderer content={content.body} />
      </div>
    </PublicShell>
  );
};

export default PillarPage;
