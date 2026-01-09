import { GraduationCap, CheckCircle, XCircle, AlertCircle, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import type { GraduationHistory, GraduationResultStatus } from '@/types/domain/studentHistory';

interface GraduationsSectionProps {
  graduations: GraduationHistory;
}

function getResultBadgeVariant(status: GraduationResultStatus | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'pass':
      return 'default';
    case 'conditional':
      return 'secondary';
    case 'fail':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getResultIcon(status: GraduationResultStatus | null) {
  switch (status) {
    case 'pass':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'conditional':
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    case 'fail':
      return <XCircle className="h-5 w-5 text-red-600" />;
    default:
      return <GraduationCap className="h-5 w-5 text-gray-600" />;
  }
}

export function GraduationsSection({ graduations }: GraduationsSectionProps) {
  const { t } = useLanguage();
  const { summary, graduations: graduationList } = graduations;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{summary.totalGraduations}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.totalGraduations') || 'Total Graduations'}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.passed}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.passed') || 'Passed'}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{summary.conditional}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.conditional') || 'Conditional'}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.failed') || 'Failed'}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graduation List */}
      {graduationList.length > 0 ? (
        <div className="space-y-4">
          {graduationList.map((graduation) => (
            <Card key={graduation.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <GraduationCap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {graduation.batch?.name || t('studentHistory.unknownBatch') || 'Unknown Batch'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {graduation.batch?.class && `${graduation.batch.class} • `}
                        {graduation.batch?.academicYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getResultIcon(graduation.finalResultStatus)}
                    <Badge variant={getResultBadgeVariant(graduation.finalResultStatus)} className="text-sm">
                      {graduation.finalResultStatus || t('studentHistory.pending') || 'Pending'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {graduation.batch?.graduationDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('studentHistory.graduationDate') || 'Graduation Date'}</p>
                      <p className="font-medium">{formatDate(graduation.batch.graduationDate)}</p>
                    </div>
                  )}
                  
                  {graduation.position && (
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('studentHistory.position') || 'Position'}</p>
                        <p className="font-medium text-lg">#{graduation.position}</p>
                      </div>
                    </div>
                  )}
                  
                  {graduation.createdAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('studentHistory.recordedOn') || 'Recorded On'}</p>
                      <p className="font-medium">{formatDate(graduation.createdAt)}</p>
                    </div>
                  )}
                </div>
                
                {graduation.remarks && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">{t('studentHistory.remarks') || 'Remarks'}</p>
                    <p className="text-sm">{graduation.remarks}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('studentHistory.noGraduationRecords') || 'No graduation records found'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

