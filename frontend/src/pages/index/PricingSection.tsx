import { memo, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
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
  const { isRTL } = useLanguage();
  const { t, translations, get } = useIndexTranslations();
  
  const renderFeatureValue = (value: boolean | string) => {
    if (value === true) {
      return <span className="text-green-600 font-bold">✓</span>;
    }
    if (value === false) {
      return <span className="text-red-500 font-bold">✗</span>;
    }
    return <span className="text-emerald-600 font-semibold">{value}</span>;
  };
  
  // Build pricing plans from translations
  const pricingPlans = useMemo(() => {
    const plans = get('pricing.plans');
    if (!plans) return [];
    
    return [
      {
        id: 'starter',
        name: plans.starter?.name || 'Starter',
        nameEn: 'Starter',
        price: plans.starter?.price || '12,000 AFN',
      },
      {
        id: 'pro',
        name: plans.pro?.name || 'Pro',
        nameEn: 'Pro',
        price: plans.pro?.price || '25,000 AFN',
        isPopular: true,
      },
      {
        id: 'complete',
        name: plans.complete?.name || 'Complete',
        nameEn: 'Complete',
        price: plans.complete?.price || '35,000 AFN',
      },
      {
        id: 'enterprise',
        name: plans.enterprise?.name || 'Enterprise',
        nameEn: 'Enterprise',
        price: plans.enterprise?.price || 'Custom',
      },
    ];
  }, [get]);

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
        {pricingPlans.map((plan) => (
          <Card
            key={plan.id}
            className="text-center relative hover:shadow-md transition-shadow"
          >
            {plan.isPopular && (
              <Badge className="absolute -top-2 -right-2 bg-[#c9a44d] text-white text-xs px-2 py-1 rounded-full">
                {t('pricing.plans.pro.popular')}
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#0b0b56]" dir={isRTL ? "rtl" : "ltr"}>
                {plan.name} ({plan.nameEn})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0b0b56]">{plan.price}</div>
            </CardContent>
          </Card>
        ))}
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
