import { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle, 
  FileText, 
  CreditCard, 
  Award, 
  ArrowRightLeft,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import type { HistoryEvent, HistoryEventType } from '@/types/domain/studentHistory';

interface StudentHistoryTimelineProps {
  events: HistoryEvent[];
}

const eventTypeConfig: Record<HistoryEventType, { icon: React.ReactNode; color: string; bgColor: string }> = {
  admission: {
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  exam: {
    icon: <FileText className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  fee_payment: {
    icon: <CreditCard className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  library_loan: {
    icon: <BookOpen className="h-4 w-4" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  id_card: {
    icon: <CreditCard className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  course: {
    icon: <Award className="h-4 w-4" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  graduation: {
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  attendance: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
};

function getStatusBadgeVariant(status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!status) return 'secondary';
  const lowerStatus = status.toLowerCase();
  if (['active', 'present', 'paid', 'completed', 'pass', 'printed', 'returned'].includes(lowerStatus)) {
    return 'default';
  }
  if (['pending', 'enrolled', 'processing'].includes(lowerStatus)) {
    return 'secondary';
  }
  if (['absent', 'overdue', 'fail', 'dropped'].includes(lowerStatus)) {
    return 'destructive';
  }
  return 'outline';
}

interface TimelineEventCardProps {
  event: HistoryEvent;
}

function TimelineEventCard({ event }: TimelineEventCardProps) {
  const config = eventTypeConfig[event.type] || eventTypeConfig.admission;
  
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[17px] top-8 bottom-0 w-0.5 bg-border last:hidden" />
      
      {/* Icon */}
      <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.bgColor} ${config.color}`}>
        {config.icon}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <Card className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                {event.date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(event.date)}
                  </p>
                )}
              </div>
              {event.status && (
                <Badge variant={getStatusBadgeVariant(event.status)} className="shrink-0 text-xs">
                  {event.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function StudentHistoryTimeline({ events }: StudentHistoryTimelineProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<HistoryEventType>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  // Get all event types present in the data
  const availableTypes = useMemo(() => {
    const types = new Set<HistoryEventType>();
    events.forEach(event => types.add(event.type));
    return Array.from(types);
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Type filter
      if (selectedTypes.size > 0 && !selectedTypes.has(event.type)) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          (event.status?.toLowerCase().includes(query) ?? false)
        );
      }
      return true;
    });
  }, [events, selectedTypes, searchQuery]);

  // Group events by year
  const eventsByYear = useMemo(() => {
    const grouped: Record<string, HistoryEvent[]> = {};
    filteredEvents.forEach(event => {
      const year = event.date ? new Date(event.date).getFullYear().toString() : 'Unknown';
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(event);
    });
    // Sort years descending
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredEvents]);

  // Initialize expanded years (expand current year by default)
  useMemo(() => {
    if (expandedYears.size === 0 && eventsByYear.length > 0) {
      const currentYear = new Date().getFullYear().toString();
      const years = eventsByYear.map(([year]) => year);
      if (years.includes(currentYear)) {
        setExpandedYears(new Set([currentYear]));
      } else if (years.length > 0) {
        setExpandedYears(new Set([years[0]]));
      }
    }
  }, [eventsByYear, expandedYears.size]);

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const toggleType = (type: HistoryEventType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const eventTypeLabels: Record<HistoryEventType, string> = {
    admission: t('studentHistory.admissions') || 'Admissions',
    exam: t('studentHistory.exams') || 'Exams',
    fee_payment: t('studentHistory.feePayments') || 'Fee Payments',
    library_loan: t('studentHistory.libraryLoans') || 'Library Loans',
    id_card: t('studentHistory.idCards') || 'ID Cards',
    course: t('studentHistory.courses') || 'Courses',
    graduation: t('studentHistory.graduations') || 'Graduations',
    attendance: t('studentHistory.attendance') || 'Attendance',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('studentHistory.timeline') || 'Timeline'}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.filters') || 'Filters'}</span>
            </Button>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent className="pt-0 space-y-4">
            <Input
              placeholder={t('studentHistory.searchTimeline') || 'Search timeline...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            
            <div className="flex flex-wrap gap-3">
              {availableTypes.map(type => {
                const config = eventTypeConfig[type];
                const isSelected = selectedTypes.has(type);
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                      isSelected ? `${config.bgColor} border-current ${config.color}` : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleType(type)}
                      className="sr-only"
                    />
                    {config.icon}
                    <span className="text-sm">{eventTypeLabels[type]}</span>
                  </label>
                );
              })}
            </div>
            
            {selectedTypes.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTypes(new Set())}
              >
                {t('common.clearFilters') || 'Clear filters'}
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Timeline grouped by year */}
      <div className="space-y-4">
        {eventsByYear.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('studentHistory.noEventsFound') || 'No events found'}
            </CardContent>
          </Card>
        ) : (
          eventsByYear.map(([year, yearEvents]) => (
            <Collapsible
              key={year}
              open={expandedYears.has(year)}
              onOpenChange={() => toggleYear(year)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{year}</CardTitle>
                        <Badge variant="secondary">{yearEvents.length} {t('studentHistory.events') || 'events'}</Badge>
                      </div>
                      {expandedYears.has(year) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-0">
                      {yearEvents.map(event => (
                        <TimelineEventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}

