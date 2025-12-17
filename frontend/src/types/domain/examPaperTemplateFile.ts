export type ExamPaperLanguage = 'en' | 'ps' | 'fa' | 'ar';

export interface ExamPaperTemplateFile {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  templateHtml: string;
  cssStyles: string | null;
  language: ExamPaperLanguage;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}


