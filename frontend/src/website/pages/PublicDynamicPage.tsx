import { useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft, PlusCircle } from 'lucide-react';
import { renderRichText } from '@/website/lib/renderRichText';
import { PublicHeroBackground } from '@/website/components/PublicHeroBackground';

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
            <div className="flex-1 overflow-x-hidden">
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
    const htmlContent = page.content_json ? renderRichText(page.content_json) : '';

    return (
        <div className="flex-1 overflow-x-hidden">
            {/* Page Header */}
            <section className="relative text-white py-16 md:py-24 overflow-hidden">
                <PublicHeroBackground patternOpacity={0.12} />
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
