import React from 'react';

type Block =
  | { type: 'h1' | 'h2' | 'h3'; content: string }
  | { type: 'p'; content: string }
  | { type: 'ul' | 'ol'; content: string[] };

const renderInline = (text: string) => {
  if (/^\/[^\s]+$/.test(text)) {
    return (
      <a className="content-link" href={text}>
        {text}
      </a>
    );
  }
  return text;
};

const parseMarkdown = (markdown: string): Block[] => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', content: line.replace(/^#\s+/, '') });
      i += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', content: line.replace(/^##\s+/, '') });
      i += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', content: line.replace(/^###\s+/, '') });
      i += 1;
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().replace(/^-+\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', content: items });
      continue;
    }

    if (/^\d+\)/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\)/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\)\s*/, ''));
        i += 1;
      }
      blocks.push({ type: 'ol', content: items });
      continue;
    }

    const paragraph: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next) break;
      if (next.startsWith('#') || next.startsWith('- ') || /^\d+\)/.test(next)) break;
      paragraph.push(next);
      i += 1;
    }
    blocks.push({ type: 'p', content: paragraph.join(' ') });
  }

  return blocks;
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const blocks = parseMarkdown(content);

  return (
    <div className="content-body">
      {blocks.map((block, index) => {
        if (block.type === 'h1') return <h1 key={index}>{block.content}</h1>;
        if (block.type === 'h2') return <h2 key={index}>{block.content}</h2>;
        if (block.type === 'h3') return <h3 key={index}>{block.content}</h3>;
        if (block.type === 'p') return <p key={index}>{renderInline(block.content)}</p>;
        if (block.type === 'ul') {
          return (
            <ul key={index}>
              {block.content.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <ol key={index}>
            {block.content.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;
