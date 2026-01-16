import type { CourseStudent } from '@/types/domain/courseStudent';
import { PictureCell } from '@/components/shared/PictureCell';

interface CourseStudentPictureCellProps {
  student: CourseStudent;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Component for displaying course student picture in table cell
 * Uses centralized PictureCell component with image caching
 * Note: Backend handles fallback to main student picture if course student doesn't have one
 */
export function CourseStudentPictureCell({ student, size = 'md' }: CourseStudentPictureCellProps) {
  // Try to fetch if:
  // 1. We have a student ID, AND
  // 2. Either the course student has a picture path OR is linked to a main student
  // (Backend will handle fallback to main student picture if course student doesn't have one)
  const shouldTryFetch = !!student.id && (!!student.picturePath || !!student.mainStudentId);
  
  // Use picturePath if available, otherwise use a placeholder that will trigger backend fallback
  const picturePath = student.picturePath || (student.mainStudentId ? 'main-student-fallback' : null);
  
  return (
    <PictureCell
      type="course-student"
      entityId={student.id}
      picturePath={shouldTryFetch ? picturePath : null}
      alt={student.fullName}
      size={size}
    />
  );
}

