import type { Subject } from './subject';
import type { Exam, ExamSubject } from './exam';
import type { Question, QuestionOption, ClassAcademicYearInfo, UserInfo } from './question';

// Supported languages
export type ExamPaperLanguage = 'en' | 'ps' | 'fa' | 'ar';

export interface SchoolInfo {
  id: string;
  schoolName: string;
  schoolNameArabic: string | null;
  schoolNamePashto: string | null;
}

export interface ExamPaperTemplate {
  id: string;
  organizationId: string;
  schoolId: string;
  examId: string | null;
  examSubjectId: string | null;
  subjectId: string;
  classAcademicYearId: string | null;
  title: string;
  language: ExamPaperLanguage;
  totalMarks: number | null;
  durationMinutes: number | null;
  headerHtml: string | null;
  footerHtml: string | null;
  instructions: string | null;
  isDefaultForExamSubject: boolean;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  // Relations
  subject?: Subject;
  exam?: Exam;
  examSubject?: ExamSubject;
  school?: SchoolInfo;
  classAcademicYear?: ClassAcademicYearInfo;
  creator?: UserInfo;
  updater?: UserInfo;
  items?: ExamPaperItem[];
  itemsCount?: number;
  computedTotalMarks?: number;
  hasMarksDiscrepancy?: boolean;
}

export interface ExamPaperItem {
  id: string;
  organizationId: string;
  schoolId: string;
  examPaperTemplateId: string;
  questionId: string;
  sectionLabel: string | null;
  position: number;
  marksOverride: number | null;
  isMandatory: boolean;
  notes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  // Relations
  question?: Question;
}

export interface ExamPaperItemReorder {
  id: string;
  position: number;
  sectionLabel?: string | null;
}

// Paper completeness stats for an exam
export interface ExamPaperStats {
  examId: string;
  totalSubjects: number;
  subjectsWithTemplate: number;
  subjectsWithoutTemplate: number;
  completionPercentage: number;
  subjects: Array<{
    examSubjectId: string;
    subjectId: string;
    subjectName: string;
    className: string;
    hasPaperTemplate: boolean;
  }>;
}

// Preview types
export interface ExamPaperPreviewQuestion {
  number: number;
  itemId: string;
  questionId: string;
  type: string;
  difficulty: string;
  text: string;
  textRtl: boolean;
  marks: number;
  isMandatory: boolean;
  reference: string | null;
  options?: Array<{
    id: string;
    label: string;
    text: string;
    isCorrect?: boolean;
  }>;
  correctOption?: QuestionOption;
  correctAnswer?: string | null;
}

export interface ExamPaperPreviewSection {
  label: string;
  questions: ExamPaperPreviewQuestion[];
  totalMarks: number;
}

export interface ExamPaperPreviewHeader {
  schoolName: string;
  schoolNameArabic: string | null;
  schoolNamePashto: string | null;
  schoolAddress: string | null;
  examName: string | null;
  subjectName: string;
  className: string | null;
  academicYear: string | null;
  durationMinutes: number | null;
  totalMarks: number;
  date: string | null;
}

export interface ExamPaperPreview {
  templateId: string;
  title: string;
  language: ExamPaperLanguage;
  isRtl: boolean;
  header: ExamPaperPreviewHeader;
  headerHtml: string | null;
  footerHtml: string | null;
  instructions: string | null;
  sections: ExamPaperPreviewSection[];
  totalQuestions: number;
  totalMarks: number;
  computedTotalMarks: number;
  showAnswers: boolean;
}

export interface AvailableTemplatesResponse {
  examSubject: {
    id: string;
    subjectName: string;
    className: string;
  };
  templates: ExamPaperTemplate[];
}

export const EXAM_PAPER_LANGUAGES: { value: ExamPaperLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ps', label: 'Pashto' },
  { value: 'fa', label: 'Farsi' },
  { value: 'ar', label: 'Arabic' },
];

export const RTL_LANGUAGES: ExamPaperLanguage[] = ['ps', 'fa', 'ar'];
