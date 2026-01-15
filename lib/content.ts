export type PillarContent = {
  slug: string;
  title: string;
  body: string;
};

export type BlogContent = {
  petType: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  author?: string;
  date?: string;
  updated?: string;
  tags: string[];
  image?: string;
  readingMinutes: number;
  wordCount: number;
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

type Frontmatter = {
  title?: string;
  description?: string;
  date?: string;
  updated?: string;
  author?: string;
  tags?: string[];
  image?: string;
};

const parseFrontmatter = (markdown: string) => {
  if (!markdown.startsWith('---')) {
    return { frontmatter: {} as Frontmatter, body: markdown };
  }
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) {
    return { frontmatter: {} as Frontmatter, body: markdown };
  }
  const frontmatterLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join('\n');
  const frontmatter: Frontmatter = {};

  frontmatterLines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [rawKey, ...rest] = trimmed.split(':');
    if (!rawKey || rest.length === 0) return;
    const key = rawKey.trim();
    const value = rest.join(':').trim();
    if (!value) return;
    if (key === 'tags') {
      const cleaned = value.replace(/^\[|\]$/g, '');
      frontmatter.tags = cleaned
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      return;
    }
    if (key === 'title') frontmatter.title = value;
    if (key === 'description') frontmatter.description = value;
    if (key === 'date') frontmatter.date = value;
    if (key === 'updated') frontmatter.updated = value;
    if (key === 'author') frontmatter.author = value;
    if (key === 'image') frontmatter.image = value;
  });

  return { frontmatter, body };
};

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

const extractDescription = (markdown: string) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let skipHeadings = true;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      skipHeadings = false;
      continue;
    }
    if (trimmed.startsWith('- ') || /^\d+\)/.test(trimmed)) continue;
    if (skipHeadings) continue;
    return trimmed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }
  return '';
};

const stripMarkdown = (markdown: string) => {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const stripLeadingH1 = (markdown: string) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const firstContentIndex = lines.findIndex(line => line.trim().length > 0);
  if (firstContentIndex >= 0 && lines[firstContentIndex].trim().startsWith('# ')) {
    lines.splice(firstContentIndex, 1);
  }
  return lines.join('\n');
};

const getReadingMinutes = (text: string) => {
  const words = text.split(' ').filter(Boolean);
  return {
    wordCount: words.length,
    readingMinutes: Math.max(1, Math.round(words.length / 220))
  };
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
    const { frontmatter, body: cleanedBody } = parseFrontmatter(body);
    const resolvedTitle = frontmatter.title || extractTitle(cleanedBody, slug);
    const description = frontmatter.description || extractDescription(cleanedBody);
    const bodyWithoutTitle = stripLeadingH1(cleanedBody);
    const plainText = stripMarkdown(bodyWithoutTitle);
    const reading = getReadingMinutes(plainText);
    return {
      petType,
      slug,
      title: resolvedTitle,
      description,
      excerpt: description,
      author: frontmatter.author,
      date: frontmatter.date,
      updated: frontmatter.updated,
      tags: frontmatter.tags?.length ? frontmatter.tags : [petType],
      image: frontmatter.image,
      readingMinutes: reading.readingMinutes,
      wordCount: reading.wordCount,
      body: bodyWithoutTitle
    };
  });
};

const allPillars = buildPillars();
const allBlogs = buildBlogs();

const pillarIndex = new Map(allPillars.map(entry => [entry.slug, entry]));
const blogIndex = new Map(allBlogs.map(entry => [`${entry.petType}/${entry.slug}`, entry]));

export const getPillarBySlug = (slug: string) => {
  return pillarIndex.get(slug) ?? null;
};

export const getBlogBySlug = (petType: string, slug: string) => {
  return blogIndex.get(`${petType}/${slug}`) ?? null;
};

export const getAllPillars = () => {
  return [...allPillars].sort((a, b) => a.title.localeCompare(b.title));
};

export const getAllBlogs = () => {
  return [...allBlogs].sort((a, b) => a.title.localeCompare(b.title));
};
