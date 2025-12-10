import type { Subject } from './subject';

// Question types
export type QuestionType = 'mcq' | 'short' | 'descriptive' | 'true_false' | 'essay';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;
  label?: string;
  text: string;
  isCorrect?: boolean;
}

export interface ClassAcademicYearInfo {
  id: string;
  classId: string;
  academicYearId: string;
  sectionName: string | null;
  className?: string;
  academicYearName?: string;
}

export interface UserInfo {
  id: string;
  fullName: string | null;
}

export interface Question {
  id: string;
  organizationId: string;
  schoolId: string;
  subjectId: string;
  classAcademicYearId: string | null;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  marks: number;
  text: string;
  textRtl: boolean;
  options: QuestionOption[] | null;
  correctAnswer: string | null;
  reference: string | null;
  tags: string[] | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  // Relations
  subject?: Subject;
  classAcademicYear?: ClassAcademicYearInfo;
  creator?: UserInfo;
  updater?: UserInfo;
}

export interface QuestionFilters {
  schoolId?: string;
  subjectId?: string;
  classAcademicYearId?: string;
  type?: QuestionType;
  difficulty?: QuestionDifficulty;
  isActive?: boolean;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface QuestionPaginatedResponse {
  currentPage: number;
  data: Question[];
  total: number;
  lastPage: number;
  perPage: number;
  from: number;
  to: number;
}

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'short', label: 'Short Answer' },
  { value: 'descriptive', label: 'Descriptive' },
  { value: 'true_false', label: 'True/False' },
  { value: 'essay', label: 'Essay' },
];

export const QUESTION_DIFFICULTIES: { value: QuestionDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];
