import { useLanguage } from '@/hooks/useLanguage';
import { Globe, Mail } from 'lucide-react';
import { getMainAppLoginUrl } from '@/lib/publicWebsiteHost';

interface PublicWebsiteNoAccessProps {
  schoolName?: string | null;
  domain?: string | null;
  requiredPlan?: string | null;
}

export default function PublicWebsiteNoAccess({
  schoolName,
  domain,
  requiredPlan,
}: PublicWebsiteNoAccessProps) {
  const { t } = useLanguage();

  const displayName = schoolName || domain || t('websitePublic.defaultSchoolName') || 'School';
  const displayDomain = domain ? `https://${domain}` : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center p-6" data-public-website="true">
      <div className="max-w-md w-full rounded-xl border bg-white p-8 shadow-sm text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <Globe className="h-7 w-7 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">
            {displayName}
          </h1>
          {displayDomain && (
            <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
              <Globe className="h-4 w-4" />
              {displayDomain}
            </p>
          )}
        </div>
        <p className="text-slate-600 text-sm">
          {t('websitePublic.noWebsiteAccess') || 'This school does not have public website access. Please contact the school administrator or visit the main portal to sign in.'}
        </p>
        {requiredPlan && (
          <p className="text-xs text-slate-500">
            {t('websitePublic.upgradeRequired') || 'Upgrade required'}: {requiredPlan}
          </p>
        )}
        <a
          href={getMainAppLoginUrl()}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Mail className="h-4 w-4" />
          {t('websitePublic.portalLogin') || 'Go to portal login'}
        </a>
      </div>
    </div>
  );
}
