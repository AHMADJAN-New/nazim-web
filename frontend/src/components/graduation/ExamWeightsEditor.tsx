import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface Exam {
  id: string;
  name: string;
}

interface ExamWeightsEditorProps {
  examIds: string[];
  weights: Record<string, number>;
  onChange: (weights: Record<string, number>) => void;
  exams: Exam[];
}

export function ExamWeightsEditor({
  examIds,
  weights,
  onChange,
  exams,
}: ExamWeightsEditorProps) {
  const { t } = useLanguage();

  // Calculate total weight
  const totalWeight = useMemo(() => {
    return examIds.reduce((sum, examId) => {
      return sum + (weights[examId] || 0);
    }, 0);
  }, [examIds, weights]);

  // Get exam names
  const examNameById = useMemo(() => {
    return Object.fromEntries(exams.map((exam) => [exam.id, exam.name]));
  }, [exams]);

  // Auto-distribute equal weights
  const handleDistributeEqually = () => {
    if (examIds.length === 0) return;
    const equalWeight = 100 / examIds.length;
    const newWeights: Record<string, number> = {};
    examIds.forEach((examId) => {
      newWeights[examId] = Math.round(equalWeight * 100) / 100; // Round to 2 decimals
    });
    // Adjust last weight to ensure sum is exactly 100
    const lastId = examIds[examIds.length - 1];
    const currentSum = examIds.slice(0, -1).reduce((sum, id) => sum + newWeights[id], 0);
    newWeights[lastId] = Math.round((100 - currentSum) * 100) / 100;
    onChange(newWeights);
  };

  // Handle weight change
  const handleWeightChange = (examId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    onChange({
      ...weights,
      [examId]: clampedValue,
    });
  };

  // Disable if only 1 exam selected
  if (examIds.length <= 1) {
    return null;
  }

  const isValid = Math.abs(totalWeight - 100) < 0.01;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t('graduation.exams.weights') || 'Exam Weights'}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDistributeEqually}
        >
          {t('graduation.exams.equalWeights') || 'Distribute Equally'}
        </Button>
      </div>
      <div className="space-y-2 border rounded-md p-3">
        {examIds.map((examId) => {
          const examName = examNameById[examId] || examId;
          const weight = weights[examId] || 0;
          return (
            <div key={examId} className="flex items-center gap-2">
              <Label className="flex-1 text-sm font-normal">{examName}</Label>
              <div className="flex items-center gap-2 w-32">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={weight}
                  onChange={(e) => handleWeightChange(examId, e.target.value)}
                  className="text-right"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className={isValid ? 'text-green-600 dark:text-green-500' : 'text-destructive'}>
          {t('graduation.exams.totalWeight') || 'Total Weight'}: {totalWeight.toFixed(2)}%
        </span>
        {!isValid && (
          <span className="text-destructive text-xs">
            {t('graduation.validation.weightsMustSum100') || 'Weights must sum to 100%'}
          </span>
        )}
      </div>
    </div>
  );
}

