import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FeeStatement } from '@/components/fees/FeeStatement';
import { useFeeAssignments, useFeePayments, useFeeStructures } from '@/hooks/useFees';
import { useLanguage } from '@/hooks/useLanguage';

export default function StudentFeeStatementPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { data: assignments = [], isLoading: loadingAssignments } = useFeeAssignments({
    studentId: id,
  });
  const { data: payments = [], isLoading: loadingPayments } = useFeePayments({
    studentId: id,
  });
  const { data: structures = [] } = useFeeStructures();

  const isLoading = useMemo(() => loadingAssignments || loadingPayments, [loadingAssignments, loadingPayments]);
  const structureNames = useMemo(
    () => Object.fromEntries(structures.map((s) => [s.id, s.name])),
    [structures],
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t('fees.studentFeeStatement')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : (
            <FeeStatement assignments={assignments} payments={payments} structureNames={structureNames} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

