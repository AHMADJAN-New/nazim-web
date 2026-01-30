import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { WebsitePublicBook } from '@/website/hooks/useWebsiteContent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, BookOpen, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';

export default function PublicLibraryPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const { data: books = [], isLoading } = useQuery({
        queryKey: ['public-library', searchQuery, selectedCategory],
        queryFn: async () => {
            const response = await publicWebsiteApi.getLibrary({
                query: searchQuery || undefined,
                category: selectedCategory || undefined
            });
            return response as unknown as WebsitePublicBook[];
        },
    });

    const categories = Array.from(new Set(books.map(b => b.category).filter(Boolean))) as string[];

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl overflow-x-hidden">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Digital Library</h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Access our collection of Islamic books, research papers, and educational resources.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by title, author, or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
                    <Button
                        variant={selectedCategory === null ? 'default' : 'outline'}
                        onClick={() => setSelectedCategory(null)}
                        size="sm"
                    >
                        All
                    </Button>
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            variant={selectedCategory === cat ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory(cat)}
                            size="sm"
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <LoadingSpinner />
                </div>
            ) : books.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {books.map((book) => (
                        <Link key={book.id} to={`/public-site/library/${book.id}`} className="block group">
                            <Card className="h-full hover:shadow-xl transition-all duration-200 flex flex-col border-slate-200 hover:border-emerald-300 overflow-hidden">
                                <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                                    {(book.cover_image_url || book.cover_image_path) ? (
                                        <img
                                            src={book.cover_image_url || book.cover_image_path || ''}
                                            alt={book.title}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <BookOpen className="h-16 w-16" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-4">
                                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white">
                                            View details <ArrowRight className="h-4 w-4" />
                                        </span>
                                    </div>
                                </div>
                                <CardHeader className="flex-grow">
                                    <div className="flex justify-between items-start gap-2">
                                        <Badge variant="outline" className="text-xs shrink-0">{book.category || 'General'}</Badge>
                                        {book.file_size != null && book.file_size > 0 && (
                                            <span className="text-xs text-slate-500 uppercase shrink-0">
                                                {(book.file_size / 1024 / 1024).toFixed(1)} MB
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="line-clamp-2 text-lg mb-1 group-hover:text-emerald-700 transition-colors" title={book.title}>
                                        {book.title}
                                    </CardTitle>
                                    <div className="text-sm text-slate-500 font-medium">
                                        {book.author || 'Unknown Author'}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm text-slate-600 line-clamp-3">
                                        {book.description || 'No description.'}
                                    </p>
                                </CardContent>
                                <CardFooter className="pt-0 flex items-center justify-between border-t border-slate-100 pt-4">
                                    <span className="text-sm font-medium text-emerald-600">
                                        {(book.file_url || book.file_path) ? 'PDF available' : 'View details'}
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0" />
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No books found</h3>
                    <p className="text-slate-500">Try adjusting your search query or category filter.</p>
                </div>
            )}
        </div>
    );
}
