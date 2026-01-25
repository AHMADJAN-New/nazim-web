import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface WebsitePost {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content_json: any;
    published_at: string;
    seo_image_path?: string;
    created_at: string;
}

export default function PublicNewsPage() {
    const { data: posts = [], isLoading } = useQuery({
        queryKey: ['public-posts'],
        queryFn: async () => {
            const response = await publicWebsiteApi.getPosts();
            return (response as any).data || response;
        }
    });

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="flex-1">
            {/* Header */}
            <section className="bg-emerald-900 text-white py-16 md:py-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">News & Announcements</h1>
                    <p className="text-emerald-200 max-w-2xl mx-auto">
                        Stay updated with the latest happenings, events, and announcements from our school community.
                    </p>
                </div>
            </section>

            {/* List */}
            <section className="container mx-auto px-4 py-12 md:py-16">
                {posts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post: WebsitePost) => (
                            <Card key={post.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                                <CardHeader className="p-0 overflow-hidden">
                                    <div className="aspect-video w-full bg-slate-100 relative group">
                                        {post.seo_image_path ? (
                                            <img
                                                src={post.seo_image_path}
                                                alt={post.title}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <ImageIcon className="h-12 w-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4 bg-emerald-600/90 text-white text-xs px-2 py-1 rounded backdrop-blur border border-emerald-500/50 flex items-center gap-1.5 shadow-sm">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(post.published_at || post.created_at)}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 p-6 pt-6">
                                    <CardTitle className="mb-2 line-clamp-2 hover:text-emerald-700 transition-colors">
                                        <Link to={`/public-site/announcements/${post.slug}`}>
                                            {post.title}
                                        </Link>
                                    </CardTitle>
                                    <CardDescription className="line-clamp-3 mb-4">
                                        {post.excerpt}
                                    </CardDescription>
                                </CardContent>
                                <CardFooter className="p-6 pt-0 mt-auto">
                                    <Button variant="ghost" className="p-0 h-auto text-emerald-600 hover:text-emerald-700 hover:bg-transparent" asChild>
                                        <Link to={`/public-site/announcements/${post.slug}`} className="flex items-center group/btn">
                                            Read More
                                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed text-slate-500">
                        <p className="text-lg mb-2">No updates available at the moment.</p>
                        <p className="text-sm text-slate-400">Please check back later.</p>
                    </div>
                )}
            </section>
        </div>
    );
}

function formatDate(dateStr: string) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
