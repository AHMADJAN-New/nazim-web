import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import type { WebsitePublicBook } from '@/website/hooks/useWebsiteContent';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Download, FileText, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

/** Sanitize a string for use as a filename (no path separators or reserved chars). */
function safeFilename(title: string): string {
  return title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 120).trim() || 'book';
}

export default function PublicBookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isRTL } = useLanguage();
  const [downloading, setDownloading] = useState(false);

  const { data: book, isLoading } = useQuery({
    queryKey: ['public-library-book', id],
    queryFn: async () => {
      if (!id) return null;
      return publicWebsiteApi.getLibraryBook(id) as Promise<WebsitePublicBook>;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!id || !book) {
    return (
      <div className="flex-1 overflow-x-hidden">
        <div className="container mx-auto max-w-2xl px-4 py-16 md:py-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-8 w-8 text-slate-500" />
            </div>
            <h1 className="mb-3 text-2xl font-semibold text-slate-900 md:text-3xl">
              Book Not Found
            </h1>
            <p className="mb-8 text-slate-600">
              We could not find the book you are looking for.
            </p>
            <Button variant="outline" size="lg" asChild>
              <Link
                to="/public-site/library"
                className={`inline-flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                Back to Library
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const coverUrl = book.cover_image_url || book.cover_image_path;
  const fileUrl = publicWebsiteApi.getLibraryBookFileUrl(book.id, 'inline');
  const downloadUrl = publicWebsiteApi.getLibraryBookFileUrl(book.id, 'attachment');
  const hasFile = Boolean(book.file_path || book.file_url);

  const handleDownload = async () => {
    if (!hasFile || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename(book.title)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(downloadUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex-1 overflow-x-hidden">
      {/* Back link */}
      <div className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <Link
            to="/public-site/library"
            className={`inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-emerald-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeft className={`h-4 w-4 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
            <span>Back to Library</span>
          </Link>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-12">
          {/* Cover + actions */}
          <aside className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-lg aspect-[3/4] max-w-sm mx-auto lg:mx-0">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <BookOpen className="h-24 w-24" />
                </div>
              )}
            </div>

            {hasFile && (
              <div className="flex flex-col gap-3">
                <Button size="lg" className="w-full gap-2" asChild>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2"
                  >
                    <BookOpen className="h-5 w-5" />
                    Read Online
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  {downloading ? 'Downloading…' : 'Download PDF'}
                </Button>
                {book.file_size != null && book.file_size > 0 && (
                  <p className="text-center text-xs text-slate-500">
                    {(book.file_size / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
              </div>
            )}

            {!hasFile && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
                No file available for this book.
              </div>
            )}
          </aside>

          {/* Title, meta, description */}
          <main>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="secondary" className="text-xs">
                {book.category || 'General'}
              </Badge>
              {book.is_featured && (
                <Badge variant="default" className="text-xs">Featured</Badge>
              )}
            </div>
            <h1
              className={`text-3xl font-bold tracking-tight text-slate-900 md:text-4xl ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {book.title}
            </h1>
            {book.author && (
              <p
                className={`mt-2 text-lg font-medium text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {book.author}
              </p>
            )}

            {book.description && (
              <div
                className={`mt-6 rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-slate-700 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </h2>
                <div className="whitespace-pre-line">{book.description}</div>
              </div>
            )}

            {!book.description && (
              <p className={`mt-6 text-slate-500 italic ${isRTL ? 'text-right' : 'text-left'}`}>
                No description available.
              </p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
