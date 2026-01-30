import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { publicWebsiteApi } from '@/lib/api/client';
import { WebsiteGraduate } from '@/website/hooks/useWebsiteContent';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { GraduationCap, Award, Star, Search, Filter } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PublicHeroBackground } from '@/website/components/PublicHeroBackground';

export default function PublicGraduatesPage() {
    const { t } = useLanguage();
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: graduates = [], isLoading } = useQuery({
        queryKey: ['public-graduates', selectedYear],
        queryFn: async () => {
            const response = await publicWebsiteApi.getGraduates({
                year: selectedYear || undefined
            });
            return response as unknown as WebsiteGraduate[];
        },
    });

    const years = Array.from(new Set(graduates.map(g => g.graduation_year).filter(Boolean))).sort().reverse() as number[];

    const filteredGraduates = graduates.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.program?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 bg-slate-50 overflow-x-hidden">
            {/* Hero Section */}
            <section className="relative text-white py-20 overflow-hidden">
                <PublicHeroBackground patternOpacity={0.12} />
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <Badge variant="outline" className="mb-4 text-emerald-200 border-emerald-400">{t('websitePublic.graduatesBadge')}</Badge>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">{t('websitePublic.graduatesTitle')}</h1>
                    <p className="text-lg md:text-xl text-emerald-100 max-w-2xl mx-auto leading-relaxed">
                        {t('websitePublic.graduatesDescription')}
                    </p>
                </div>
            </section>

            {/* Filter & Search Bar */}
            <section className="container mx-auto px-4 -mt-8 relative z-20">
                <Card className="shadow-xl border-0">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                <Input
                                    placeholder={t('websitePublic.searchGraduates')}
                                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-64">
                                <Select
                                    value={selectedYear?.toString() || 'all'}
                                    onValueChange={(val) => setSelectedYear(val === 'all' ? null : parseInt(val))}
                                >
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-slate-500" />
                                            <SelectValue placeholder={t('websitePublic.allYears')} />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('websitePublic.allGraduatingYears')}</SelectItem>
                                        {years.map(year => (
                                            <SelectItem key={year} value={year.toString()}>{t('websitePublic.classOf')} {year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Graduates Grid */}
            <section className="container mx-auto px-4 py-16">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <LoadingSpinner size="lg" />
                        <p className="text-slate-500 font-medium">{t('websitePublic.loadingGraduates')}</p>
                    </div>
                ) : filteredGraduates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredGraduates.map((graduate) => (
                            <div key={graduate.id} className="group bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                                {/* Graduate Photo/Header */}
                                <div className="h-48 bg-emerald-50 relative flex items-center justify-center overflow-hidden">
                                    {(graduate.photo_url || graduate.photo_path) ? (
                                        <div className="w-full h-full relative">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                                            <img
                                                src={graduate.photo_url || graduate.photo_path || ''}
                                                alt={graduate.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-inner">
                                            <GraduationCap className="h-10 w-10 text-emerald-600/50" />
                                        </div>
                                    )}

                                    {/* Badges over image */}
                                    <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
                                        {graduate.is_featured && (
                                            <Badge className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 border-0 shadow-sm gap-1 pl-1.5">
                                                <Star className="h-3 w-3 fill-yellow-950" /> Featured
                                            </Badge>
                                        )}
                                        <Badge variant="secondary" className="bg-emerald-900/90 hover:bg-emerald-900 text-white border-0 backdrop-blur-sm shadow-sm">
                                            {graduate.graduation_year}
                                        </Badge>
                                    </div>

                                    {/* Name overlay on image if photo exists */}
                                    {(graduate.photo_url || graduate.photo_path) && (
                                        <div className="absolute bottom-4 left-4 z-20 text-white">
                                            <h3 className="font-bold text-lg leading-tight line-clamp-2">{graduate.name}</h3>
                                            <p className="text-emerald-100 text-xs mt-1 font-medium">{graduate.program || 'Graduate'}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Content Body */}
                                <div className="p-5 flex flex-col flex-1">
                                    {!(graduate.photo_url || graduate.photo_path) && (
                                        <div className="mb-4">
                                            <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">{graduate.name}</h3>
                                            <p className="text-emerald-600 text-sm font-medium">{graduate.program || 'Graduate'}</p>
                                        </div>
                                    )}

                                    {graduate.bio ? (
                                        <p className="text-slate-600 text-sm line-clamp-4 leading-relaxed flex-1">
                                            {graduate.bio}
                                        </p>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center py-4 opacity-50">
                                            <div className="h-1 w-12 bg-slate-200 rounded-full"></div>
                                        </div>
                                    )}

                                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium uppercase tracking-wider">
                                        <span className="flex items-center gap-1">
                                            <GraduationCap className="h-3 w-3" />
                                            Alumnus
                                        </span>
                                        {graduate.program && (
                                            <span className="text-emerald-600">{graduate.program}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Award className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No graduates found</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            {searchQuery || selectedYear
                                ? "We couldn't find any graduates matching your search filters. Try adjusting them."
                                : "Our digital alumni records are currently being updated. Please check back soon."}
                        </p>
                        {(searchQuery || selectedYear) && (
                            <Button
                                variant="outline"
                                className="mt-6 border-slate-200"
                                onClick={() => { setSearchQuery(''); setSelectedYear(null); }}
                            >
                                Clear all filters
                            </Button>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
