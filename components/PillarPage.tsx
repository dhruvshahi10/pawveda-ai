import React from 'react';
import { useParams } from 'react-router-dom';
import { getPillarBySlug } from '../lib/content';
import MarkdownRenderer from './MarkdownRenderer';

const PillarPage: React.FC = () => {
  const { pillar } = useParams();
  const content = pillar ? getPillarBySlug(pillar) : null;

  if (!content) {
    return (
      <main className="page-shell">
        <div className="content">
          <h1>Guide not found</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="content">
        <MarkdownRenderer content={content.body} />
      </div>
    </main>
  );
};

export default PillarPage;
