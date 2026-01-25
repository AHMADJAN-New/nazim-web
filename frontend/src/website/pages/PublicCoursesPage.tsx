import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { WebsiteCourse } from '@/website/hooks/useWebsiteContent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, GraduationCap, Clock, User, BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';

export default function PublicCoursesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const { data: courses = [], isLoading } = useQuery({
        queryKey: ['public-courses', searchQuery, selectedCategory],
        queryFn: async () => {
            const response = await publicWebsiteApi.getCourses({
                category: selectedCategory || undefined
            });
            // Client-side search filtering since API only supports category/level
            const data = response as unknown as WebsiteCourse[];
            if (!searchQuery) return data;
            return data.filter(c =>
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        },
    });

    const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean))) as string[];

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Academic Programs</h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Explore our range of comprehensive Islamic educational courses designed for all levels.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search courses..."
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
            ) : courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <Card key={course.id} className="hover:shadow-lg transition-shadow flex flex-col border-none shadow-md">
                            <div className="h-48 bg-emerald-900 relative overflow-hidden flex items-center justify-center">
                                {course.cover_image_path ? (
                                    <img
                                        src={course.cover_image_path}
                                        alt={course.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <GraduationCap className="h-20 w-20 text-emerald-800" />
                                )}
                                <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-emerald-900 shadow-sm uppercase tracking-wide">
                                    {course.level || 'Course'}
                                </div>
                            </div>
                            <CardHeader>
                                <div className="flex justify-between items-center mb-2">
                                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">{course.category || 'General'}</Badge>
                                </div>
                                <CardTitle className="text-xl mb-1">{course.title}</CardTitle>
                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                                    {course.duration && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" /> {course.duration}
                                        </div>
                                    )}
                                    {course.instructor_name && (
                                        <div className="flex items-center gap-1">
                                            <User className="h-4 w-4" /> {course.instructor_name}
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-slate-600 line-clamp-3">
                                    {course.description}
                                </p>
                            </CardContent>
                            <CardFooter className="pt-0 border-t bg-slate-50/50 p-6">
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" asChild>
                                    <a href={course.enrollment_cta || '#contact'} className="flex items-center justify-center gap-2">
                                        {course.enrollment_cta ? 'Enroll Now' : 'Inquire for Details'}
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-lg">
                    <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No courses found</h3>
                </div>
            )}
        </div>
    );
}
