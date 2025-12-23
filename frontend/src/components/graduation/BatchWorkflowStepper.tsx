import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchWorkflowStepperProps {
  batch: {
    status: 'draft' | 'approved' | 'issued';
    students_count?: number;
    students?: any[];
  };
}

export function BatchWorkflowStepper({ batch }: BatchWorkflowStepperProps) {
  const hasStudents = (batch.students_count || batch.students?.length || 0) > 0;

  const steps = [
    {
      id: 'draft',
      label: 'Draft',
      status:
        batch.status === 'draft'
          ? 'current'
          : batch.status === 'approved' || batch.status === 'issued'
            ? 'completed'
            : 'pending',
    },
    {
      id: 'generated',
      label: 'Students Generated',
      status: hasStudents ? 'completed' : batch.status === 'draft' ? 'pending' : 'pending',
    },
    {
      id: 'approved',
      label: 'Approved',
      status:
        batch.status === 'approved'
          ? 'current'
          : batch.status === 'issued'
            ? 'completed'
            : 'pending',
    },
    {
      id: 'issued',
      label: 'Certificates Issued',
      status: batch.status === 'issued' ? 'current' : 'pending',
    },
  ];

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={cn(
                'rounded-full p-2 transition-colors',
                step.status === 'completed' &&
                  'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
                step.status === 'current' &&
                  'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 ring-2 ring-blue-500 ring-offset-2',
                step.status === 'pending' &&
                  'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
              )}
            >
              {step.status === 'completed' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : step.status === 'current' ? (
                <Clock className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </div>
            <span
              className={cn(
                'text-xs mt-2 text-center max-w-[80px]',
                step.status === 'completed' && 'text-green-600 dark:text-green-400 font-medium',
                step.status === 'current' && 'text-blue-600 dark:text-blue-400 font-semibold',
                step.status === 'pending' && 'text-gray-400'
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-2 transition-colors',
                step.status === 'completed'
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-gray-300 dark:bg-gray-700'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

