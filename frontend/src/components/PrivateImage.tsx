import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Returns true if the URL is a private storage URL that requires auth (Bearer). */
export function isPrivateStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('/api/storage/download/');
}

interface PrivateImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Image URL - can be private (/api/storage/download/...) or public. */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Placeholder when loading or on error. */
  fallback?: React.ReactNode;
}

/**
 * Renders an image that may be a private storage URL. For private URLs, fetches with
 * auth and displays via object URL so <img> works without 401.
 */
export function PrivateImage({ src, alt, className, fallback, ...imgProps }: PrivateImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      setObjectUrl(null);
      setError(false);
      return;
    }

    if (!isPrivateStorageUrl(src)) {
      setLoading(false);
      setObjectUrl(null);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    apiClient
      .getBlobForPrivateUrl(src)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current && URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = url;
        setObjectUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
        setObjectUrl(null);
      }
    };
  }, [src]);

  const displaySrc = src && isPrivateStorageUrl(src) ? objectUrl : src;

  if (!src) {
    return fallback ? <>{fallback}</> : null;
  }

  if (loading || error) {
    if (fallback) return <>{fallback}</>;
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground rounded-md',
          className
        )}
        aria-hidden
      >
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={displaySrc ?? undefined}
      alt={alt}
      className={className}
      {...imgProps}
    />
  );
}

/** Props for a link that opens a document; private URLs are fetched with auth. */
interface PrivateDocumentLinkProps {
  url: string;
  fileName: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Link for documents. For private storage URLs, fetches with auth and opens in new tab
 * so the request includes the Bearer token.
 */
export function PrivateDocumentLink({ url, fileName, className, children }: PrivateDocumentLinkProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    if (!isPrivateStorageUrl(url)) return;
    e.preventDefault();
    setLoading(true);
    try {
      const blob = await apiClient.getBlobForPrivateUrl(url);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      // Error already surfaced by apiClient or can show toast
    } finally {
      setLoading(false);
    }
  };

  if (isPrivateStorageUrl(url)) {
    return (
      <Button
        type="button"
        variant="link"
        className={cn('h-auto p-0 text-primary underline', className)}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? 'Opening…' : (children ?? fileName)}
      </Button>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className={cn('text-primary underline', className)}>
      {children ?? fileName}
    </a>
  );
}
