import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAllBlogs, getBlogBySlug } from '../lib/content';
import { buildBlogPostingSchema, buildFaqSchema } from '../lib/seoSchema';
import { getSiteUrl } from '../lib/seoConfig';
import SEO from './SEO';
import MarkdownRenderer from './MarkdownRenderer';
import PublicShell from './PublicShell';

type TocItem = { id: string; label: string; level: 'h2' | 'h3' };
type FaqItem = { question: string; answer: string };

const toSlug = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const extractToc = (markdown: string): TocItem[] => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  return lines
    .map(line => line.trim())
    .filter(line => line.startsWith('## ') || line.startsWith('### '))
    .map(line => {
      const level = line.startsWith('### ') ? 'h3' : 'h2';
      const label = line.replace(/^###?\s+/, '').trim();
      return { id: toSlug(label), label, level };
    });
};

const extractFaq = (markdown: string): FaqItem[] => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const faqItems: FaqItem[] = [];
  let inFaq = false;
  let currentQuestion = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('## ') && line.toLowerCase().includes('faq')) {
      inFaq = true;
      continue;
    }
    if (inFaq && line.startsWith('## ')) {
      break;
    }
    if (!inFaq) continue;
    if (line.startsWith('### ')) {
      currentQuestion = line.replace(/^###\s+/, '').trim();
      continue;
    }
    if (currentQuestion && line && !line.startsWith('#')) {
      faqItems.push({ question: currentQuestion, answer: line });
      currentQuestion = '';
    }
  }

  return faqItems;
};

const BLOG_HERO_IMAGES: Record<string, string> = {
  dogs: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=1600',
  cats: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&q=80&w=1600',
  birds: 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?auto=format&fit=crop&q=80&w=1600'
};

const BlogPage: React.FC = () => {
  const { petType, slug } = useParams();
  const content = petType && slug ? getBlogBySlug(petType, slug) : null;
  const toc = useMemo(() => (content ? extractToc(content.body) : []), [content]);
  const faqItems = useMemo(() => (content ? extractFaq(content.body) : []), [content]);
  const relatedPosts = useMemo(() => {
    if (!content) return [];
    return getAllBlogs()
      .filter(entry => entry.petType === content.petType && entry.slug !== content.slug)
      .slice(0, 3);
  }, [content]);
  const siteUrl = getSiteUrl();
  const publisherLogo = import.meta.env.VITE_PUBLISHER_LOGO || undefined;

  if (!content) {
    return (
      <PublicShell title="Blog not found" subtitle="This guide is no longer available." kicker="PawVeda Blog">
        <Link to="/blog" className="content-link">Return to the blog index.</Link>
      </PublicShell>
    );
  }

  const canonical = siteUrl ? `${siteUrl}/blog/${content.petType}/${content.slug}` : undefined;
  const heroImage = content.image || BLOG_HERO_IMAGES[content.petType] || BLOG_HERO_IMAGES.dogs;
  const description = content.description || 'Verified care guidance built for Indian pet parents.';
  const seoTitle = `${content.title} | PawVeda Blog`;
  const datePublished = content.date || content.updated;
  const blogSchema = buildBlogPostingSchema({
    headline: content.title,
    description: content.description,
    datePublished,
    dateModified: content.updated,
    url: canonical,
    image: heroImage,
    authorName: content.author || 'PawVeda Editorial',
    publisherName: 'PawVeda',
    publisherLogo
  });
  const jsonLd = [blogSchema, ...(faqItems.length ? [buildFaqSchema(faqItems)] : [])];

  return (
    <PublicShell
      title={content.title}
      subtitle={description}
      kicker={petType ? `${petType} guide` : 'PawVeda Blog'}
      aside={(
        <div className="space-y-6">
          <div className="bg-white/90 border border-brand-100 rounded-[2.5rem] p-6 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Article details</p>
            <div className="text-sm text-brand-900 font-bold">{content.readingMinutes} min read</div>
            <div className="text-xs text-brand-800/60">{content.wordCount} words</div>
            <div className="text-xs text-brand-800/60">{content.updated ? `Updated ${content.updated}` : 'Updated recently'}</div>
            <div className="flex flex-wrap gap-2">
              {content.tags.map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full bg-brand-50 text-[9px] font-black uppercase tracking-widest text-brand-500">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {toc.length > 0 && (
            <div className="bg-white/90 border border-brand-100 rounded-[2.5rem] p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Table of contents</p>
              <div className="space-y-2 text-xs text-brand-800/70">
                {toc.map(item => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block hover:text-brand-900 transition-colors ${
                      item.level === 'h3' ? 'pl-3 text-brand-800/60' : ''
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {relatedPosts.length > 0 && (
            <div className="bg-white/90 border border-brand-100 rounded-[2.5rem] p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Related posts</p>
              <div className="space-y-3">
                {relatedPosts.map(post => (
                  <Link key={post.slug} to={`/blog/${post.petType}/${post.slug}`} className="block text-sm font-bold text-brand-900 hover:text-brand-500 transition-colors">
                    {post.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    >
      <SEO
        title={seoTitle}
        description={description}
        canonical={canonical}
        og={{ type: 'article', url: canonical, image: heroImage }}
        jsonLd={jsonLd}
        jsonLdId={`blog-${content.petType}-${content.slug}`}
      />
      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-brand-500">
        <Link to="/blog" className="hover:text-brand-900 transition-colors">All posts</Link>
        {petType && (
          <>
            <span className="text-brand-200">/</span>
            <Link to={`/blog/${petType}`} className="hover:text-brand-900 transition-colors">{petType}</Link>
          </>
        )}
      </div>
      <div className="relative overflow-hidden rounded-[2.5rem] border border-brand-100 shadow-[0_25px_60px_-40px_rgba(82,54,26,0.6)]">
        <div className="absolute inset-0">
          <img src={heroImage} alt={content.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
        </div>
        <div className="relative p-8 md:p-10 text-white space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.35em] text-brand-100/80">
            <span>{content.petType}</span>
            <span className="text-brand-100/40">•</span>
            <span>{content.readingMinutes} min read</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-black leading-tight">{content.title}</h2>
          <p className="text-sm text-white/80 max-w-2xl">{description}</p>
        </div>
      </div>

      <div className="bg-white/95 border border-brand-50 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
        <MarkdownRenderer content={content.body} />
      </div>
    </PublicShell>
  );
};

export default BlogPage;
