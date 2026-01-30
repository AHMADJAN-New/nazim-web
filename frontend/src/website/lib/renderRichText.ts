type RichTextNode = {
  type?: string;
  attrs?: Record<string, any>;
  content?: RichTextNode[];
  marks?: Array<{
    type?: string;
    attrs?: Record<string, any>;
  }>;
  text?: string;
};

export function renderRichText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;

  if (typeof content === 'object' && (content as { type?: string }).type === 'doc') {
    const doc = content as { content?: RichTextNode[] };
    return (doc.content || []).map(renderNode).join('');
  }

  return '';
}

function renderNode(node: RichTextNode | null | undefined): string {
  if (!node) return '';

  switch (node.type) {
    case 'heading': {
      const level = node.attrs?.level || 2;
      const text = renderContent(node.content);
      return `<h${level}>${text}</h${level}>`;
    }
    case 'paragraph': {
      const text = renderContent(node.content);
      return `<p>${text}</p>`;
    }
    case 'bulletList': {
      const items = node.content?.map(renderNode).join('') || '';
      return `<ul>${items}</ul>`;
    }
    case 'orderedList': {
      const items = node.content?.map(renderNode).join('') || '';
      return `<ol>${items}</ol>`;
    }
    case 'listItem': {
      const listContent = node.content?.map(renderNode).join('') || '';
      return `<li>${listContent}</li>`;
    }
    case 'text': {
      let text = escapeHtml(node.text || '');
      if (node.marks) {
        node.marks.forEach((mark) => {
          switch (mark.type) {
            case 'bold':
              text = `<strong>${text}</strong>`;
              break;
            case 'italic':
              text = `<em>${text}</em>`;
              break;
            case 'link': {
              const href = mark.attrs?.href || '#';
              const target = mark.attrs?.target || '_blank';
              const rel = mark.attrs?.rel || 'noopener noreferrer';
              text = `<a href="${escapeHtml(href)}" target="${escapeHtml(target)}" rel="${escapeHtml(rel)}">${text}</a>`;
              break;
            }
          }
        });
      }
      return text;
    }
    case 'blockquote': {
      const quoteContent = node.content?.map(renderNode).join('') || '';
      return `<blockquote>${quoteContent}</blockquote>`;
    }
    case 'image': {
      const src = node.attrs?.src || '';
      const alt = node.attrs?.alt || '';
      const title = node.attrs?.title || '';
      if (!src) return '';
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" title="${escapeHtml(title || alt)}" class="max-w-full h-auto rounded-lg my-4" />`;
    }
    case 'hardBreak': {
      return '<br />';
    }
    case 'horizontalRule': {
      return '<hr />';
    }
    case 'codeBlock': {
      const content = node.content?.map((n) => n.text || '').join('') || '';
      const language = node.attrs?.language || '';
      return `<pre><code${language ? ` class="language-${language}"` : ''}>${escapeHtml(content)}</code></pre>`;
    }
    case 'code': {
      const text = node.text || '';
      return `<code>${escapeHtml(text)}</code>`;
    }
    default:
      if (node.content) {
        return node.content.map(renderNode).join('');
      }
      return '';
  }
}

function renderContent(content: RichTextNode[] | undefined): string {
  if (!content || !Array.isArray(content)) return '';
  return content.map(renderNode).join('');
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
