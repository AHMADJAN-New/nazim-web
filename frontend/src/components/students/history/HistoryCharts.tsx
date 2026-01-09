import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import type { 
  AttendanceHistory, 
  ExamHistory, 
  FeeHistory 
} from '@/types/domain/studentHistory';

interface HistoryChartsProps {
  attendance: AttendanceHistory;
  exams: ExamHistory;
  fees: FeeHistory;
}

export function HistoryCharts({ attendance, exams, fees }: HistoryChartsProps) {
  const { t } = useLanguage();

  // Prepare attendance trend data (reverse to show oldest first)
  const attendanceTrendData = useMemo(() => {
    return [...attendance.monthlyBreakdown].reverse().slice(-12).map(item => ({
      month: item.month,
      rate: item.rate,
      present: item.present,
      absent: item.absent,
      late: item.late,
    }));
  }, [attendance.monthlyBreakdown]);

  // Prepare exam performance data (overall exam percentages)
  const examPerformanceData = useMemo(() => {
    return exams.exams.slice(-10).map(exam => ({
      name: exam.examName?.substring(0, 15) || 'Exam',
      percentage: exam.percentage,
      marks: exam.totalMarks,
      maxMarks: exam.maxMarks,
    }));
  }, [exams.exams]);

  // Prepare subject performance over time data (line chart showing each subject's performance across exams)
  const subjectPerformanceOverTimeData = useMemo(() => {
    // Group by exam date/name, then by subject
    const examDataMap = new Map<string, Array<{ subject: string; percentage: number }>>();
    
    exams.exams.forEach(exam => {
      const examKey = exam.examName?.substring(0, 20) || `Exam ${exam.examId}`;
      const subjectResults: Array<{ subject: string; percentage: number }> = [];
      
      exam.subjectResults.forEach(result => {
        if (!result.isAbsent && result.subjectName) {
          subjectResults.push({
            subject: result.subjectName,
            percentage: result.percentage,
          });
        }
      });
      
      if (subjectResults.length > 0) {
        examDataMap.set(examKey, subjectResults);
      }
    });

    // Get all unique subjects
    const allSubjects = new Set<string>();
    examDataMap.forEach((results) => {
      results.forEach(result => allSubjects.add(result.subject));
    });

    // Create data points for each exam
    const chartData: Array<Record<string, any>> = [];
    examDataMap.forEach((subjectResults, examName) => {
      const dataPoint: Record<string, any> = {
        exam: examName,
      };
      
      subjectResults.forEach(result => {
        dataPoint[result.subject] = result.percentage;
      });
      
      chartData.push(dataPoint);
    });

    return {
      data: chartData.sort((a, b) => a.exam.localeCompare(b.exam)), // Sort by exam name
      subjects: Array.from(allSubjects).slice(0, 8), // Limit to top 8 subjects for readability
    };
  }, [exams.exams]);

  // Prepare subject average performance (average percentage per subject)
  const subjectAverageData = useMemo(() => {
    const subjectMap = new Map<string, number[]>();
    
    exams.exams.forEach(exam => {
      exam.subjectResults.forEach(result => {
        if (!result.isAbsent && result.subjectName) {
          const existing = subjectMap.get(result.subjectName) || [];
          existing.push(result.percentage);
          subjectMap.set(result.subjectName, existing);
        }
      });
    });

    return Array.from(subjectMap.entries())
      .map(([subjectName, percentages]) => ({
        subject: subjectName.substring(0, 20),
        average: percentages.reduce((sum, p) => sum + p, 0) / percentages.length,
        count: percentages.length,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10); // Top 10 subjects
  }, [exams.exams]);

  // Prepare fee timeline data
  const feeTimelineData = useMemo(() => {
    return fees.assignments.slice(-10).map(assignment => ({
      name: assignment.feeStructure?.name?.substring(0, 15) || 'Fee',
      assigned: assignment.assignedAmount,
      paid: assignment.paidAmount,
      remaining: assignment.remainingAmount,
    }));
  }, [fees.assignments]);

  const hasAttendanceData = attendanceTrendData.length > 0;
  const hasExamData = examPerformanceData.length > 0;
  const hasSubjectOverTimeData = subjectPerformanceOverTimeData.data.length > 0 && subjectPerformanceOverTimeData.subjects.length > 0;
  const hasSubjectAverageData = subjectAverageData.length > 0;
  const hasFeeData = feeTimelineData.length > 0;

  if (!hasAttendanceData && !hasExamData && !hasSubjectOverTimeData && !hasSubjectAverageData && !hasFeeData) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('studentHistory.noChartData') || 'Not enough data to display charts'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Attendance Trend Chart */}
      {hasAttendanceData && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.attendanceTrend') || 'Attendance Trend'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    name={t('studentHistory.attendanceRate') || 'Attendance Rate'}
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Performance Chart (Overall) */}
      {hasExamData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.examPerformance') || 'Exam Performance (Overall)'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="percentage" 
                    name={t('studentHistory.percentage') || 'Percentage'}
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Average Performance Chart */}
      {hasSubjectAverageData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.subjectAveragePerformance') || 'Subject Average Performance'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectAverageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    type="category"
                    dataKey="subject" 
                    tick={{ fontSize: 11 }}
                    width={100}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, t('studentHistory.averagePercentage') || 'Average']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="average" 
                    name={t('studentHistory.averagePercentage') || 'Average %'}
                    fill="hsl(217.2 91.2% 59.8%)" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Performance Over Time Chart */}
      {hasSubjectOverTimeData && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.subjectPerformanceOverTime') || 'Subject Performance Over Time'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] sm:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={subjectPerformanceOverTimeData.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="exam" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {subjectPerformanceOverTimeData.subjects.map((subject, index) => {
                    const colors = [
                      'hsl(var(--primary))',
                      'hsl(142.1 76.2% 36.3%)',
                      'hsl(24.6 95% 53.1%)',
                      'hsl(217.2 91.2% 59.8%)',
                      'hsl(280.7 70% 50%)',
                      'hsl(0 84.2% 60.2%)',
                      'hsl(47.9 95.8% 53.1%)',
                      'hsl(142.1 70.6% 45.3%)',
                    ];
                    return (
                      <Line 
                        key={subject}
                        type="monotone" 
                        dataKey={subject}
                        name={subject.length > 15 ? `${subject.substring(0, 15)}...` : subject}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee Timeline Chart */}
      {hasFeeData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.feeTimeline') || 'Fee Timeline'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="paid" 
                    name={t('studentHistory.paid') || 'Paid'}
                    stackId="a"
                    fill="hsl(142.1 76.2% 36.3%)" 
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar 
                    dataKey="remaining" 
                    name={t('studentHistory.remaining') || 'Remaining'}
                    stackId="a"
                    fill="hsl(24.6 95% 53.1%)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

