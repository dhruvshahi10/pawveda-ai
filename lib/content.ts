export type PillarContent = {
  slug: string;
  title: string;
  body: string;
};

export type BlogContent = {
  petType: string;
  slug: string;
  title: string;
  body: string;
};

const pillarModules = import.meta.glob('../docs/seo/pillars/*.md', {
  as: 'raw',
  eager: true
}) as Record<string, string>;

const blogModules = import.meta.glob('../content/blogs/*/*.md', {
  as: 'raw',
  eager: true
}) as Record<string, string>;

const extractTitle = (markdown: string, fallback: string) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.startsWith('# ')) continue;
    const title = line.replace(/^#\s+/, '').trim();
    if (title && title !== 'Blog Template (Copy/Paste)') {
      return title;
    }
  }
  return fallback;
};

const buildPillars = (): PillarContent[] => {
  return Object.entries(pillarModules).map(([path, body]) => {
    const slug = path.split('/').pop()?.replace('.md', '') ?? '';
    return {
      slug,
      title: extractTitle(body, slug),
      body
    };
  });
};

const buildBlogs = (): BlogContent[] => {
  return Object.entries(blogModules).map(([path, body]) => {
    const segments = path.split('/');
    const slug = segments.pop()?.replace('.md', '') ?? '';
    const petType = segments.pop() ?? '';
    return {
      petType,
      slug,
      title: extractTitle(body, slug),
      body
    };
  });
};

const pillarIndex = new Map(buildPillars().map(entry => [entry.slug, entry]));
const blogIndex = new Map(buildBlogs().map(entry => [`${entry.petType}/${entry.slug}`, entry]));

export const getPillarBySlug = (slug: string) => {
  return pillarIndex.get(slug) ?? null;
};

export const getBlogBySlug = (petType: string, slug: string) => {
  return blogIndex.get(`${petType}/${slug}`) ?? null;
};
