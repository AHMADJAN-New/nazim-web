import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { WebsiteCourse } from '@/website/hooks/useWebsiteContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { GraduationCap, Clock, User, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';

export default function PublicCourseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const schoolIdFromUrl = searchParams.get('school_id');

    const { data: course, isLoading, error } = useQuery({
        queryKey: ['public-course', id, schoolIdFromUrl ?? null],
        queryFn: async () => {
            if (!id) return null;
            const params = schoolIdFromUrl ? { school_id: schoolIdFromUrl } : undefined;
            const response = await publicWebsiteApi.getCourse(id, params);
            return response as unknown as WebsiteCourse;
        },
        enabled: !!id,
    });

    const admissionsLink = `/public-site/admissions${id ? `?course=${id}` : ''}`;
    const programsLink = schoolIdFromUrl ? `/public-site/programs?school_id=${schoolIdFromUrl}` : '/public-site/programs';

    if (!id) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
                <p className="text-slate-600">No course selected.</p>
                <Button asChild variant="outline" className="mt-4">
                    <Link to="/public-site/programs">View all programs</Link>
                </Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <LoadingSpinner />
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Course not found</h2>
                <p className="text-slate-600 mb-4">The course you requested may no longer be available.</p>
                <Button asChild variant="outline">
                    <Link to={programsLink}>View all programs</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl overflow-x-hidden">
            <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
                <Link to={programsLink} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4" />
                    Back to programs
                </Link>
            </Button>

            <Card className="border-none shadow-lg overflow-hidden">
                <div className="h-56 md:h-72 bg-emerald-900 relative flex items-center justify-center">
                    {(course.cover_image_url || course.cover_image_path) ? (
                        <img
                            src={course.cover_image_url || course.cover_image_path || ''}
                            alt={course.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <GraduationCap className="h-24 w-24 text-emerald-800" />
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-emerald-900 shadow-sm uppercase tracking-wide">
                        {course.level || 'Course'}
                    </div>
                </div>
                <CardHeader className="space-y-2">
                    <div className="text-sm text-emerald-600 font-medium">{course.category || 'General'}</div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{course.title}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        {course.duration && (
                            <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" /> {course.duration}
                            </span>
                        )}
                        {course.instructor_name && (
                            <span className="flex items-center gap-1">
                                <User className="h-4 w-4" /> {course.instructor_name}
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="prose prose-slate max-w-none">
                    <p className="text-slate-600 whitespace-pre-wrap">
                        {course.description || 'No description available.'}
                    </p>
                </CardContent>
                <CardFooter className="border-t bg-slate-50/50 p-6 flex flex-col sm:flex-row gap-3">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" size="lg" asChild>
                        <Link to={admissionsLink}>Apply for Admission</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link to={programsLink}>View all programs</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
