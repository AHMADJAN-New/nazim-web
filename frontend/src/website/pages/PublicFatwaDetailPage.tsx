import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function PublicFatwaDetailPage() {
    const { slug } = useParams<{ slug: string }>();

    const { data: fatwa, isLoading, error } = useQuery({
        queryKey: ['public-fatwa', slug],
        queryFn: async () => {
            if (!slug) throw new Error('No slug provided');
            const response = await publicWebsiteApi.getFatwa(slug);
            return (response as any).data || response;
        },
        enabled: !!slug,
        retry: false,
    });

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <LoadingSpinner />
            </div>
        );
    }

    if (error || !fatwa) {
        return (
            <div className="flex-1">
                <section className="bg-slate-50 py-20">
                    <div className="container mx-auto px-4 text-center">
                        <h1 className="text-3xl font-bold text-slate-900 mb-4">Fatwa Not Found</h1>
                        <p className="text-slate-600 mb-8">
                            We could not find the fatwa you are looking for.
                        </p>
                        <Button variant="outline" asChild>
                            <Link to="/public-site/fatwas">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Fatwas
                            </Link>
                        </Button>
                    </div>
                </section>
            </div>
        );
    }

    const displayDate = fatwa.published_at || fatwa.created_at || '';

    return (
        <div className="flex-1">
            {/* Header */}
            <section className="bg-emerald-900 text-white py-16 md:py-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                <div className="container mx-auto px-4 relative z-10">
                    <Button variant="ghost" className="mb-6 text-white hover:bg-white/10" asChild>
                        <Link to="/public-site/fatwas">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Fatwas
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3 mb-4">
                        {fatwa.category && (
                            <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-300/30">
                                {fatwa.category.name}
                            </Badge>
                        )}
                        {displayDate && (
                            <div className="flex items-center gap-2 text-emerald-200 text-sm">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(displayDate).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">
                        {fatwa.question_title || fatwa.title}
                    </h1>
                </div>
            </section>

            {/* Content */}
            <section className="container mx-auto px-4 py-12 md:py-16">
                <div className="max-w-4xl mx-auto">
                    {fatwa.question_text && (
                        <Card className="mb-6 border-l-4 border-l-emerald-500">
                            <CardContent className="p-6">
                                <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-emerald-600" />
                                    Question
                                </h2>
                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {fatwa.question_text}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {fatwa.answer_text && (
                        <Card className="mb-6">
                            <CardContent className="p-6">
                                <h2 className="text-xl font-semibold text-slate-900 mb-4">Answer</h2>
                                <div className="prose prose-emerald max-w-none">
                                    <div 
                                        className="text-slate-700 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: fatwa.answer_text }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {fatwa.references_json && Array.isArray(fatwa.references_json) && fatwa.references_json.length > 0 && (
                        <Card className="bg-slate-50">
                            <CardContent className="p-6">
                                <h2 className="text-xl font-semibold text-slate-900 mb-4">References</h2>
                                <ul className="space-y-2">
                                    {fatwa.references_json.map((ref: any, index: number) => (
                                        <li key={index} className="text-slate-600 text-sm">
                                            {typeof ref === 'string' ? ref : ref.title || ref.text || JSON.stringify(ref)}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    <div className="mt-8 pt-8 border-t border-slate-200">
                        <Button variant="outline" asChild>
                            <Link to="/public-site/fatwas">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Fatwas
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}

