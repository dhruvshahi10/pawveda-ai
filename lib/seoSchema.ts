export type JsonLdValue = Record<string, unknown>;

const getScriptId = (id: string) => `jsonld-${id}`;

export const setJsonLd = (id: string, data: JsonLdValue | JsonLdValue[]) => {
  if (typeof document === 'undefined') return;
  const scriptId = getScriptId(id);
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = scriptId;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
};

export const clearJsonLd = (id: string) => {
  if (typeof document === 'undefined') return;
  const script = document.getElementById(getScriptId(id));
  if (script) script.remove();
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const buildFaqSchema = (items: FaqItem[]): JsonLdValue => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer
    }
  }))
});

export type BlogPostingInput = {
  headline: string;
  description?: string;
  datePublished: string;
  dateModified?: string;
  url?: string;
  image?: string;
  authorName?: string;
  publisherName?: string;
  publisherLogo?: string;
};

export const buildBlogPostingSchema = (input: BlogPostingInput): JsonLdValue => {
  const schema: JsonLdValue = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.headline,
    datePublished: input.datePublished,
    description: input.description,
    url: input.url,
    image: input.image
  };

  if (input.dateModified) {
    schema.dateModified = input.dateModified;
  }

  if (input.authorName) {
    schema.author = {
      '@type': 'Person',
      name: input.authorName
    };
  }

  if (input.publisherName) {
    schema.publisher = {
      '@type': 'Organization',
      name: input.publisherName,
      logo: input.publisherLogo
        ? {
            '@type': 'ImageObject',
            url: input.publisherLogo
          }
        : undefined
    };
  }

  return schema;
};
