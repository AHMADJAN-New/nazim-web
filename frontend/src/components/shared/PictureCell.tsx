/**
 * Reusable picture cell component with centralized image caching
 * Supports students, staff, and course students
 */

import { UserRound } from 'lucide-react';
import { memo, useState, useEffect } from 'react';
import { imageCache } from '@/lib/imageCache';

type ImageType = 'student' | 'staff' | 'course-student';

interface PictureCellProps {
  type: ImageType;
  entityId: string | null | undefined;
  picturePath: string | null | undefined;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: { container: 'w-10 h-10', icon: 'h-5 w-5' },
  md: { container: 'w-12 h-12', icon: 'h-6 w-6' },
  lg: { container: 'w-20 h-20', icon: 'h-10 w-10' },
};

/**
 * Get the API endpoint URL for fetching the picture
 */
function getPictureEndpoint(type: ImageType, entityId: string): string {
  switch (type) {
    case 'student':
      return `/api/students/${entityId}/picture`;
    case 'staff':
      return `/api/staff/${entityId}/picture`;
    case 'course-student':
      return `/api/course-students/${entityId}/picture`;
    default:
      throw new Error(`Unknown image type: ${type}`);
  }
}

export const PictureCell = memo(({
  type,
  entityId,
  picturePath,
  alt = 'Picture',
  size = 'md',
  className = '',
}: PictureCellProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const classes = sizeClasses[size];
  
  useEffect(() => {
    // Only fetch if entity exists, has picturePath, and it's not empty
    const hasPicture = entityId && picturePath && picturePath.trim() !== '';
    
    if (!hasPicture) {
      setImageUrl(null);
      setImageError(true);
      return;
    }

    let isMounted = true;
    
    const fetchImage = async () => {
      try {
        const { apiClient } = await import('@/lib/api/client');
        const token = apiClient.getToken();
        const url = getPictureEndpoint(type, entityId);
        
        // Use image cache to prevent duplicate fetches
        const blobUrl = await imageCache.getImage(
          type,
          entityId,
          picturePath,
          async () => {
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Accept': 'image/*',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              credentials: 'include',
            });
            
            if (!response.ok) {
              if (response.status === 404) {
                throw new Error('NOT_FOUND');
              }
              throw new Error(`Failed to fetch image: ${response.status}`);
            }
            
            return await response.blob();
          }
        );
        
        if (!isMounted) {
          // Component unmounted, release the image
          if (blobUrl) {
            imageCache.releaseImage(type, entityId, picturePath);
          }
          return;
        }
        
        if (blobUrl) {
          setImageUrl(blobUrl);
          setImageError(false);
        } else {
          setImageError(true);
        }
      } catch (error) {
        if (!isMounted) return;
        
        if (error instanceof Error && error.message === 'NOT_FOUND') {
          setImageError(true);
          return;
        }
        
        if (import.meta.env.DEV && error instanceof Error && !error.message.includes('404')) {
          console.error(`[PictureCell] Failed to fetch ${type} picture:`, error);
        }
        setImageError(true);
      }
    };
    
    fetchImage();
    
    return () => {
      isMounted = false;
      // Release reference when component unmounts
      if (entityId && picturePath) {
        imageCache.releaseImage(type, entityId, picturePath);
      }
    };
  }, [type, entityId, picturePath]);
  
  return (
    <div className={`flex items-center justify-center ${classes.container} ${className}`}>
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={alt}
          className={`${classes.container} rounded-full object-cover border-2 border-border`}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <div className={`${classes.container} rounded-full bg-muted flex items-center justify-center border-2 border-border`}>
          <UserRound className={`${classes.icon} text-muted-foreground`} />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if relevant props change
  return (
    prevProps.type === nextProps.type &&
    prevProps.entityId === nextProps.entityId &&
    prevProps.picturePath === nextProps.picturePath &&
    prevProps.size === nextProps.size &&
    prevProps.alt === nextProps.alt
  );
});

PictureCell.displayName = 'PictureCell';
