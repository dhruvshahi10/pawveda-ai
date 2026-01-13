import { useEffect, useMemo } from 'react';
import { clearJsonLd, setJsonLd, JsonLdValue } from '../lib/seoSchema';
import { resolveSeoMeta, SeoMetaInput } from '../lib/seoConfig';

export type SeoProps = SeoMetaInput & {
  jsonLd?: JsonLdValue | JsonLdValue[];
  jsonLdId?: string;
};

const upsertMetaTag = (attr: 'name' | 'property', key: string, content?: string) => {
  if (typeof document === 'undefined') return;
  const selector = `meta[${attr}="${key}"]`;
  const existing = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!content) {
    existing?.remove();
    return;
  }

  const meta = existing ?? document.createElement('meta');
  meta.setAttribute(attr, key);
  meta.setAttribute('content', content);
  if (!existing) document.head.appendChild(meta);
};

const upsertLinkTag = (rel: string, href?: string) => {
  if (typeof document === 'undefined') return;
  const selector = `link[rel="${rel}"]`;
  const existing = document.head.querySelector(selector) as HTMLLinkElement | null;

  if (!href) {
    existing?.remove();
    return;
  }

  const link = existing ?? document.createElement('link');
  link.setAttribute('rel', rel);
  link.setAttribute('href', href);
  if (!existing) document.head.appendChild(link);
};

const SEO = ({ jsonLd, jsonLdId = 'default', ...input }: SeoProps) => {
  const resolved = useMemo(() => resolveSeoMeta(input), [input]);
  const jsonLdPayload = useMemo(() => (jsonLd ? JSON.stringify(jsonLd) : ''), [jsonLd]);

  useEffect(() => {
    if (resolved.title) {
      document.title = resolved.title;
    }

    upsertMetaTag('name', 'description', resolved.description);
    upsertLinkTag('canonical', resolved.canonical);

    upsertMetaTag('property', 'og:title', resolved.og.title);
    upsertMetaTag('property', 'og:description', resolved.og.description);
    upsertMetaTag('property', 'og:type', resolved.og.type);
    upsertMetaTag('property', 'og:url', resolved.og.url);
    upsertMetaTag('property', 'og:image', resolved.og.image);

    upsertMetaTag('name', 'twitter:card', resolved.twitter.card);
    upsertMetaTag('name', 'twitter:title', resolved.twitter.title);
    upsertMetaTag('name', 'twitter:description', resolved.twitter.description);
    upsertMetaTag('name', 'twitter:image', resolved.twitter.image);
    upsertMetaTag('name', 'twitter:site', resolved.twitter.site);
  }, [resolved]);

  useEffect(() => {
    if (!jsonLdPayload) {
      clearJsonLd(jsonLdId);
      return;
    }

    setJsonLd(jsonLdId, JSON.parse(jsonLdPayload));
  }, [jsonLdId, jsonLdPayload]);

  return null;
};

export default SEO;
