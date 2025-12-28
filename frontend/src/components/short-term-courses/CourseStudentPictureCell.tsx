import { useState, useEffect } from 'react';
import { UserRound } from 'lucide-react';
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
        fullName: student.fullName,
      });
    }
    
    // Always try to fetch if we have a student ID
    // The backend will return 404 if no picture exists, which we handle gracefully
    // This ensures we show pictures even if picturePath wasn't in the API response yet
    const shouldTryFetch = student.id;
    
    if (import.meta.env.DEV) {
      console.log('[CourseStudentPictureCell] Should try fetch?', shouldTryFetch, 'picturePath:', student.picturePath);
    }
    
    if (shouldTryFetch) {
      let currentBlobUrl: string | null = null;
      
      const fetchImage = async () => {
        try {
          const { apiClient } = await import('@/lib/api/client');
          const token = apiClient.getToken();
          const url = `/api/course-students/${student.id}/picture`;
          
          if (import.meta.env.DEV) {
            console.log('[CourseStudentPictureCell] Fetching picture from:', url);
          }
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'image/*',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });
          
          if (import.meta.env.DEV) {
            console.log('[CourseStudentPictureCell] Response status:', response.status, response.statusText);
          }
          
          if (!response.ok) {
            if (response.status === 404) {
              if (import.meta.env.DEV) {
                console.warn('[CourseStudentPictureCell] Picture not found (404)');
              }
              setImageError(true);
              return;
            }
            throw new Error(`Failed to fetch image: ${response.status}`);
          }
          
          const blob = await response.blob();
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
          if (import.meta.env.DEV && error instanceof Error && !error.message.includes('404')) {
            console.error('Failed to fetch course student picture:', error);
          }
          setImageError(true);
        }
      };
      
      fetchImage();
      
      return () => {
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
        }
      };
    } else {
      // No picture path, show placeholder immediately
      setImageUrl(null);
      setImageError(true);
    }
  }, [student.id, student.picturePath]);
  
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

