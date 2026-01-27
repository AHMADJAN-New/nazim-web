import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar } from 'lucide-react';

interface WebsitePost {
  id: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  content_json?: unknown;
  published_at?: string | null;
  created_at?: string | null;
  seo_image_path?: string | null;
}

function renderJsonContent(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;

  if (typeof content === 'object' && (content as { type?: string }).type === 'doc') {
    const doc = content as { content?: unknown[] };
    return (doc.content || []).map(renderNode).join('');
  }

  return '';
}

type RichTextNode = {
  type?: string;
  attrs?: {
    level?: number;
    href?: string;
  };
  content?: RichTextNode[];
  marks?: Array<{
    type?: string;
    attrs?: {
      href?: string;
    };
  }>;
  text?: string;
};

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
      let text = node.text || '';
      if (node.marks) {
        node.marks.forEach((mark) => {
          switch (mark.type) {
            case 'bold':
              text = `<strong>${text}</strong>`;
              break;
            case 'italic':
              text = `<em>${text}</em>`;
              break;
            case 'link':
              text = `<a href="${mark.attrs?.href || '#'}">${text}</a>`;
              break;
          }
        });
      }
      return text;
    }
    case 'blockquote': {
      const quoteContent = node.content?.map(renderNode).join('') || '';
      return `<blockquote>${quoteContent}</blockquote>`;
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

export default function PublicPostDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['public-post', slug],
    queryFn: async () => {
      const response = await publicWebsiteApi.getPosts();
      if (typeof response === 'object' && response !== null && 'data' in response) {
        const data = (response as { data?: unknown }).data;
        return Array.isArray(data) ? data : [];
      }
      return Array.isArray(response) ? response : [];
    },
    enabled: !!slug,
  });

  const post = useMemo(() => {
    if (!slug || !Array.isArray(data)) return undefined;
    return data.find((item: WebsitePost) => item.slug === slug || item.id === slug);
  }, [data, slug]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!slug || !post) {
    return (
      <div className="flex-1">
        <section className="bg-slate-50 py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Post Not Found</h1>
            <p className="text-slate-600 mb-8">
              We could not find the announcement you are looking for.
            </p>
            <Button variant="outline" asChild>
              <Link to="/public-site/announcements">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Announcements
              </Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const htmlContent = renderJsonContent(post.content_json);
  const displayDate = post.published_at || post.created_at || '';

  return (
    <div className="flex-1">
      <section className="bg-emerald-900 text-white py-16 md:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{post.title}</h1>
          {displayDate && (
            <p className="text-emerald-200 flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(displayDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        {post.seo_image_path && (
          <div className="max-w-4xl mx-auto mb-8">
            <img
              src={post.seo_image_path}
              alt={post.title}
              className="w-full rounded-xl shadow-md"
            />
          </div>
        )}
        <article className="prose prose-emerald lg:prose-lg mx-auto bg-white p-6 md:p-12 rounded-xl shadow-sm">
          {htmlContent ? (
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          ) : (
            <p className="text-slate-500 italic text-center">{post.excerpt || 'No content available.'}</p>
          )}
        </article>
        <div className="max-w-4xl mx-auto mt-10">
          <Button variant="outline" asChild>
            <Link to="/public-site/announcements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Announcements
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
