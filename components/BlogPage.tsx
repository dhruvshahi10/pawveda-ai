import React from 'react';
import { useParams } from 'react-router-dom';
import { getBlogBySlug } from '../lib/content';
import MarkdownRenderer from './MarkdownRenderer';

const BlogPage: React.FC = () => {
  const { petType, slug } = useParams();
  const content = petType && slug ? getBlogBySlug(petType, slug) : null;

  if (!content) {
    return (
      <main className="page-shell">
        <div className="content">
          <h1>Blog not found</h1>
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

export default BlogPage;
