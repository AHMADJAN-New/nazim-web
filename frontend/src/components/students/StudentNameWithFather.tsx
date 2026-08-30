import { cn } from '@/lib/utils';

interface StudentNameWithFatherProps {
  fullName?: string | null;
  fatherName?: string | null;
  fatherLabel: string;
  nameClassName?: string;
  fatherClassName?: string;
  className?: string;
  fallbackName?: string;
}

export function StudentNameWithFather({
  fullName,
  fatherName,
  fatherLabel,
  nameClassName,
  fatherClassName,
  className,
  fallbackName = '—',
}: StudentNameWithFatherProps) {
  const displayName = fullName?.trim() || fallbackName;
  const displayFather = fatherName?.trim();

  return (
    <div className={cn('min-w-0', className)}>
      <div className={cn('font-semibold break-words', nameClassName)}>{displayName}</div>
      {displayFather ? (
        <div className={cn('text-xs text-muted-foreground break-words', fatherClassName)}>
          {fatherLabel}: {displayFather}
        </div>
      ) : null}
    </div>
  );
}
