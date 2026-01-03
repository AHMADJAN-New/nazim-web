import { UserRound } from 'lucide-react';
import { useState, useEffect } from 'react';

import type { CourseStudent } from '@/types/domain/courseStudent';

interface CourseStudentPictureCellProps {
  student: CourseStudent;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: { container: 'w-10 h-10', icon: 'h-5 w-5' },
  md: { container: 'w-12 h-12', icon: 'h-6 w-6' },
  lg: { container: 'w-20 h-20', icon: 'h-10 w-10' },
};

export function CourseStudentPictureCell({ student, size = 'md' }: CourseStudentPictureCellProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  
  const classes = sizeClasses[size];
  
  useEffect(() => {
    // Cleanup previous blob URL
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    setImageError(false);
    
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[CourseStudentPictureCell] Student data:', {
        id: student.id,
        picturePath: student.picturePath,
        mainStudentId: student.mainStudentId,
        fullName: student.fullName,
      });
    }
    
    // Try to fetch if:
    // 1. We have a student ID, AND
    // 2. Either the course student has a picture path OR is linked to a main student
    // (Backend will handle fallback to main student picture if course student doesn't have one)
    const shouldTryFetch = !!student.id && (!!student.picturePath || !!student.mainStudentId);
    
    if (import.meta.env.DEV) {
      console.log('[CourseStudentPictureCell] Should try fetch?', shouldTryFetch, 'picturePath:', student.picturePath, 'mainStudentId:', student.mainStudentId);
    }
    
    if (shouldTryFetch) {
      let currentBlobUrl: string | null = null;
      let cancelled = false;
      
      const fetchImage = async () => {
        try {
          const { apiClient } = await import('@/lib/api/client');
          // Backend handles fallback to main student picture if course student doesn't have one
          // Use picturePath + timestamp for cache busting to ensure fresh image after upload
          const cacheBuster = student.picturePath 
            ? `${encodeURIComponent(student.picturePath)}-${Date.now()}`
            : Date.now().toString();
          const endpoint = `/course-students/${student.id}/picture?v=${cacheBuster}`;
          
          if (import.meta.env.DEV) {
            console.log('[CourseStudentPictureCell] Fetching picture from:', endpoint);
          }
          
          // Use apiClient.requestFile to properly handle base URL and authentication
          // This ensures the request goes through the Vite proxy in dev or uses the correct API URL
          const { blob } = await apiClient.requestFile(endpoint, {
            method: 'GET',
            headers: {
              'Accept': 'image/*',
            },
          });
          
          // Check if component was unmounted or student changed
          if (cancelled) {
            if (currentBlobUrl) {
              URL.revokeObjectURL(currentBlobUrl);
            }
            return;
          }
          
          if (import.meta.env.DEV) {
            console.log('[CourseStudentPictureCell] Blob received:', blob.type, blob.size, 'bytes');
          }
          
          const blobUrl = URL.createObjectURL(blob);
          currentBlobUrl = blobUrl;
          setImageUrl(blobUrl);
          setImageError(false);
          
          if (import.meta.env.DEV) {
            console.log('[CourseStudentPictureCell] Picture loaded successfully');
          }
        } catch (error) {
          // Check if component was unmounted or student changed
          if (cancelled) {
            return;
          }
          
          // Handle 404 gracefully (picture doesn't exist)
          // Check status code directly if available, or check error message
          const statusCode = (error as Error & { status?: number })?.status;
          const is404 = statusCode === 404 || (
            error instanceof Error && (
              error.message.includes('404') || 
              error.message.includes('Not Found') ||
              error.message.includes('HTTP error! status: 404')
            )
          );
          
          if (is404) {
            // 404 is expected when student has no picture - don't log as error
            if (import.meta.env.DEV) {
              console.log('[CourseStudentPictureCell] Picture not found (404) - showing placeholder');
            }
            setImageError(true);
            return;
          }
          
          // Log other errors (network issues, 500 errors, etc.)
          if (import.meta.env.DEV && error instanceof Error) {
            console.error('[CourseStudentPictureCell] Failed to fetch picture:', error);
          }
          setImageError(true);
        }
      };
      
      fetchImage();
      
      return () => {
        cancelled = true;
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
        }
      };
    } else {
      // No picture path, show placeholder immediately
      setImageUrl(null);
      setImageError(false);
    }
  }, [student.id, student.picturePath, student.mainStudentId]);
  
  return (
    <div className={`flex items-center justify-center ${classes.container}`}>
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={student.fullName}
          className={`${classes.container} rounded-full object-cover border-2 border-border`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className={`${classes.container} rounded-full bg-muted flex items-center justify-center border-2 border-border`}>
          <UserRound className={`${classes.icon} text-muted-foreground`} />
        </div>
      )}
    </div>
  );
}

