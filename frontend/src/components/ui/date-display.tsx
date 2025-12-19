/**
 * Date Display Components
 * Wrapper components for displaying dates in user's preferred calendar
 */

import { useDateFormatter } from '@/hooks/useDatePreference';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DateDisplayProps {
  date: Date | string;
  className?: string;
  fallback?: string;
}

interface DateTimeDisplayProps extends DateDisplayProps {
  showTime?: boolean;
}

interface DateBadgeProps extends DateDisplayProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

/**
 * Display a date in the user's preferred calendar format
 * Usage: <DateDisplay date={new Date()} />
 */
export function DateDisplay({ date, className, fallback = '-' }: DateDisplayProps) {
  const { formatDate } = useDateFormatter();

  if (!date) return <span className={className}>{fallback}</span>;

  try {
    const formatted = formatDate(date);
    return <span className={className}>{formatted}</span>;
  } catch {
    return <span className={className}>{fallback}</span>;
  }
}

/**
 * Display a date with time in the user's preferred calendar format
 * Usage: <DateTimeDisplay date={new Date()} />
 */
export function DateTimeDisplay({ date, className, fallback = '-', showTime = true }: DateTimeDisplayProps) {
  const { formatDate, formatDateTime } = useDateFormatter();

  if (!date) return <span className={className}>{fallback}</span>;

  try {
    const formatted = showTime ? formatDateTime(date) : formatDate(date);
    return <span className={className}>{formatted}</span>;
  } catch {
    return <span className={className}>{fallback}</span>;
  }
}

/**
 * Display a short date (e.g., "Dec 10") in the user's preferred calendar format
 * Usage: <ShortDateDisplay date={new Date()} />
 */
export function ShortDateDisplay({ date, className, fallback = '-' }: DateDisplayProps) {
  const { formatShortDate } = useDateFormatter();

  if (!date) return <span className={className}>{fallback}</span>;

  try {
    const formatted = formatShortDate(date);
    return <span className={className}>{formatted}</span>;
  } catch {
    return <span className={className}>{fallback}</span>;
  }
}

/**
 * Display a date as a badge in the user's preferred calendar format
 * Usage: <DateBadge date={new Date()} variant="secondary" />
 */
export function DateBadge({ date, className, fallback = '-', variant = 'secondary' }: DateBadgeProps) {
  const { formatDate } = useDateFormatter();

  if (!date) return <Badge variant={variant} className={className}>{fallback}</Badge>;

  try {
    const formatted = formatDate(date);
    return <Badge variant={variant} className={className}>{formatted}</Badge>;
  } catch {
    return <Badge variant={variant} className={className}>{fallback}</Badge>;
  }
}

/**
 * Display a short date as a badge
 * Usage: <ShortDateBadge date={new Date()} />
 */
export function ShortDateBadge({ date, className, fallback = '-', variant = 'secondary' }: DateBadgeProps) {
  const { formatShortDate } = useDateFormatter();

  if (!date) return <Badge variant={variant} className={className}>{fallback}</Badge>;

  try {
    const formatted = formatShortDate(date);
    return <Badge variant={variant} className={className}>{formatted}</Badge>;
  } catch {
    return <Badge variant={variant} className={className}>{fallback}</Badge>;
  }
}

/**
 * Display a date range in the user's preferred calendar format
 * Usage: <DateRangeDisplay startDate={start} endDate={end} />
 */
interface DateRangeDisplayProps {
  startDate: Date | string;
  endDate: Date | string;
  separator?: string;
  className?: string;
  fallback?: string;
}

export function DateRangeDisplay({
  startDate,
  endDate,
  separator = ' - ',
  className,
  fallback = '-',
}: DateRangeDisplayProps) {
  const { formatDate } = useDateFormatter();

  if (!startDate || !endDate) return <span className={className}>{fallback}</span>;

  try {
    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    return (
      <span className={className}>
        {formattedStart}
        {separator}
        {formattedEnd}
      </span>
    );
  } catch {
    return <span className={className}>{fallback}</span>;
  }
}

/**
 * Display a date in a table cell with proper formatting
 * Usage: <TableDateCell date={new Date()} />
 */
export function TableDateCell({ date, className, fallback = '-' }: DateDisplayProps) {
  return (
    <div className={cn('text-sm', className)}>
      <DateDisplay date={date} fallback={fallback} />
    </div>
  );
}

/**
 * Display a datetime in a table cell with proper formatting
 * Usage: <TableDateTimeCell date={new Date()} />
 */
export function TableDateTimeCell({ date, className, fallback = '-' }: DateDisplayProps) {
  return (
    <div className={cn('text-sm', className)}>
      <DateTimeDisplay date={date} fallback={fallback} />
    </div>
  );
}
