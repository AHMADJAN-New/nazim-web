export interface OMRScanResult {
  id: string;
  fileName: string;
  studentId: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, string>;
  layoutId: string;
  scanAccuracy: number;
  scanDate: Date;
}

export interface AnswerKey {
  [questionNumber: string]: string;
}

