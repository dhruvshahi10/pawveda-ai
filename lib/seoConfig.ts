export type OpenGraphMeta = {
  title?: string;
  description?: string;
  type?: string;
  url?: string;
  image?: string;
};

export type TwitterMeta = {
  card?: string;
  title?: string;
  description?: string;
  image?: string;
  site?: string;
};

export type SeoMetaInput = {
  title?: string;
  description?: string;
  canonical?: string;
  og?: OpenGraphMeta;
  twitter?: TwitterMeta;
};

export type ResolvedSeoMeta = {
  title?: string;
  description?: string;
  canonical?: string;
  og: OpenGraphMeta;
  twitter: TwitterMeta;
};

export type SeoDefaults = {
  siteName?: string;
  siteUrl?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultOgType?: string;
  defaultTwitterCard?: string;
  defaultImage?: string;
};

// TODO: Populate from /docs/seo templates.
export const SEO_DEFAULTS: SeoDefaults = {
  siteName: '',
  siteUrl: '',
  defaultTitle: '',
  defaultDescription: '',
  defaultOgType: 'website',
  defaultTwitterCard: 'summary_large_image',
  defaultImage: ''
};

const coalesce = (...values: Array<string | undefined>) => values.find(Boolean);

export const resolveSeoMeta = (input: SeoMetaInput = {}): ResolvedSeoMeta => {
  const title = coalesce(input.title, SEO_DEFAULTS.defaultTitle);
  const description = coalesce(input.description, SEO_DEFAULTS.defaultDescription);
  const canonical = coalesce(input.canonical);

  const og: OpenGraphMeta = {
    title: coalesce(input.og?.title, title),
    description: coalesce(input.og?.description, description),
    type: coalesce(input.og?.type, SEO_DEFAULTS.defaultOgType),
    url: coalesce(input.og?.url, canonical, SEO_DEFAULTS.siteUrl),
    image: coalesce(input.og?.image, SEO_DEFAULTS.defaultImage)
  };

  const twitter: TwitterMeta = {
    card: coalesce(input.twitter?.card, SEO_DEFAULTS.defaultTwitterCard),
    title: coalesce(input.twitter?.title, title),
    description: coalesce(input.twitter?.description, description),
    image: coalesce(input.twitter?.image, og.image),
    site: coalesce(input.twitter?.site)
  };

  return {
    title,
    description,
    canonical,
    og,
    twitter
  };
};
