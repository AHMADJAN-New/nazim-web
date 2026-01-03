import { ArrowLeft, Printer, Eye, EyeOff, FileText, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ExamPaperPreview as ExamPaperPreviewType, ExamPaperPreviewSection, ExamPaperPreviewQuestion } from '@/hooks/useExamPapers';
import { useExamPaperPreviewStudent, useExamPaperPreviewTeacher, useExamPaperTemplate } from '@/hooks/useExamPapers';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function ExamPaperPreview() {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<'student' | 'teacher'>(
    searchParams.get('mode') === 'teacher' ? 'teacher' : 'student'
  );

  // Permissions
  const hasRead = useHasPermission('exams.papers.read');

  // Fetch preview data based on view mode
  const { data: studentPreview, isLoading: studentLoading } = useExamPaperPreviewStudent(
    viewMode === 'student' ? templateId : undefined
  );
  const { data: teacherPreview, isLoading: teacherLoading } = useExamPaperPreviewTeacher(
    viewMode === 'teacher' ? templateId : undefined
  );
  const { data: template } = useExamPaperTemplate(templateId);

  const preview = viewMode === 'student' ? studentPreview : teacherPreview;
  const isLoading = viewMode === 'student' ? studentLoading : teacherLoading;

  const handlePrint = () => {
    window.print();
  };

  const isRtlLanguage = preview?.header.language && ['ps', 'fa', 'ar'].includes(preview.header.language);

  if (!hasRead) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t('common.noPermission') || 'You do not have permission to view this page.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{t('examPaperPreview.title') || 'Paper Preview'}</h1>
            <p className="text-sm text-muted-foreground">
              {template?.title || t('examPaperPreview.loading') || 'Loading...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'student' | 'teacher')}>
            <TabsList>
              <TabsTrigger value="student" className="flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                {t('examPaperPreview.studentView') || 'Student'}
              </TabsTrigger>
              <TabsTrigger value="teacher" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t('examPaperPreview.teacherView') || 'Teacher'}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            {t('common.print') || 'Print'}
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Separator />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : preview ? (
        <div 
          ref={printRef}
          className={cn(
            "bg-white dark:bg-gray-900 shadow-lg rounded-lg print:shadow-none print:rounded-none",
            isRtlLanguage && "text-right"
          )}
          dir={isRtlLanguage ? 'rtl' : 'ltr'}
        >
          {/* Paper Header */}
          <div className="p-6 border-b print:p-4">
            <ExamPaperHeader header={preview.header} />
          </div>

          {/* Instructions */}
          {preview.header.instructions && (
            <div className="px-6 py-4 bg-blue-50 dark:bg-blue-950 border-b print:bg-white">
              <h3 className="font-semibold mb-2">{t('examPaperPreview.instructions') || 'Instructions'}</h3>
              <div 
                className="text-sm prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: preview.header.instructions }}
              />
            </div>
          )}

          {/* Questions by Sections */}
          <div className="p-6 space-y-8 print:p-4">
            {preview.sections.map((section, sectionIndex) => (
              <ExamSection
                key={section.label || sectionIndex}
                section={section}
                sectionIndex={sectionIndex}
                showAnswers={viewMode === 'teacher'}
                isRtl={!!isRtlLanguage}
              />
            ))}
          </div>

          {/* Paper Footer */}
          {preview.header.footerHtml && (
            <div className="p-6 border-t bg-gray-50 dark:bg-gray-800 print:bg-white">
              <div 
                className="text-sm text-center"
                dangerouslySetInnerHTML={{ __html: preview.header.footerHtml }}
              />
            </div>
          )}

          {/* Summary (Teacher View Only) */}
          {viewMode === 'teacher' && (
            <div className="p-6 border-t bg-gray-50 dark:bg-gray-800 print:hidden">
              <h3 className="font-semibold mb-4">{t('examPaperPreview.summary') || 'Summary'}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground">{t('examPaperPreview.totalQuestions') || 'Total Questions'}</p>
                  <p className="text-2xl font-bold">
                    {preview.sections.reduce((sum, s) => sum + s.questions.length, 0)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground">{t('examPaperPreview.totalMarks') || 'Total Marks'}</p>
                  <p className="text-2xl font-bold">{preview.header.totalMarks}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground">{t('examPaperPreview.duration') || 'Duration'}</p>
                  <p className="text-2xl font-bold">{preview.header.durationMinutes} min</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground">{t('examPaperPreview.sections') || 'Sections'}</p>
                  <p className="text-2xl font-bold">{preview.sections.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('examPaperPreview.notFound') || 'Preview not available. Please check if the template has questions.'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
              {t('common.goBack') || 'Go Back'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Paper Header Component
interface ExamPaperHeaderProps {
  header: ExamPaperPreviewType['header'];
}

function ExamPaperHeader({ header }: ExamPaperHeaderProps) {
  const { t } = useLanguage();
  const isRtl = header.language && ['ps', 'fa', 'ar'].includes(header.language);

  return (
    <div className="space-y-4">
      {/* Custom Header HTML */}
      {header.headerHtml && (
        <div 
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: header.headerHtml }}
        />
      )}

      {/* School & Exam Info */}
      <div className="text-center space-y-2">
        {header.schoolName && (
          <h1 className="text-xl font-bold">{header.schoolName}</h1>
        )}
        {header.examName && (
          <h2 className="text-lg font-semibold text-muted-foreground">{header.examName}</h2>
        )}
        <h3 className="text-lg">{header.templateTitle}</h3>
      </div>

      {/* Meta Info */}
      <div className={cn(
        "grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border rounded-lg p-4",
        isRtl && "text-right"
      )}>
        {header.subjectName && (
          <div>
            <span className="text-muted-foreground">{t('examPaperPreview.subject') || 'Subject'}:</span>
            <span className="font-medium ml-1">{header.subjectName}</span>
          </div>
        )}
        {header.className && (
          <div>
            <span className="text-muted-foreground">{t('examPaperPreview.class') || 'Class'}:</span>
            <span className="font-medium ml-1">{header.className}</span>
          </div>
        )}
        {header.academicYearName && (
          <div>
            <span className="text-muted-foreground">{t('examPaperPreview.academicYear') || 'Year'}:</span>
            <span className="font-medium ml-1">{header.academicYearName}</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">{t('examPaperPreview.totalMarks') || 'Total Marks'}:</span>
          <span className="font-medium ml-1">{header.totalMarks}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t('examPaperPreview.duration') || 'Duration'}:</span>
          <span className="font-medium ml-1">{header.durationMinutes} {t('examPaperPreview.minutes') || 'min'}</span>
        </div>
      </div>

      {/* Student Info Fields (for print) */}
      <div className="grid grid-cols-2 gap-4 text-sm print:block hidden">
        <div className="flex items-center gap-2">
          <span>{t('examPaperPreview.studentName') || 'Student Name'}:</span>
          <span className="flex-1 border-b border-gray-400"></span>
        </div>
        <div className="flex items-center gap-2">
          <span>{t('examPaperPreview.rollNumber') || 'Roll No'}:</span>
          <span className="flex-1 border-b border-gray-400"></span>
        </div>
      </div>
    </div>
  );
}

// Section Component
interface ExamSectionProps {
  section: ExamPaperPreviewSection;
  sectionIndex: number;
  showAnswers: boolean;
  isRtl: boolean;
}

function ExamSection({ section, sectionIndex, showAnswers, isRtl }: ExamSectionProps) {
  const { t } = useLanguage();

  const sectionMarks = section.questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      {section.label && (
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-lg font-semibold">
            {t('examPaperPreview.section') || 'Section'} {section.label}
          </h2>
          <span className="text-sm text-muted-foreground">
            {section.questions.length} {t('examPaperPreview.questions') || 'questions'} • {sectionMarks} {t('examPaperPreview.marks') || 'marks'}
          </span>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {section.questions.map((question, qIndex) => (
          <QuestionDisplay
            key={question.id}
            question={question}
            questionNumber={question.position}
            showAnswers={showAnswers}
            isRtl={isRtl}
          />
        ))}
      </div>
    </div>
  );
}

// Question Display Component
interface QuestionDisplayProps {
  question: ExamPaperPreviewQuestion;
  questionNumber: number;
  showAnswers: boolean;
  isRtl: boolean;
}

function QuestionDisplay({ question, questionNumber, showAnswers, isRtl }: QuestionDisplayProps) {
  const { t } = useLanguage();
  const isQuestionRtl = question.textRtl || isRtl;

  return (
    <div className="space-y-3">
      {/* Question Header */}
      <div className={cn("flex gap-3", isQuestionRtl && "flex-row-reverse")}>
        <span className="font-semibold text-primary shrink-0">Q{questionNumber}.</span>
        <div className="flex-1 space-y-2">
          {/* Question Text */}
          <div 
            className={cn(
              "text-base",
              isQuestionRtl && "text-right"
            )}
            dir={isQuestionRtl ? 'rtl' : 'ltr'}
          >
            {question.text}
          </div>

          {/* Marks Badge */}
          <div className={cn("flex gap-2 items-center print:hidden", isQuestionRtl && "flex-row-reverse")}>
            <Badge variant="outline" className="text-xs">
              {question.marks} {t('examPaperPreview.marks') || 'marks'}
            </Badge>
            {showAnswers && (
              <>
                <Badge variant="secondary" className="text-xs">
                  {question.type}
                </Badge>
                <Badge className={cn("text-xs", difficultyColors[question.difficulty])}>
                  {question.difficulty}
                </Badge>
              </>
            )}
            {!question.isMandatory && (
              <Badge variant="outline" className="text-xs">
                {t('examPaperPreview.optional') || 'Optional'}
              </Badge>
            )}
          </div>

          {/* Options for MCQ / True-False */}
          {question.options && question.options.length > 0 && (
            <div className={cn("mt-4 space-y-2", isQuestionRtl && "text-right")}>
              {question.options.map((option, optIndex) => (
                <div 
                  key={optIndex}
                  className={cn(
                    "flex items-start gap-2 py-1",
                    isQuestionRtl && "flex-row-reverse",
                    showAnswers && option.isCorrect && "bg-green-50 dark:bg-green-950 px-3 py-2 rounded-md border border-green-200 dark:border-green-800"
                  )}
                >
                  <span className="font-medium shrink-0">
                    {option.key})
                  </span>
                  <span className="flex-1">{option.text}</span>
                  {showAnswers && option.isCorrect && (
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Answer Space for Short/Descriptive/Essay (Student View) */}
          {!showAnswers && (question.type === 'short' || question.type === 'descriptive' || question.type === 'essay') && (
            <div className="mt-4 border rounded-lg p-4 min-h-[100px] bg-gray-50 dark:bg-gray-800 print:min-h-[150px] print:bg-white">
              <p className="text-xs text-muted-foreground">
                {t('examPaperPreview.answerHere') || 'Write your answer here'}
              </p>
            </div>
          )}

          {/* Correct Answer (Teacher View) */}
          {showAnswers && question.correctAnswer && (
            <div className="mt-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-800 dark:text-green-200">
                  {t('examPaperPreview.modelAnswer') || 'Model Answer'}
                </span>
              </div>
              <div className={cn("text-sm", isQuestionRtl && "text-right")}>
                {question.correctAnswer}
              </div>
            </div>
          )}

          {/* Reference (Teacher View) */}
          {showAnswers && question.reference && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">{t('examPaperPreview.reference') || 'Reference'}:</span> {question.reference}
            </div>
          )}

          {/* Notes (if any) */}
          {showAnswers && question.notes && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              <span className="font-medium">{t('examPaperPreview.notes') || 'Notes'}:</span> {question.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Print Styles (added via CSS)
// Add this to your global CSS or create a print stylesheet:
/*
@media print {
  .print\\:hidden {
    display: none !important;
  }
  .print\\:block {
    display: block !important;
  }
  .print\\:shadow-none {
    box-shadow: none !important;
  }
  .print\\:rounded-none {
    border-radius: 0 !important;
  }
  .print\\:p-4 {
    padding: 1rem !important;
  }
  .print\\:bg-white {
    background-color: white !important;
  }
  .print\\:min-h-\\[150px\\] {
    min-height: 150px !important;
  }
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
*/
