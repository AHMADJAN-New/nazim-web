import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/useLanguage';

export interface AttendanceSettings {
  minAttendancePercentage: number;
  requireAttendance: boolean;
  excludeApprovedLeaves: boolean;
}

interface AttendanceSettingsProps {
  minAttendancePercentage: number;
  requireAttendance: boolean;
  excludeApprovedLeaves: boolean;
  onChange: (settings: AttendanceSettings) => void;
}

export function AttendanceSettings({
  minAttendancePercentage,
  requireAttendance,
  excludeApprovedLeaves,
  onChange,
}: AttendanceSettingsProps) {
  const { t } = useLanguage();

  const handleRequireAttendanceChange = (checked: boolean) => {
    onChange({
      minAttendancePercentage: checked ? minAttendancePercentage : 75.0,
      requireAttendance: checked,
      excludeApprovedLeaves,
    });
  };

  const handleMinPercentageChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    onChange({
      minAttendancePercentage: clampedValue,
      requireAttendance,
      excludeApprovedLeaves,
    });
  };

  const handleExcludeLeavesChange = (checked: boolean) => {
    onChange({
      minAttendancePercentage,
      requireAttendance,
      excludeApprovedLeaves: checked,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="require-attendance"
            checked={requireAttendance}
            onCheckedChange={handleRequireAttendanceChange}
          />
          <div className="flex-1">
            <Label htmlFor="require-attendance" className="text-base font-semibold cursor-pointer">
              {t('toast.graduation.attendance.requireAttendance') || 'Require Attendance'}
            </Label>
            <CardDescription className="mt-1">
              {t('toast.graduation.attendance.requireAttendance') || 'Require Attendance'}
              {' - '}
              {requireAttendance
                ? 'Students must meet attendance requirements to graduate'
                : 'Attendance requirements are not enforced'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {requireAttendance && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="min-attendance-percentage">
              {t('toast.graduation.attendance.minPercentage') || 'Minimum Attendance %'}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="min-attendance-percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={minAttendancePercentage}
                onChange={(e) => handleMinPercentageChange(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Students must have at least {minAttendancePercentage}% attendance to be eligible for graduation
            </p>
          </div>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="exclude-approved-leaves"
              checked={excludeApprovedLeaves}
              onCheckedChange={handleExcludeLeavesChange}
            />
            <div className="flex-1">
              <Label htmlFor="exclude-approved-leaves" className="text-sm font-normal cursor-pointer">
                {t('toast.graduation.attendance.excludeLeaves') || 'Exclude Approved Leaves'}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Approved leaves (sick leave, personal leave, etc.) will not count as absences when calculating attendance percentage
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
