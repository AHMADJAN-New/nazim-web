import { HERO_ISLAMIC_GEOMETRY_DATA_URL, DEFAULT_HERO_IMAGE_URL } from '@/website/lib/heroPattern';
import { cn } from '@/lib/utils';

interface PublicHeroBackgroundProps {
  /** Optional image URL (school header image or default). When set, image is shown with dark overlay. */
  imageUrl?: string | null;
  /** Extra class for the section (e.g. min-height). */
  className?: string;
  /** Islamic geometry pattern opacity (default 0.15). */
  patternOpacity?: number;
  /** Whether to use default hero image when imageUrl is not provided (home page only). */
  useDefaultImage?: boolean;
}

/**
 * Hero background: gradient + optional image with overlay + subtle Islamic geometry (no dots/plus).
 */
export function PublicHeroBackground({
  imageUrl,
  className,
  patternOpacity = 0.15,
  useDefaultImage = false,
}: PublicHeroBackgroundProps) {
  const heroImageUrl = imageUrl || (useDefaultImage ? DEFAULT_HERO_IMAGE_URL : null);

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {/* Gradient base (replaces flat emerald-900) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgb(5 46 22) 0%, rgb(6 78 59) 40%, rgb(4 55 34) 70%, rgb(2 44 34) 100%)',
        }}
        aria-hidden
      />

      {/* Optional hero image with gradient overlay */}
      {heroImageUrl && (
        <>
          <img
            src={heroImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(5 46 22 / 0.85) 0%, rgba(6 78 59 / 0.75) 50%, rgba(2 44 34 / 0.88) 100%)',
            }}
            aria-hidden
          />
        </>
      )}

      {/* Islamic geometry overlay (8-pointed star motif, no dots/plus) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: HERO_ISLAMIC_GEOMETRY_DATA_URL,
          opacity: patternOpacity,
        }}
        aria-hidden
      />
    </div>
  );
}
