import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Search, Filter, CheckCircle, AlertTriangle, Clock, Play, Eye, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RevisionSession {
  id: string;
  date: Date;
  surah: string;
  ayahRange: string;
  status: 'passed' | 'needs_work' | 'partial';
  duration: number;
  notes: string;
  mistakes: number;
  teacherFeedback?: string;
  mediaUrl?: string;
}

export function RevisionHistory() {
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSurah, setFilterSurah] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const queryClient = useQueryClient();

  const { data: revisionSessions = [] } = useQuery({
    queryKey: ['revision-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hifz_revisions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as RevisionSession[];
    }
  });

  const { data: surahs = [] } = useQuery({
    queryKey: ['surahs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('surahs').select('name');
      if (error) throw error;
      return (data || []).map((s: any) => s.name);
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('hifz_revisions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hifz_revisions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['revision-sessions'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  const statusOptions = [
    { value: 'passed', label: t('Passed'), color: 'bg-green-100 text-green-800', icon: CheckCircle },
    { value: 'partial', label: t('Partial'), color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    { value: 'needs_work', label: t('Needs Work'), color: 'bg-red-100 text-red-800', icon: AlertTriangle }
  ];

  const getStatusConfig = (status: string) => {
    return statusOptions.find(opt => opt.value === status) || statusOptions[0];
  };

  const filteredSessions = revisionSessions.filter(session => {
    const matchesSearch = session.surah.includes(searchQuery) ||
                         session.ayahRange.includes(searchQuery) ||
                         session.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSurah = filterSurah === 'all' || session.surah === filterSurah;
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesSurah && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('Filter Sessions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t('Search sessions...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
              />
            </div>

            <Select value={filterSurah} onValueChange={setFilterSurah}>
              <SelectTrigger>
                <SelectValue placeholder={t('All Surahs')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Surahs')}</SelectItem>
                {surahs.map((surah) => (
                  <SelectItem key={surah} value={surah}>{surah}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t('All Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Status')}</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <span className="flex items-center gap-2">
                      <status.icon className="h-4 w-4" />
                      {status.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? format(dateRange.from, "PPP") : t('Date Range')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Passed')}</p>
                <p className="text-lg font-semibold">
                  {filteredSessions.filter(s => s.status === 'passed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Partial')}</p>
                <p className="text-lg font-semibold">
                  {filteredSessions.filter(s => s.status === 'partial').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Needs Work')}</p>
                <p className="text-lg font-semibold">
                  {filteredSessions.filter(s => s.status === 'needs_work').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Avg Duration')}</p>
                <p className="text-lg font-semibold">
                  {Math.round(filteredSessions.reduce((acc, s) => acc + s.duration, 0) / filteredSessions.length || 0)} {t('min')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('Revision Timeline')}</h3>
        
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('No Sessions Found')}</h3>
              <p className="text-muted-foreground">{t('Try adjusting your filters or add a new session.')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => {
              const statusConfig = getStatusConfig(session.status);
              return (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {/* Date Badge */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            {format(session.date, 'MMM')}
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {format(session.date, 'dd')}
                          </span>
                        </div>
                      </div>

                      {/* Session Details */}
                      <div className="flex-1 space-y-2">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div>
                            <h4 className="font-semibold text-lg">
                              {session.surah} - {t('Ayahs')} {session.ayahRange}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {session.duration} {t('minutes')} • {session.mistakes} {t('mistakes')}
                            </p>
                          </div>
                          <Badge className={statusConfig.color}>
                            <statusConfig.icon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        {session.notes && (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            "{session.notes}"
                          </p>
                        )}

                        {session.teacherFeedback && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                            <p className="text-sm font-medium text-blue-800">{t('Teacher Feedback:')}</p>
                            <p className="text-sm text-blue-700">{session.teacherFeedback}</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className={`flex gap-2 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t('View Details')}
                          </Button>
                          {session.mediaUrl && (
                            <Button variant="outline" size="sm">
                              <Play className="h-4 w-4 mr-2" />
                              {t('Play Recording')}
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            {t('Export')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}