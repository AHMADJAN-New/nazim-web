/**
 * Displays website scholar photo by fetching from authenticated API.
 * Used in admin scholars table so images load with auth.
 * Backend requires current_school_id in query (website routes are not under school.context).
 */

import { User } from 'lucide-react';
import { memo, useState, useEffect } from 'react';
import { imageCache } from '@/lib/imageCache';
import { useProfile } from '@/hooks/useProfiles';

const sizeClasses = {
  sm: { container: 'w-10 h-10', icon: 'h-5 w-5' },
  md: { container: 'w-12 h-12', icon: 'h-6 w-6' },
  lg: { container: 'w-16 h-16', icon: 'h-8 w-8' },
};

interface ScholarPhotoCellProps {
  scholarId: string;
  photoPath: string | null | undefined;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ScholarPhotoCell = memo(function ScholarPhotoCell({
  scholarId,
  photoPath,
  alt = 'Scholar',
  size = 'sm',
  className = '',
}: ScholarPhotoCellProps) {
  const { data: profile } = useProfile();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const classes = sizeClasses[size];

  useEffect(() => {
    const schoolId = profile?.default_school_id ?? null;
    const hasPicture = scholarId && photoPath && photoPath.trim() !== '' && schoolId;
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
        const schoolIdParam = schoolId ? `&current_school_id=${encodeURIComponent(schoolId)}` : '';

        const blobUrl = await imageCache.getImage(
          'website-scholar',
          scholarId,
          photoPath,
          async () => {
            const url = `/api/website/scholars/${encodeURIComponent(scholarId)}/photo?v=${encodeURIComponent(photoPath || '')}${schoolIdParam}`;
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                Accept: 'image/*',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              credentials: 'include',
            });

            if (!response.ok) {
              if (response.status === 404) throw new Error('NOT_FOUND');
              throw new Error(`Failed to fetch image: ${response.status}`);
            }

            return await response.blob();
          }
        );

        if (!isMounted) {
          if (blobUrl) imageCache.releaseImage('website-scholar', scholarId, photoPath);
          return;
        }

        if (blobUrl) {
          setImageUrl(blobUrl);
          setImageError(false);
        } else {
          setImageError(true);
        }
      } catch (e) {
        if (!isMounted) return;
        if (e instanceof Error && e.message === 'NOT_FOUND') {
          setImageError(true);
          return;
        }
        if (import.meta.env.DEV && e instanceof Error && !e.message.includes('404')) {
          console.error('[ScholarPhotoCell] Failed to fetch scholar photo:', e);
        }
        setImageError(true);
      }
    };

    fetchImage();
    return () => {
      isMounted = false;
      imageCache.releaseImage('website-scholar', scholarId, photoPath);
    };
  }, [scholarId, photoPath, profile?.default_school_id]);

  return (
    <div
      className={`flex items-center justify-center rounded-full overflow-hidden bg-muted border border-border flex-shrink-0 ${classes.container} ${className}`}
      aria-hidden
    >
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
          <User className={classes.icon} />
        </div>
      )}
    </div>
  );
});
