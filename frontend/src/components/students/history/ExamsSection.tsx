import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import type { ExamHistory, ExamRecord } from '@/types/domain/studentHistory';

interface ExamsSectionProps {
  exams: ExamHistory;
}

function getGradeBadgeVariant(percentage: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (percentage >= 80) return 'default';
  if (percentage >= 60) return 'secondary';
  if (percentage >= 40) return 'outline';
  return 'destructive';
}

function getGradeLabel(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

interface ExamCardProps {
  exam: ExamRecord;
}

function ExamCard({ exam }: ExamCardProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{exam.examName || t('studentHistory.unknownExam') || 'Unknown Exam'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {exam.className && `${exam.className} • `}
                    {exam.examStartDate && formatDate(exam.examStartDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold">{exam.percentage}%</p>
                  <p className="text-xs text-muted-foreground">
                    {exam.totalMarks}/{exam.maxMarks}
                  </p>
                </div>
                <Badge variant={getGradeBadgeVariant(exam.percentage)}>
                  {getGradeLabel(exam.percentage)}
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Exam Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pb-4 border-b">
              {exam.examRollNumber && (
                <div>
                  <p className="text-xs text-muted-foreground">{t('studentHistory.rollNumber') || 'Roll Number'}</p>
                  <p className="font-medium">{exam.examRollNumber}</p>
                </div>
              )}
              {exam.examSecretNumber && (
                <div>
                  <p className="text-xs text-muted-foreground">{t('studentHistory.secretNumber') || 'Secret Number'}</p>
                  <p className="font-medium">{exam.examSecretNumber}</p>
                </div>
              )}
              {exam.examStatus && (
                <div>
                  <p className="text-xs text-muted-foreground">{t('studentHistory.status') || 'Status'}</p>
                  <Badge variant="outline">{exam.examStatus}</Badge>
                </div>
              )}
            </div>

            {/* Subject Results */}
            {exam.subjectResults.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('studentHistory.subject') || 'Subject'}</TableHead>
                      <TableHead className="text-right">{t('studentHistory.obtained') || 'Obtained'}</TableHead>
                      <TableHead className="text-right">{t('studentHistory.maxMarks') || 'Max'}</TableHead>
                      <TableHead className="text-right">{t('studentHistory.percentage') || '%'}</TableHead>
                      <TableHead>{t('studentHistory.remarks') || 'Remarks'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exam.subjectResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.subjectName}</TableCell>
                        <TableCell className="text-right">
                          {result.isAbsent ? (
                            <Badge variant="destructive" className="text-xs">Absent</Badge>
                          ) : (
                            result.marksObtained ?? '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">{result.maxMarks}</TableCell>
                        <TableCell className="text-right">
                          {!result.isAbsent && (
                            <Badge variant={getGradeBadgeVariant(result.percentage)}>
                              {result.percentage}%
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {result.remarks || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function ExamsSection({ exams }: ExamsSectionProps) {
  const { t } = useLanguage();
  const { summary, exams: examList } = exams;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{summary.totalExams}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.totalExams') || 'Total Exams'}</p>
              </div>
              <FileText className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">{summary.averagePercentage}%</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.averageScore') || 'Average Score'}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{summary.totalMarks}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.totalMarks') || 'Total Marks'}</p>
              </div>
              <Award className="h-8 w-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{summary.totalMaxMarks}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.maxPossible') || 'Max Possible'}</p>
              </div>
              <Award className="h-8 w-8 text-gray-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      {summary.totalExams > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('studentHistory.overallProgress') || 'Overall Progress'}</span>
                <span className="font-medium">{summary.averagePercentage}%</span>
              </div>
              <Progress value={summary.averagePercentage} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam List */}
      {examList.length > 0 ? (
        <div className="space-y-4">
          {examList.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('studentHistory.noExamRecords') || 'No exam records found'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

