import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { publicWebsiteApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/website/components/layout/PublicHeader';
import { PublicFooter } from '@/website/components/layout/PublicFooter';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  BookOpen,
  Users,
  Calendar,
  ArrowRight,
  GraduationCap,
  Heart,
  Clock,
  MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { WebsiteCourse } from '@/website/hooks/useWebsiteContent';

export default function PublicWebsitePage() {
  const { t } = useLanguage();

  const siteQuery = useQuery({
    queryKey: ['public-site'],
    queryFn: () => publicWebsiteApi.getSite(),
  });

  const site = (siteQuery.data as any) || {};
  const settings = site.settings || {};
  const school = site.school || {};
  const posts = site.posts || [];
  const events = site.events || [];

  // Fetch courses from API
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['public-courses-featured'],
    queryFn: async () => {
      const response = await publicWebsiteApi.getCourses();
      // Handle both direct array and wrapped response
      let data: WebsiteCourse[] = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
        data = (response as any).data;
      } else {
        if (import.meta.env.DEV) {
          console.warn('[PublicWebsitePage] Unexpected courses response format:', response);
        }
        return [];
      }
      
      // Backend already filters for published, but double-check for safety
      // Get featured courses first, then top courses by sort_order, limit to 6
      return data
        .filter(course => course.status === 'published')
        .sort((a, b) => {
          // Featured courses first
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          // Then by sort_order
          return a.sort_order - b.sort_order;
        })
        .slice(0, 6);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

      // Map courses to program cards format
      const programs = useMemo(() => {
        return courses.map((course) => {
          // Choose icon based on category or default
          let icon = <GraduationCap className="h-6 w-6 text-emerald-600" />;
          if (course.category) {
            const categoryLower = course.category.toLowerCase();
            if (categoryLower.includes('hifz') || categoryLower.includes('quran') || categoryLower.includes('memorization')) {
              icon = <BookOpen className="h-6 w-6 text-emerald-600" />;
            } else if (categoryLower.includes('alim') || categoryLower.includes('theology') || categoryLower.includes('fiqh')) {
              icon = <GraduationCap className="h-6 w-6 text-emerald-600" />;
            } else if (categoryLower.includes('community') || categoryLower.includes('service')) {
              icon = <Users className="h-6 w-6 text-emerald-600" />;
            }
          }

          return {
            id: course.id,
            title: course.title,
            description: course.description || 'Explore this comprehensive program designed to enrich your Islamic knowledge and practice.',
            icon,
            imageUrl: course.cover_image_url || course.cover_image_path || null,
            link: `/public-site/courses`,
            category: course.category,
            isFeatured: course.is_featured,
          };
        });
      }, [courses]);

  const stats = [
    { label: "Students", value: "500+", icon: <Users className="h-5 w-5" /> },
    { label: "Teachers", value: "45", icon: <GraduationCap className="h-5 w-5" /> },
    { label: "Years Served", value: "20+", icon: <Clock className="h-5 w-5" /> },
  ];

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative bg-emerald-900 text-white overflow-hidden">
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className="container relative mx-auto px-4 py-24 md:py-32 flex flex-col items-center text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium bg-emerald-800 text-emerald-100 hover:bg-emerald-700 border-none">
            Welcome to {school?.school_name || 'Nazim Academy'}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl leading-tight">
            Nurturing Faith, <span className="text-emerald-400">Knowledge</span>, and Character
          </h1>
          <p className="text-lg md:text-xl text-emerald-100 mb-10 max-w-2xl leading-relaxed">
            Provides a comprehensive Islamic education integrated with academic excellence, fostering a generation of leaders grounded in faith.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 h-12 text-base">
              Apply Now
            </Button>
            <Button size="lg" variant="outline" className="border-emerald-200 text-emerald-100 hover:bg-emerald-800 hover:text-white h-12 text-base">
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* Info & Stats Bar */}
      <section className="bg-white border-b relative z-10 -mt-8 mx-4 md:mx-auto max-w-6xl rounded-xl shadow-lg p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x gap-6">
          <div className="flex items-center gap-4 py-2 px-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-700">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Visit Us</h4>
              <p className="text-sm text-slate-500">123 Islamic Center Dr</p>
            </div>
          </div>
          <div className="flex items-center gap-4 py-2 px-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-700">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Prayer Times</h4>
              <p className="text-sm text-slate-500">Dhuhr: 1:30 PM • Asr: 5:15 PM</p>
            </div>
          </div>
          <div className="flex items-center gap-4 py-2 px-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-700">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Support Us</h4>
              <p className="text-sm text-slate-500">Donate to build our future</p>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Educational Programs</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            We offer a range of programs designed to cater to different age groups and learning needs, all rooted in authentic Islamic tradition.
          </p>
        </div>

        {coursesLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : programs.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-3">
            {programs.map((program) => (
              <Card key={program.id} className="border-none shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                {program.imageUrl ? (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={program.imageUrl}
                      alt={program.title}
                      className="w-full h-full object-cover"
                    />
                    {program.isFeatured && (
                      <Badge variant="secondary" className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                        Featured
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="relative h-48 w-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-lg flex items-center justify-center">
                      {program.icon}
                    </div>
                    {program.isFeatured && (
                      <Badge variant="secondary" className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                        Featured
                      </Badge>
                    )}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{program.title}</CardTitle>
                  {program.category && (
                    <Badge variant="outline" className="mt-2 w-fit text-xs">
                      {program.category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 line-clamp-3">{program.description}</p>
                </CardContent>
                <CardFooter>
                  <Link to={program.link} className="text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-2 group">
                    Learn more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Programs will be displayed here once they are published.</p>
            <Link to="/public-site/courses" className="text-emerald-600 font-medium hover:text-emerald-700 mt-4 inline-block">
              View all courses →
            </Link>
          </div>
        )}

        {programs.length > 0 && (
          <div className="text-center mt-12">
            <Link to="/public-site/courses">
              <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                View All Programs
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Latest Updates Section (News & Events) */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Latest Updates</h2>
              <p className="text-slate-600">Stay connected with our community news and upcoming events.</p>
            </div>
            <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">View All Updates</Button>
          </div>

          {(posts.length > 0 || events.length > 0) && (
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main News Area */}
              <div className="lg:col-span-2 space-y-6">
                {posts.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {posts.map((post: any) => (
                      <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        {/* Placeholder image until media is handled */}
                        <div className="h-48 bg-slate-100 flex items-center justify-center text-slate-300">
                          <BookOpen className="h-10 w-10" />
                        </div>
                        <CardHeader>
                          <Badge variant="secondary" className="w-fit mb-2">{post.category?.name || 'News'}</Badge>
                          <Link to={`/public-site/posts/${post.slug || post.id}`}>
                            <CardTitle className="line-clamp-2 hover:text-emerald-600 transition-colors cursor-pointer">
                              {post.title}
                            </CardTitle>
                          </Link>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-500 text-sm line-clamp-3">
                            {post.excerpt || post.content?.substring(0, 100) + '...'}
                          </p>
                        </CardContent>
                        <CardFooter className="text-xs text-slate-400">
                          {post.published_at ? new Date(post.published_at).toLocaleDateString() : ''}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No recent news available.</p>
                )}
              </div>

              {/* Events Sidebar */}
              <div className="space-y-6">
                {events.length > 0 && (
                  <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                      Upcoming Events
                    </h3>
                    <div className="space-y-6">
                      {events.map((event: any) => (
                        <Link to={`/public-site/events/${event.id}`} key={event.id}>
                          <div className="flex gap-4 group cursor-pointer">
                            <div className="flex flex-col items-center justify-center bg-emerald-50 w-16 h-16 rounded-lg text-emerald-700 shrink-0">
                              <span className="text-xs font-bold uppercase">
                                {event.starts_at ? new Date(event.starts_at).toLocaleString('default', { month: 'short' }) : 'EVT'}
                              </span>
                              <span className="text-xl font-bold">
                                {event.starts_at ? new Date(event.starts_at).getDate() : ''}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold group-hover:text-emerald-600 transition-colors line-clamp-1">
                                {event.title}
                              </h4>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {event.location}
                              </p>
                              <span className="text-xs text-emerald-600 font-medium mt-1 block">
                                {event.starts_at ? new Date(event.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Button variant="link" className="w-full mt-6 text-emerald-600">Full Calendar</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {posts.length === 0 && events.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">More updates coming soon.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-900 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Join Our Community?</h2>
          <p className="text-emerald-100 max-w-2xl mx-auto mb-10 text-lg">
            Admissions for the upcoming academic year are now open. Secure your child's future with an education that matters.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-8 h-12">
              Apply for Admission
            </Button>
            <Button variant="outline" className="border-emerald-400 text-emerald-100 hover:bg-emerald-800 hover:text-white h-12">
              Schedule a Tour
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
