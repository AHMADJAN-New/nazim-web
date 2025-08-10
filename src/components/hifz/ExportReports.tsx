import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileText, 
  Calendar as CalendarIcon, 
  Users, 
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  dateRange: DateRange | undefined;
  includeAnalytics: boolean;
  includeMistakes: boolean;
  includeTeacherFeedback: boolean;
  includeProgress: boolean;
  studentScope: 'individual' | 'class' | 'all';
  selectedStudents: string[];
}

export function ExportReports() {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    dateRange: undefined,
    includeAnalytics: true,
    includeMistakes: true,
    includeTeacherFeedback: true,
    includeProgress: true,
    studentScope: 'individual',
    selectedStudents: []
  });
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, class');
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const reportTemplates = [
    {
      id: 'progress',
      name: t('Progress Summary'),
      description: t('Overview of memorization progress and achievements'),
      icon: TrendingUp,
      color: 'bg-green-100 text-green-700'
    },
    {
      id: 'detailed',
      name: t('Detailed Analysis'),
      description: t('Comprehensive report with analytics and feedback'),
      icon: BarChart3,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      id: 'mistakes',
      name: t('Mistake Analysis'),
      description: t('Focus on common mistakes and improvements'),
      icon: AlertTriangle,
      color: 'bg-orange-100 text-orange-700'
    },
    {
      id: 'parent',
      name: t('Parent Report'),
      description: t('Student-friendly summary for parents'),
      icon: Users,
      color: 'bg-purple-100 text-purple-700'
    }
  ];

  const { mutate: handleExport } = useMutation({
    mutationFn: async (templateId?: string) => {
      const { error } = await supabase.functions.invoke('export-hifz-report', {
        body: { ...exportOptions, templateId }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t('Export Started'),
        description: t('Your report is being generated and will be downloaded shortly'),
      });
    }
  });

  const updateOption = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('Export Reports')}</h2>
        <p className="text-muted-foreground">{t('Generate and download comprehensive Hifz progress reports')}</p>
      </div>

      {/* Quick Export Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('Quick Export Templates')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${template.color}`}>
                      <template.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      <Button 
                        size="sm" 
                        onClick={() => handleExport(template.id)}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t('Export')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('Custom Export Options')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Format */}
          <div>
            <Label className="text-base font-medium">{t('Export Format')}</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { value: 'pdf', label: 'PDF', icon: '📄' },
                { value: 'excel', label: 'Excel', icon: '📊' },
                { value: 'csv', label: 'CSV', icon: '📋' }
              ].map((format) => (
                <Card 
                  key={format.value} 
                  className={`cursor-pointer transition-colors ${
                    exportOptions.format === format.value ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => updateOption('format', format.value)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{format.icon}</div>
                    <div className="font-medium">{format.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Date Range */}
          <div>
            <Label className="text-base font-medium">{t('Date Range')}</Label>
            <div className="mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !exportOptions.dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportOptions.dateRange?.from ? (
                      exportOptions.dateRange.to ? (
                        <>
                          {format(exportOptions.dateRange.from, "LLL dd, y")} - {format(exportOptions.dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(exportOptions.dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>{t('Pick a date range')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={exportOptions.dateRange?.from}
                    selected={exportOptions.dateRange}
                    onSelect={(range) => updateOption('dateRange', range)}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Student Scope */}
          <div>
            <Label className="text-base font-medium">{t('Student Scope')}</Label>
            <Select 
              value={exportOptions.studentScope} 
              onValueChange={(value: any) => updateOption('studentScope', value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">{t('Individual Student')}</SelectItem>
                <SelectItem value="class">{t('Entire Class')}</SelectItem>
                <SelectItem value="all">{t('All Students')}</SelectItem>
              </SelectContent>
            </Select>

            {exportOptions.studentScope === 'individual' && (
              <div className="mt-4 space-y-2">
                <Label className="text-sm">{t('Select Students:')}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={student.id}
                        checked={exportOptions.selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateOption('selectedStudents', [...exportOptions.selectedStudents, student.id]);
                          } else {
                            updateOption('selectedStudents', exportOptions.selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                      />
                      <label htmlFor={student.id} className="text-sm">
                        {student.name} ({student.class})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Content Options */}
          <div>
            <Label className="text-base font-medium">{t('Include in Report')}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                { key: 'includeProgress', label: t('Progress Analytics'), icon: TrendingUp },
                { key: 'includeMistakes', label: t('Mistake Analysis'), icon: AlertTriangle },
                { key: 'includeTeacherFeedback', label: t('Teacher Feedback'), icon: Users },
                { key: 'includeAnalytics', label: t('Detailed Analytics'), icon: BarChart3 }
              ].map((option) => (
                <div key={option.key} className="flex items-center space-x-2">
                  <Checkbox 
                    id={option.key}
                    checked={exportOptions[option.key as keyof ExportOptions] as boolean}
                    onCheckedChange={(checked) => updateOption(option.key as keyof ExportOptions, checked)}
                  />
                  <label htmlFor={option.key} className="flex items-center gap-2 text-sm">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Export Actions */}
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button onClick={() => handleExport(undefined)} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              {t('Generate Custom Report')}
            </Button>
            <Button variant="outline">
              {t('Save Template')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('Recent Exports')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: t('Weekly Progress Report'), date: '2024-01-15', format: 'PDF', status: 'completed' },
              { name: t('Class Mistake Analysis'), date: '2024-01-14', format: 'Excel', status: 'completed' },
              { name: t('Monthly Summary'), date: '2024-01-10', format: 'PDF', status: 'completed' }
            ].map((export_, index) => (
              <div key={index} className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{export_.name}</p>
                    <p className="text-sm text-muted-foreground">{export_.date}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Badge variant="secondary">{export_.format}</Badge>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}