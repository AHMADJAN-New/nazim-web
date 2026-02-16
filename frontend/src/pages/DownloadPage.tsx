import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, HardDrive, Monitor, CheckCircle, Loader2, ArrowLeft, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/useLanguage';
import { useIndexTranslations } from './index/translations/useIndexTranslations';
import { apiClient } from '@/lib/api/client';

interface ReleaseData {
  release: {
    id: string;
    version: string;
    display_name: string;
    release_notes: string | null;
    file_name: string | null;
    file_size: number | null;
    download_url: string;
    download_available?: boolean;
    published_at: string | null;
  } | null;
  prerequisites: Array<{
    id: string;
    name: string;
    version: string | null;
    description: string | null;
    file_name: string | null;
    file_size: number | null;
    is_required: boolean;
    download_url: string;
  }>;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

export default function DownloadPage() {
  const { isRTL } = useLanguage();
  const { t } = useIndexTranslations();
  const [data, setData] = useState<ReleaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ data: ReleaseData }>('/desktop/latest')
      .then((resp) => {
        setData(resp.data);
      })
      .catch(() => {
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const hasRelease = !loading && data?.release;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Simple top bar */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="flex items-center justify-between h-14">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-[#0b0b56] hover:text-[#0b0b56]/80 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('download.backToHome')}
            </Link>
            <div className="flex items-center gap-2">
              <img
                src="/nazim_logo.webp"
                alt="Nazim Logo"
                className="w-8 h-8 rounded-lg object-contain ring-1 ring-slate-200 bg-white p-0.5"
                loading="eager"
              />
              <span className="text-lg font-bold text-[#0b0b56]">Nazim</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-10 sm:py-16">
        {/* Hero area */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0b0b56] via-[#1a1a6a] to-[#0b0b56] text-white rounded-3xl p-8 sm:p-12 mb-8">
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          {/* Gold corner accent */}
          <div
            className="absolute top-0 right-0 w-[500px] h-[300px] opacity-20"
            style={{
              background:
                'radial-gradient(500px 300px at 100% 0%, rgba(201, 164, 77, 0.3) 0%, transparent 60%)',
            }}
          />

          <div className="relative z-10">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-white/50" />
              </div>
            ) : (
              <>
                {/* Title */}
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center gap-3 mb-4 bg-white/10 rounded-full px-5 py-2">
                    <Monitor className="h-6 w-6 text-[#c9a44d]" />
                    <span className="text-sm font-medium text-[#c9a44d] uppercase tracking-wider">
                      {t('download.desktopApp')}
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                    {t('download.title')}
                  </h1>
                  <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                    {t('download.subtitle')}
                  </p>
                </div>

                {/* Main Download Card */}
                {hasRelease ? (
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-lg mx-auto">
                    <div className="flex flex-col items-center gap-5">
                      <div className="bg-[#c9a44d]/20 rounded-full p-4">
                        <Download className="h-10 w-10 text-[#c9a44d]" />
                      </div>

                      <div className="text-center">
                        <h2 className="text-2xl font-bold mb-1">
                          {data!.release!.display_name}
                        </h2>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Badge className="bg-[#c9a44d] text-white border-0 text-sm px-3">
                            v{data!.release!.version}
                          </Badge>
                          {data!.release!.file_size && (
                            <span className="text-xs text-white/60">
                              {formatBytes(data!.release!.file_size)}
                            </span>
                          )}
                        </div>
                      </div>

                      {data!.release!.release_notes && (
                        <p className="text-sm text-white/70 text-center leading-relaxed max-w-sm">
                          {data!.release!.release_notes}
                        </p>
                      )}

                      {data!.release!.download_available !== false ? (
                        <Button
                          asChild
                          size="lg"
                          className="bg-[#c9a44d] hover:bg-[#b8933e] text-white font-bold text-lg px-10 py-4 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
                        >
                          <a href={data!.release!.download_url} download>
                            <Download className="h-5 w-5 mr-2" />
                            {t('download.downloadButton')}
                          </a>
                        </Button>
                      ) : (
                        <p className="text-sm text-white/60 text-center">
                          {t('download.downloadNotYetAvailable')}
                        </p>
                      )}

                      <p className="text-xs text-white/50">
                        {t('download.windowsOnly')}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Coming soon / no release yet */
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-lg mx-auto">
                    <div className="flex flex-col items-center gap-5">
                      <div className="bg-white/10 rounded-full p-5">
                        <Download className="h-10 w-10 text-[#c9a44d]" />
                      </div>
                      <h2 className="text-2xl font-bold text-center">
                        {t('download.comingSoon')}
                      </h2>
                      <p className="text-sm text-white/60 text-center max-w-sm leading-relaxed">
                        {t('download.comingSoonDesc')}
                      </p>
                      <p className="text-xs text-white/50">
                        {t('download.windowsOnly')}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Features & Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
            <div className="bg-[#0b0b56]/10 rounded-lg p-2.5 shrink-0">
              <RefreshCw className="h-5 w-5 text-[#0b0b56]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">{t('download.featureAutoUpdate')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t('download.featureAutoUpdateDesc')}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
            <div className="bg-[#0b0b56]/10 rounded-lg p-2.5 shrink-0">
              <Shield className="h-5 w-5 text-[#0b0b56]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">{t('download.featureSecure')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t('download.featureSecureDesc')}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
            <div className="bg-[#0b0b56]/10 rounded-lg p-2.5 shrink-0">
              <Monitor className="h-5 w-5 text-[#0b0b56]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">{t('download.featureOffline')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t('download.featureOfflineDesc')}</p>
            </div>
          </div>
        </div>

        {/* Prerequisites Section */}
        {data?.prerequisites && data.prerequisites.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 mb-8 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {t('download.prerequisitesTitle')}
            </h3>
            <p className="text-sm text-slate-500 mb-5">{t('download.prerequisitesDesc')}</p>
            <Separator className="mb-5" />
            <div className="space-y-3">
              {data.prerequisites.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-[#0b0b56]/10 rounded-lg p-2 shrink-0">
                      <HardDrive className="h-4 w-4 text-[#0b0b56]" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-900">
                        {p.name}
                        {p.version && (
                          <span className="text-slate-400 ml-1.5 font-normal">v{p.version}</span>
                        )}
                      </span>
                      {p.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.is_required && (
                      <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                        {t('download.required')}
                      </Badge>
                    )}
                    {p.file_size && (
                      <span className="text-xs text-slate-400">
                        {formatBytes(p.file_size)}
                      </span>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="text-[#0b0b56] border-[#0b0b56]/20 hover:bg-[#0b0b56]/5"
                    >
                      <a href={p.download_url} download>
                        <Download className="h-4 w-4 mr-1.5" />
                        {t('download.downloadButton')}
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Requirements */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {t('download.systemRequirements')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm text-slate-700">{t('download.reqWindows')}</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm text-slate-700">{t('download.reqAutoUpdater')}</span>
            </div>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0b0b56] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('download.backToHome')}
          </Link>
        </div>
      </main>
    </div>
  );
}
