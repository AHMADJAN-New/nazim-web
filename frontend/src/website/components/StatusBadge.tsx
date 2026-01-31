import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'published' || lowerStatus === 'active' || lowerStatus === 'verified') {
      return 'default';
    }
    if (lowerStatus === 'draft' || lowerStatus === 'pending' || lowerStatus === 'unverified') {
      return 'secondary';
    }
    if (lowerStatus === 'archived' || lowerStatus === 'deleted' || lowerStatus === 'rejected') {
      return 'destructive';
    }
    return 'outline';
  };

  return (
    <Badge variant={getStatusVariant(status)} className={className}>
      {status}
    </Badge>
  );
}

