import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAllBlogs } from '../lib/content';
import { getSiteUrl } from '../lib/seoConfig';
import SEO from './SEO';
import PublicShell from './PublicShell';

const BlogIndex: React.FC = () => {
  const { petType } = useParams();
  const allBlogs = getAllBlogs();
  const availableTypes = Array.from(new Set(allBlogs.map(entry => entry.petType))).sort();
  const filteredBlogs = petType ? allBlogs.filter(entry => entry.petType === petType) : allBlogs;
  const featured = filteredBlogs[0];
  const siteUrl = getSiteUrl();
  const canonical = siteUrl ? `${siteUrl}/blog${petType ? `/${petType}` : ''}` : undefined;

  return (
    <PublicShell
      title="PawVeda Blog"
      subtitle="Practical pet care guidance tailored to Indian cities, climates, and daily routines."
      kicker="Insights & guides"
      aside={(
        <div className="space-y-6">
          <div className="bg-brand-900 text-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_-25px_rgba(82,54,26,0.6)]">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-200">PawVeda Blog</p>
            <h3 className="text-2xl font-display font-black mt-3">Built for Indian pet parents.</h3>
            <p className="text-xs text-brand-100/80 mt-3 leading-relaxed">
              Nutrition, safety, and lifestyle guidance that respects local ingredients and climates.
            </p>
            <Link
              to="/guides"
              className="mt-6 inline-flex px-5 py-3 rounded-full bg-white text-brand-900 text-[10px] font-black uppercase tracking-[0.35em]"
            >
              Browse Guides
            </Link>
          </div>
          <div className="bg-white/90 border border-brand-100 rounded-[2.5rem] p-6 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Topics</p>
            <div className="flex flex-wrap gap-2">
              {availableTypes.map(type => (
                <Link
                  key={type}
                  to={`/blog/${type}`}
                  className={`px-3 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                    petType === type ? 'border-brand-500 text-brand-500 bg-brand-50/70' : 'border-brand-100 text-brand-800/60'
                  }`}
                >
                  {type}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    >
      <SEO
        title={petType ? `PawVeda Blog | ${petType}` : 'PawVeda Blog'}
        description="Indian pet care articles covering nutrition, safety, and everyday routines."
        canonical={canonical}
      />
      <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
        <Link
          to="/blog"
          className={`px-4 py-2 rounded-full border transition-colors ${
            !petType ? 'border-brand-500 text-brand-500 bg-brand-50/70' : 'border-brand-100 text-brand-800/60'
          }`}
        >
          All
        </Link>
        {availableTypes.map(type => (
          <Link
            key={type}
            to={`/blog/${type}`}
            className={`px-4 py-2 rounded-full border transition-colors ${
              petType === type ? 'border-brand-500 text-brand-500 bg-brand-50/70' : 'border-brand-100 text-brand-800/60'
            }`}
          >
            {type}
          </Link>
        ))}
      </div>

      {featured && (
        <Link
          to={`/blog/${featured.petType}/${featured.slug}`}
          className="group relative overflow-hidden rounded-[2.5rem] border border-brand-100 shadow-[0_25px_60px_-40px_rgba(82,54,26,0.6)]"
        >
          <div className="absolute inset-0">
            <img
              src={featured.image || 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=1600'}
              alt={featured.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-900/80 via-brand-900/50 to-transparent" />
          </div>
          <div className="relative p-8 md:p-10 text-white space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-brand-100/80">Featured</p>
            <h2 className="text-3xl md:text-4xl font-display font-black max-w-2xl">{featured.title}</h2>
            <p className="text-sm text-white/80 max-w-2xl">{featured.description || 'Read the latest PawVeda guide.'}</p>
            <span className="inline-flex text-[10px] font-black uppercase tracking-[0.35em] text-white/80 group-hover:text-white transition-colors">
              Read guide →
            </span>
          </div>
        </Link>
      )}

      {filteredBlogs.length === 0 ? (
        <p className="text-sm text-brand-800/60">No posts available yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredBlogs.slice(featured ? 1 : 0).map(entry => (
            <Link
              key={`${entry.petType}/${entry.slug}`}
              to={`/blog/${entry.petType}/${entry.slug}`}
              className="block bg-white/90 border border-brand-50 rounded-[2rem] p-6 shadow-sm hover:border-brand-200 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-display font-black text-brand-900">{entry.title}</h2>
                <span className="text-[9px] font-black uppercase tracking-widest text-brand-500">
                  {entry.petType}
                </span>
              </div>
              <p className="text-xs text-brand-800/60 mt-2">{entry.description || 'Read the full guide on PawVeda.'}</p>
              <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-brand-400 mt-4">
                <span>{entry.readingMinutes} min read</span>
                <span>•</span>
                <span>{entry.wordCount} words</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PublicShell>
  );
};

export default BlogIndex;
