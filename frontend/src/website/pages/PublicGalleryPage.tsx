import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi, PaginatedResponse } from '@/lib/api/client';
import { PublicPageHeader } from '@/website/components/PublicPageHeader';
import { LoadingSpinner } from '@/components/ui/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Music, Image as ImageIcon, Volume2, ArrowLeft, FolderOpen } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';

interface MediaItem {
    id: string;
    type: 'image' | 'video' | 'audio' | 'document';
    file_path: string;
    file_url?: string | null;
    file_name?: string | null;
    alt_text?: string | null;
    created_at?: string;
    category_id?: string | null;
}

interface MediaCategory {
    id: string;
    name: string;
    slug: string;
    description: string;
    cover_image_path?: string;
    cover_image_url?: string | null;
}

export default function PublicGalleryPage() {
    const [selectedCategory, setSelectedCategory] = useState<MediaCategory | null>(null);
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState('all');

    // Fetch Categories (Albums)
    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['public-media-categories'],
        queryFn: async () => {
            const response = await publicWebsiteApi.getMediaCategories();
            if (Array.isArray(response)) {
                return response as MediaCategory[];
            }
            return ((response as { data?: MediaCategory[] })?.data || []) as MediaCategory[];
        },
        staleTime: 10 * 60 * 1000,
    });

    // Fetch Media (Paginated & Filtered)
    const { data: mediaData, isLoading: isLoadingMedia } = useQuery({
        queryKey: ['public-media', selectedCategory?.slug, page],
        queryFn: async () => {
            const response = await publicWebsiteApi.getMedia({
                category: selectedCategory?.slug,
                page: page
            });
            if (typeof response === 'object' && response !== null && 'data' in response) {
                return response as PaginatedResponse<MediaItem>;
            }
            return {
                data: Array.isArray(response) ? response : [],
                current_page: 1,
                last_page: 1,
                per_page: 12,
                total: Array.isArray(response) ? response.length : 0,
            } as PaginatedResponse<MediaItem>;
        },
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    });

    const mediaItems = useMemo(() => {
        if (!mediaData?.data) return [];
        return mediaData.data.map((item) => ({
            id: item.id,
            type: item.type === 'document' ? 'audio' : item.type,
            url: item.file_url || item.file_path,
            title: item.file_name || 'Untitled',
            description: item.alt_text || '',
        }));
    }, [mediaData]);

    // Handle Category Selection
    const handleCategoryClick = (category: MediaCategory) => {
        setSelectedCategory(category);
        setPage(1); // Reset to page 1
        setActiveTab('all'); // Reset tab
    };

    const handleBackToAlbums = () => {
        setSelectedCategory(null);
        setPage(1);
    };

    // Filter displayed items by tab (frontend filtering of current page - note: real filtering should specific api calls if pages are huge, 
    // but for mixed content galleries, filtering the current page is acceptable common pattern or we need separate API calls per type.
    // Given the API filters by Category only, we will show mixed content or filter strictly on frontend for now.
    // Ideally, "Photos", "Videos" tabs should trigger API refetch with type filter, but backend media() didn't impl type filter today.
    // So we will just show what we got.)
    const filteredItems = useMemo(() => {
        if (activeTab === 'all') return mediaItems;
        if (activeTab === 'photos') return mediaItems.filter(m => m.type === 'image');
        if (activeTab === 'videos') return mediaItems.filter(m => m.type === 'video');
        if (activeTab === 'audio') return mediaItems.filter(m => m.type === 'audio');
        return mediaItems;
    }, [mediaItems, activeTab]);

    if (isLoadingCategories && !mediaData) {
        return (
            <div className="flex-1 flex items-center justify-center py-20 min-h-screen bg-slate-50">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-screen bg-gradient-to-b from-slate-50 to-white overflow-x-hidden">
            {/* Header */}
            <PublicPageHeader
                title={selectedCategory ? selectedCategory.name : 'ګالري او البومونه'}
                description={selectedCategory ? selectedCategory.description : 'زموږ د انځورونو، ویډیوګانو، او آډیو ریکارډینګونو ټولګه وګورئ.'}
            >
                {selectedCategory && (
                    <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={handleBackToAlbums}
                    >
                        <ArrowLeft className="w-4 h-4" /> ټول البومونه
                    </Button>
                )}
            </PublicPageHeader>

            <section className="container mx-auto px-4 py-8">
                {/* View 1: Albums List (Only if no category selected) */}
                {!selectedCategory && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-2 mb-6 border-b pb-4">
                            <FolderOpen className="w-6 h-6 text-emerald-600" />
                            <h2 className="text-2xl font-bold text-slate-800">البومونه</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    onClick={() => handleCategoryClick(category)}
                                    className="group cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100"
                                >
                                    <div className="aspect-[4/3] bg-slate-200 relative overflow-hidden">
                                        {(category.cover_image_url || category.cover_image_path) ? (
                                            <img
                                                src={category.cover_image_url || category.cover_image_path || ''}
                                                alt={category.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                                <ImageIcon className="w-12 h-12 text-slate-300" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                        <div className="absolute bottom-4 right-4 text-white">
                                            <h3 className="text-xl font-bold">{category.name}</h3>
                                            <span className="text-sm text-slate-200 inline-flex items-center gap-1">
                                                وګورئ <ArrowLeft className="w-3 h-3" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Also show a "Recent Uploads" section below albums? Optional. */}
                        <div className="mt-16 pt-8 border-t">
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">وروستي اپلوډونه</h2>
                            {/* We can re-use the Media Grid here just passing no category to publicWebsiteApi.getMedia which defaults to all */}
                            <MediaGrid
                                items={mediaItems}
                                isLoading={isLoadingMedia}
                                page={page}
                                totalPages={mediaData?.last_page || 1}
                                onPageChange={setPage}
                            />
                        </div>
                    </div>
                )}

                {/* View 2: Selected Category Items */}
                {selectedCategory && (
                    <div className="space-y-6">
                        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                            <TabsList className="bg-white border p-1 rounded-xl">
                                <TabsTrigger value="all">ټول</TabsTrigger>
                                <TabsTrigger value="photos">انځورونه</TabsTrigger>
                                <TabsTrigger value="videos">ویډیوګانې</TabsTrigger>
                                <TabsTrigger value="audio">آډیو</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <MediaGrid
                            items={filteredItems}
                            isLoading={isLoadingMedia}
                            page={page}
                            totalPages={mediaData?.last_page || 1}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}

function MediaGrid({ items, isLoading, page, totalPages, onPageChange }: {
    items: any[],
    isLoading: boolean,
    page: number,
    totalPages: number,
    onPageChange: (p: number) => void
}) {
    if (isLoading) return <LoadingSpinner />;

    if (items.length === 0) return <div className="text-center py-20 text-slate-500">هیڅ معلومات شتون نلري</div>;

    return (
        <>
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="break-inside-avoid mb-4">
                        {item.type === 'image' && (
                            <div className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
                                <img src={item.url} alt={item.title} className="w-full h-auto" loading="lazy" />
                            </div>
                        )}
                        {item.type === 'video' && (
                            <Card className="overflow-hidden border-0 shadow-sm">
                                <div className="relative aspect-video bg-black">
                                    {isYouTubeUrl(item.url) ? (
                                        <iframe src={getYouTubeEmbedUrl(item.url)} className="w-full h-full" allowFullScreen />
                                    ) : (
                                        <video src={item.url} controls className="w-full h-full" />
                                    )}
                                </div>
                            </Card>
                        )}
                        {item.type === 'audio' && (
                            <Card className="p-4 flex items-center gap-3 border-l-4 border-emerald-500 shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <Music className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{item.title}</p>
                                    <audio src={item.url} controls className="w-full h-8 mt-1" />
                                </div>
                            </Card>
                        )}
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-10 flex justify-center dir-ltr">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => onPageChange(Math.max(1, page - 1))}
                                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <PaginationItem key={p}>
                                    <PaginationLink
                                        isActive={page === p}
                                        onClick={() => onPageChange(p)}
                                        className="cursor-pointer"
                                    >
                                        {p}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                                    className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </>
    );
}

// Helpers
function isYouTubeUrl(url: string) { return url.includes('youtube') || url.includes('youtu.be'); }
function getYouTubeEmbedUrl(url: string) {
    if (url.includes('embed')) return url;
    const v = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${v}`;
}
