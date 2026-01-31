import { memo, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useSubscriptionPlans } from '@/hooks/useSubscription';
import { useIndexTranslations } from './translations/useIndexTranslations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const PricingSection = memo(function PricingSection() {
  const { isRTL, language } = useLanguage();
  const { t, get } = useIndexTranslations();
  const { data: subscriptionPlans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  
  const renderFeatureValue = (value: boolean | string) => {
    if (value === true) {
      return <span className="text-green-600 font-bold">✓</span>;
    }
    if (value === false) {
      return <span className="text-red-500 font-bold">✗</span>;
    }
    return <span className="text-emerald-600 font-semibold">{value}</span>;
  };
  
  // Build pricing plans: API is source of truth for names and prices; translations only for labels/fallbacks
  const pricingPlans = useMemo(() => {
    const plans = get('pricing.plans');
    if (!plans) return [];

    const planLookup = new Map(subscriptionPlans.map((plan) => [plan.slug, plan]));
    const localeMap: Record<string, string> = {
      en: 'en-US',
      fa: 'fa-IR',
      ps: 'ps-AF',
      ar: 'ar',
    };
    const locale = localeMap[language] || 'en-US';
    const currencyLabel = t('pricing.currencyAfn');
    const formatPrice = (value: number) =>
      `${new Intl.NumberFormat(locale).format(value)} ${currencyLabel}`;
    const formatCountdown = (validUntil?: Date | null) => {
      if (!validUntil) return null;
      const diffMs = validUntil.getTime() - now;
      if (diffMs <= 0) return t('pricing.offer.ended');
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / (60 * 60 * 24));
      const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;
      const pad = (n: number) => String(n).padStart(2, '0');
      if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
      if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
      if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
      return `${seconds}s`;
    };

    const customPriceLabel = plans.enterprise?.price ?? 'Custom';

    return [
      {
        id: 'starter',
        nameFallback: plans.starter?.name || 'Starter',
        nameEn: 'Starter',
        customPriceLabel,
        planData: planLookup.get('starter'),
        formatPrice,
        formatCountdown,
      },
      {
        id: 'pro',
        nameFallback: plans.pro?.name || 'Pro',
        nameEn: 'Pro',
        customPriceLabel,
        isPopular: true,
        planData: planLookup.get('pro'),
        formatPrice,
        formatCountdown,
      },
      {
        id: 'complete',
        nameFallback: plans.complete?.name || 'Complete',
        nameEn: 'Complete',
        customPriceLabel,
        planData: planLookup.get('complete'),
        formatPrice,
        formatCountdown,
      },
      {
        id: 'enterprise',
        nameFallback: plans.enterprise?.name || 'Enterprise',
        nameEn: 'Enterprise',
        customPriceLabel,
        planData: planLookup.get('enterprise'),
        formatPrice,
        formatCountdown,
      },
    ];
  }, [get, language, now, subscriptionPlans, t]);

  // Build feature comparisons from translations
  const featureComparisons = useMemo(() => {
    const features = get('pricing.comparison.features');
    if (!features) return [];
    
    return [
      { feature: features.studentRegistration, starter: true, pro: true, complete: true, enterprise: true },
      { feature: features.staffManagement, starter: true, pro: true, complete: true, enterprise: true },
      { feature: features.attendance, starter: true, pro: true, complete: true, enterprise: true },
      { feature: features.leavePermissions, starter: true, pro: true, complete: true, enterprise: true },
      { feature: features.leaveManagement, starter: true, pro: true, complete: true, enterprise: true },
      { feature: features.timetable, starter: true, pro: true, complete: true, enterprise: true },
      { feature: features.studentHistory, starter: true, pro: true, complete: true, enterprise: true },
      { feature: features.examSystem, starter: features.simple, pro: features.complete, complete: features.complete, enterprise: features.complete },
      { feature: features.curriculumManagement, starter: false, pro: true, complete: true, enterprise: true },
      { feature: features.subjectAssignment, starter: false, pro: true, complete: true, enterprise: true },
      { feature: features.questionBank, starter: false, pro: true, complete: true, enterprise: true },
      { feature: features.examDetails, starter: false, pro: true, complete: true, enterprise: true },
      { feature: features.library, starter: false, pro: true, complete: true, enterprise: true },
      { feature: features.shortCourses, starter: false, pro: true, complete: true, enterprise: true },
      { feature: features.assets, starter: false, pro: false, complete: true, enterprise: true },
      { feature: features.finance, starter: false, pro: false, complete: true, enterprise: true },
      { feature: features.dms, starter: false, pro: false, complete: true, enterprise: true },
      { feature: features.documentTracking, starter: false, pro: false, complete: true, enterprise: true },
      { feature: features.events, starter: false, pro: false, complete: true, enterprise: true },
      { feature: features.graduation, starter: false, pro: false, complete: true, enterprise: true },
      { feature: features.certificateVerification, starter: false, pro: false, complete: true, enterprise: true },
      { feature: features.idCards, starter: false, pro: false, complete: true, enterprise: true },
      { feature: features.reportTemplates, starter: false, pro: false, complete: true, enterprise: true },
      { feature: features.multiBranch, starter: false, pro: false, complete: false, enterprise: true },
      { feature: features.multiCurrency, starter: false, pro: false, complete: false, enterprise: true },
      { feature: features.advancedReports, starter: false, pro: false, complete: false, enterprise: true },
      { feature: features.customSupport, starter: false, pro: false, complete: false, enterprise: true },
    ];
  }, [get]);

  // Build limits from translations
  const limits = useMemo(() => {
    const limitsData = get('pricing.limits');
    if (!limitsData) return [];
    
    return [
      { limit: limitsData.studentLimit, starter: 'Up to 250', pro: 'Up to 600', complete: 'Up to 1200', enterprise: limitsData.custom },
      { limit: limitsData.userLimit, starter: 'Up to 10', pro: 'Up to 30', complete: 'Up to 50', enterprise: limitsData.custom },
      { limit: limitsData.branchLimit, starter: '1', pro: '1', complete: '1', enterprise: limitsData.custom },
      { limit: limitsData.reportExport, starter: limitsData.standard, pro: limitsData.advanced, complete: limitsData.advancedWithTemplates, enterprise: limitsData.custom },
      { limit: limitsData.backupRestore, starter: limitsData.manual, pro: limitsData.manual, complete: limitsData.automatic, enterprise: limitsData.slaBased },
      { limit: limitsData.permissions, starter: limitsData.detailed, pro: limitsData.detailed, complete: limitsData.detailed, enterprise: limitsData.custom },
    ];
  }, [get]);

  // Build maintenance rows from translations
  const maintenanceRows = useMemo(() => {
    const maintenance = get('pricing.maintenance');
    if (!maintenance) return [];
    
    return [
      { service: maintenance.annualFee, offline: maintenance.optional, online: maintenance.required },
      { service: maintenance.updates, offline: maintenance.includedInFee, online: maintenance.included },
      { service: maintenance.support, offline: maintenance.includedInFee, online: maintenance.included },
      { service: maintenance.backupMonitoring, offline: maintenance.customerSystem, online: maintenance.automaticMonitoring },
      { service: maintenance.hostingServer, offline: maintenance.notAvailable, online: maintenance.includedSeparate },
    ];
  }, [get]);

  // Build maintenance fees from translations
  const maintenanceFees = useMemo(() => {
    const fees = get('pricing.maintenance.fees');
    if (!fees) return [];
    return [fees.basic, fees.standard, fees.complete, fees.online].filter(Boolean);
  }, [get]);

  return (
    <section className="px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-[#0b0b56] mb-3 text-center" dir={isRTL ? "rtl" : "ltr"}>
          {t('pricing.title')}
        </h2>
        <p className="text-base text-slate-600 mb-6 text-center" dir={isRTL ? "rtl" : "ltr"}>
          {t('pricing.subtitle')}
        </p>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 max-w-6xl mx-auto">
        {pricingPlans.map((plan) => {
          const planData = plan.planData;
          const totalFee = Number(planData?.totalFeeAfn) || 0;
          const isCustomPlan = planData?.isCustom ?? plan.id === 'enterprise';
          const offer = planData?.landingOffer ?? null;
          const discountedFee = Number(offer?.discountedTotalFeeAfn) || 0;
          const hasDiscount = !!offer && discountedFee > 0 && discountedFee < totalFee;
          const offerLabel =
            (offer?.metadata?.landing_label as string | undefined) || t('pricing.offer.label');
          const offerMessage =
            (offer?.metadata?.landing_message as string | undefined) || '';
          const offerCountdown = offer?.validUntil ? plan.formatCountdown(offer.validUntil) : null;

          // Price from API only; ensure we never format NaN
          const displayPrice = plansLoading || !planData
            ? t('pricing.priceLoading')
            : isCustomPlan || totalFee <= 0
              ? plan.customPriceLabel
              : plan.formatPrice(totalFee);
          const discountedPrice =
            hasDiscount && discountedFee > 0
              ? plan.formatPrice(discountedFee)
              : displayPrice;

          const displayName = planData?.name ?? plan.nameFallback;

          return (
            <Card
              key={plan.id}
              className="text-center relative hover:shadow-md transition-shadow"
            >
              {plan.isPopular && (
                <Badge className="absolute -top-2 -right-2 bg-[#c9a44d] text-white text-xs px-2 py-1 rounded-full">
                  {t('pricing.plans.pro.popular')}
                </Badge>
              )}
              {hasDiscount && (
                <Badge className="absolute -top-2 -left-2 bg-rose-500 text-white text-xs px-2 py-1 rounded-full">
                  {offerLabel}
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0b0b56]" dir={isRTL ? "rtl" : "ltr"}>
                  {displayName === plan.nameEn ? displayName : `${displayName} (${plan.nameEn})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasDiscount ? (
                  <div className="space-y-1">
                    <div className="text-sm text-slate-500 line-through">{displayPrice}</div>
                    <div className="text-2xl font-bold text-[#0b0b56]">{discountedPrice}</div>
                    <div className="text-xs font-semibold text-emerald-600">
                      {t('pricing.offer.save')} {plan.formatPrice(Number(offer.discountAmountAfn) || 0)}
                    </div>
                    {offerCountdown && (
                      <div className="text-xs font-medium text-orange-600">
                        {t('pricing.offer.endsIn')} {offerCountdown}
                      </div>
                    )}
                    {offerMessage && (
                      <div className="text-xs text-slate-500">{offerMessage}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-[#0b0b56]">{displayPrice}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={`font-bold text-[#0b0b56] ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                    {t('pricing.comparison.title')}
                  </TableHead>
                  <TableHead className="text-center font-bold text-[#0b0b56]">{t('pricing.comparison.plans.starter')}</TableHead>
                  <TableHead className="text-center font-bold text-[#0b0b56]">{t('pricing.comparison.plans.pro')}</TableHead>
                  <TableHead className="text-center font-bold text-[#0b0b56]">{t('pricing.comparison.plans.complete')}</TableHead>
                  <TableHead className="text-center font-bold text-[#0b0b56]">{t('pricing.comparison.plans.enterprise')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureComparisons.map((comparison, index) => (
                  <TableRow key={index} className="border-b border-slate-100">
                    <TableCell className={`py-2 ${isRTL ? "pr-4" : "pl-4"}`} dir={isRTL ? "rtl" : "ltr"}>
                      {comparison.feature}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderFeatureValue(comparison.starter)}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderFeatureValue(comparison.pro)}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderFeatureValue(comparison.complete)}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderFeatureValue(comparison.enterprise)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Limits and Maintenance */}
      <div className="grid grid-cols-1 gap-4">
        {/* Limits Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#0b0b56]" dir={isRTL ? "rtl" : "ltr"}>
              {t('pricing.limits.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={`font-bold text-[#0b0b56] ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                      {t('pricing.limits.limit')}
                    </TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">{t('pricing.comparison.plans.starter')}</TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">{t('pricing.comparison.plans.pro')}</TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">{t('pricing.comparison.plans.complete')}</TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">{t('pricing.comparison.plans.enterprise')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {limits.map((limit, index) => (
                    <TableRow key={index} className="border-b border-slate-100">
                      <TableCell className={`py-2 font-semibold ${isRTL ? "pr-4" : "pl-4"}`} dir={isRTL ? "rtl" : "ltr"}>
                        {limit.limit}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{limit.starter}</TableCell>
                      <TableCell className="text-center font-semibold">{limit.pro}</TableCell>
                      <TableCell className="text-center font-semibold">{limit.complete}</TableCell>
                      <TableCell className="text-center font-semibold">{limit.enterprise}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed" dir={isRTL ? "rtl" : "ltr"}>
              {t('pricing.limits.note')}
            </p>
          </CardContent>
        </Card>

        {/* Maintenance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#0b0b56]" dir={isRTL ? "rtl" : "ltr"}>
              {t('pricing.maintenance.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={`font-bold text-[#0b0b56] ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                      {t('pricing.maintenance.service')}
                    </TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">
                      {t('pricing.maintenance.offline')}
                    </TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">
                      {t('pricing.maintenance.online')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceRows.map((row, index) => (
                    <TableRow key={index} className="border-b border-slate-100">
                      <TableCell className={`py-2 ${isRTL ? "pr-4" : "pl-4"}`} dir={isRTL ? "rtl" : "ltr"}>
                        {row.service}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{row.offline}</TableCell>
                      <TableCell className="text-center font-semibold">{row.online}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Maintenance fee chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {maintenanceFees.map((fee, index) => (
                <Badge
                  key={index}
                  className="bg-gradient-to-r from-[#f0e6b3] to-[#f0e6b3] text-[#0b0b56] border border-[#c9a44d]/30 font-semibold px-3 py-1 text-sm"
                >
                  {fee}
                </Badge>
              ))}
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed" dir={isRTL ? "rtl" : "ltr"}>
              {t('pricing.maintenance.description')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <div className={`text-center text-base text-slate-600 mt-4 font-medium space-y-2 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
        <p>{t('pricing.notes.note')}</p>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-bold text-[#0b0b56] mb-1">{t('pricing.notes.important')}</p>
          <p className="text-sm leading-relaxed">
            {t('pricing.notes.importantText')}
          </p>
        </div>
      </div>
      </div>
    </section>
  );
});
