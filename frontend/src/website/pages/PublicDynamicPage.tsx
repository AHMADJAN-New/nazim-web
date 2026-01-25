import { useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft, PlusCircle } from 'lucide-react';

// Simple JSON to HTML converter for TipTap/ProseMirror content
function renderJsonContent(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;

    if (content.type === 'doc' && Array.isArray(content.content)) {
        return content.content.map(renderNode).join('');
    }

    return '';
}

function renderNode(node: any): string {
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
            const content = node.content?.map(renderNode).join('') || '';
            return `<li>${content}</li>`;
        }
        case 'text': {
            let text = node.text || '';
            if (node.marks) {
                node.marks.forEach((mark: any) => {
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
            const content = node.content?.map(renderNode).join('') || '';
            return `<blockquote>${content}</blockquote>`;
        }
        default:
            if (node.content) {
                return node.content.map(renderNode).join('');
            }
            return '';
    }
}

function renderContent(content: any[]): string {
    if (!content || !Array.isArray(content)) return '';
    return content.map(renderNode).join('');
}

export default function PublicDynamicPage() {
    const { slug } = useParams<{ slug: string }>();
    const location = useLocation();

    // Extract slug from path if not provided as param (for routes like /public-site/about)
    const pathSlug = slug || location.pathname.split('/').pop() || '';

    const { data: page, isLoading, error } = useQuery({
        queryKey: ['public-page', pathSlug],
        queryFn: async () => {
            if (!pathSlug) throw new Error("No slug provided");
            const response = await publicWebsiteApi.getPage(pathSlug);
            return (response as any).data || response;
        },
        enabled: !!pathSlug,
        retry: false, // Don't retry on 404
    });

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <LoadingSpinner />
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="flex-1">
                {/* Hero Section for 404 */}
                <section className="bg-gradient-to-br from-slate-100 to-slate-200 py-20">
                    <div className="container mx-auto px-4 text-center">
                        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-slate-300 flex items-center justify-center">
                            <FileQuestion className="h-12 w-12 text-slate-500" />
                        </div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-4">Page Not Found</h1>
                        <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
                            The page <span className="font-semibold text-slate-800">"{pathSlug}"</span> doesn't exist yet.
                            You can create it in the Website Pages management section.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button variant="outline" asChild>
                                <Link to="/public-site">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Home
                                </Link>
                            </Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
                                <Link to="/website/pages">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Create This Page
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Helpful info */}
                <section className="container mx-auto px-4 py-16">
                    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border p-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">How to add this page</h2>
                        <ol className="list-decimal list-inside space-y-3 text-slate-600">
                            <li>Go to <Link to="/website/pages" className="text-emerald-600 hover:underline">Website → Pages</Link> in the admin dashboard</li>
                            <li>Click <strong>"Add New Page"</strong></li>
                            <li>Set the slug to <code className="bg-slate-100 px-2 py-0.5 rounded text-sm">{pathSlug}</code></li>
                            <li>Add your content and publish</li>
                        </ol>
                    </div>
                </section>
            </div>
        );
    }

    // Render content_json to HTML
    const htmlContent = page.content_json ? renderJsonContent(page.content_json) : '';

    return (
        <div className="flex-1">
            {/* Page Header */}
            <section className="bg-emerald-900 text-white py-16 md:py-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">{page.title}</h1>
                    {page.seo_description && (
                        <p className="text-emerald-200 max-w-2xl mx-auto">
                            {page.seo_description}
                        </p>
                    )}
                </div>
            </section>

            {/* Page Content */}
            <section className="container mx-auto px-4 py-12 md:py-16">
                <article className="prose prose-emerald lg:prose-lg mx-auto bg-white p-6 md:p-12 rounded-xl shadow-sm">
                    {htmlContent ? (
                        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                    ) : (
                        <div className="text-slate-500 italic text-center py-8">
                            {page.seo_description || "No content available for this page yet."}
                        </div>
                    )}
                </article>
            </section>
        </div>
    );
}
