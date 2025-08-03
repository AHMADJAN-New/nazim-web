import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/hooks/useAuth';

export default function AcademicSettingsPage() {
  const { user } = useAuth();
  const { data: settings } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  const [formData, setFormData] = useState({
    academic_year_start_month: settings?.academic_year_start_month || 4,
    academic_year_end_month: settings?.academic_year_end_month || 3,
    max_students_per_class: settings?.max_students_per_class || 30,
    passing_grade_percentage: settings?.passing_grade_percentage || 60,
  });

  const handleSave = async () => {
    if (!user) return;
    await updateSettings.mutateAsync(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="w-8 h-8" />
            Academic Settings
          </h1>
          <p className="text-muted-foreground">
            Configure academic year and educational parameters
          </p>
        </div>
        <Button onClick={handleSave} size="lg">
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Academic Year Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="academic_year_start_month">Academic Year Start Month</Label>
              <Select
                value={formData.academic_year_start_month.toString()}
                onValueChange={(value) => handleInputChange('academic_year_start_month', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: 1, label: 'January' }, { value: 2, label: 'February' },
                    { value: 3, label: 'March' }, { value: 4, label: 'April' },
                    { value: 5, label: 'May' }, { value: 6, label: 'June' },
                    { value: 7, label: 'July' }, { value: 8, label: 'August' },
                    { value: 9, label: 'September' }, { value: 10, label: 'October' },
                    { value: 11, label: 'November' }, { value: 12, label: 'December' }
                  ].map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="academic_year_end_month">Academic Year End Month</Label>
              <Select
                value={formData.academic_year_end_month.toString()}
                onValueChange={(value) => handleInputChange('academic_year_end_month', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: 1, label: 'January' }, { value: 2, label: 'February' },
                    { value: 3, label: 'March' }, { value: 4, label: 'April' },
                    { value: 5, label: 'May' }, { value: 6, label: 'June' },
                    { value: 7, label: 'July' }, { value: 8, label: 'August' },
                    { value: 9, label: 'September' }, { value: 10, label: 'October' },
                    { value: 11, label: 'November' }, { value: 12, label: 'December' }
                  ].map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_students_per_class">Max Students Per Class</Label>
              <Input
                id="max_students_per_class"
                type="number"
                value={formData.max_students_per_class}
                onChange={(e) => handleInputChange('max_students_per_class', parseInt(e.target.value) || 30)}
              />
            </div>
            <div>
              <Label htmlFor="passing_grade_percentage">Passing Grade Percentage</Label>
              <Input
                id="passing_grade_percentage"
                type="number"
                value={formData.passing_grade_percentage}
                onChange={(e) => handleInputChange('passing_grade_percentage', parseFloat(e.target.value) || 60)}
                min="0"
                max="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}