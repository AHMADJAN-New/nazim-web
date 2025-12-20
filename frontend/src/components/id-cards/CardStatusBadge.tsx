import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { CheckCircle2, XCircle, Clock, CreditCard } from 'lucide-react';

interface CardStatusBadgeProps {
  isAssigned?: boolean;
  isPrinted?: boolean;
  feePaid?: boolean;
  variant?: 'default' | 'compact';
}

export function CardStatusBadge({
  isAssigned = false,
  isPrinted = false,
  feePaid = false,
  variant = 'default',
}: CardStatusBadgeProps) {
  const { t } = useLanguage();

  if (variant === 'compact') {
    // Compact version: show only icons
    return (
      <div className="flex items-center gap-1">
        {isAssigned ? (
          <CheckCircle2 className="h-3 w-3 text-green-600" title={t('idCards.status.assigned')} />
        ) : (
          <XCircle className="h-3 w-3 text-gray-400" title={t('idCards.status.notAssigned')} />
        )}
        {isAssigned && (
          <>
            {isPrinted ? (
              <CheckCircle2 className="h-3 w-3 text-blue-600" title={t('idCards.status.printed')} />
            ) : (
              <Clock className="h-3 w-3 text-orange-500" title={t('idCards.status.unprinted')} />
            )}
            {feePaid ? (
              <CreditCard className="h-3 w-3 text-green-600" title={t('idCards.status.feePaid')} />
            ) : (
              <CreditCard className="h-3 w-3 text-red-500" title={t('idCards.status.feeUnpaid')} />
            )}
          </>
        )}
      </div>
    );
  }

  // Default version: show badges with text
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Assigned Status */}
      {isAssigned ? (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t('idCards.status.assigned')}
        </Badge>
      ) : (
        <Badge variant="outline" className="border-gray-300 text-gray-600">
          <XCircle className="h-3 w-3 mr-1" />
          {t('idCards.status.notAssigned')}
        </Badge>
      )}

      {/* Printed Status - only show if assigned */}
      {isAssigned && (
        isPrinted ? (
          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('idCards.status.printed')}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-orange-300 text-orange-600">
            <Clock className="h-3 w-3 mr-1" />
            {t('idCards.status.unprinted')}
          </Badge>
        )
      )}

      {/* Fee Status - only show if assigned */}
      {isAssigned && (
        feePaid ? (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            <CreditCard className="h-3 w-3 mr-1" />
            {t('idCards.status.feePaid')}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-red-300 text-red-600">
            <CreditCard className="h-3 w-3 mr-1" />
            {t('idCards.status.feeUnpaid')}
          </Badge>
        )
      )}
    </div>
  );
}

