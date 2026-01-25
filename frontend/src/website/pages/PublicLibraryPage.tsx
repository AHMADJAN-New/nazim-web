import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { WebsitePublicBook } from '@/website/hooks/useWebsiteContent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Download, FileText, BookOpen } from 'lucide-react';
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
        <div className="container mx-auto px-4 py-12 max-w-7xl">
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
                        <Card key={book.id} className="hover:shadow-lg transition-shadow flex flex-col">
                            <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden group">
                                {book.cover_image_path ? (
                                    <img
                                        src={book.cover_image_path}
                                        alt={book.title}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <BookOpen className="h-16 w-16" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    {book.file_path && (
                                        <Button variant="secondary" size="sm" asChild>
                                            <a href={book.file_path} target="_blank" rel="noreferrer">
                                                <BookOpen className="h-4 w-4 mr-2" /> Read
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <CardHeader>
                                <div className="flex justify-between items-start gap-2">
                                    <Badge variant="outline" className="text-xs">{book.category || 'General'}</Badge>
                                    {book.file_size && (
                                        <span className="text-xs text-slate-500 uppercase">
                                            {(book.file_size / 1024 / 1024).toFixed(1)} MB
                                        </span>
                                    )}
                                </div>
                                <CardTitle className="line-clamp-2 text-lg mb-1" title={book.title}>
                                    {book.title}
                                </CardTitle>
                                <div className="text-sm text-slate-500 font-medium">
                                    {book.author || 'Unknown Author'}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-slate-600 line-clamp-3">
                                    {book.description}
                                </p>
                            </CardContent>
                            <CardFooter className="pt-0">
                                {book.file_path ? (
                                    <Button className="w-full" variant="outline" asChild>
                                        <a href={book.file_path} download className="flex items-center gap-2">
                                            <Download className="h-4 w-4" /> Download PDF
                                        </a>
                                    </Button>
                                ) : (
                                    <Button className="w-full" disabled variant="ghost">
                                        No File Available
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
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
