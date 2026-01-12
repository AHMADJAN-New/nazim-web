import { memo } from 'react';
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
import {
  pricingPlans,
  featureComparisons,
  limits,
  maintenanceRows,
  maintenanceFees,
} from './data';

export const PricingSection = memo(function PricingSection() {
  const renderFeatureValue = (value: boolean | string) => {
    if (value === true) {
      return <span className="text-green-600 font-bold">✓</span>;
    }
    if (value === false) {
      return <span className="text-red-500 font-bold">✗</span>;
    }
    return <span className="text-emerald-600 font-semibold">{value}</span>;
  };

  return (
    <section className="px-6 py-6">
      <h2 className="text-2xl font-bold text-[#0b0b56] mb-3 text-center" dir="rtl">
        د ناظم سیستم پکېجونه او بیې
      </h2>
      <p className="text-base text-slate-600 mb-6 text-center" dir="rtl">
        هر پکېج د اړتیا مطابق ټاکل کېږي، او لوړ پکېج کې نورې برخې فعالې وي.
      </p>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {pricingPlans.map((plan) => (
          <Card
            key={plan.id}
            className="text-center relative hover:shadow-md transition-shadow"
          >
            {plan.isPopular && (
              <Badge className="absolute -top-2 -right-2 bg-[#c9a44d] text-white text-xs px-2 py-1 rounded-full">
                محبوب
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#0b0b56]" dir="rtl">
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
                  <TableHead className="text-right font-bold text-[#0b0b56]" dir="rtl">
                    ځانګړتیاوې
                  </TableHead>
                  <TableHead className="text-center font-bold text-[#0b0b56]">اساسي</TableHead>
                  <TableHead className="text-center font-bold text-[#0b0b56]">پرو</TableHead>
                  <TableHead className="text-center font-bold text-[#0b0b56]">مکمل</TableHead>
                  <TableHead className="text-center font-bold text-[#0b0b56]">انټرپرایز</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureComparisons.map((comparison, index) => (
                  <TableRow key={index} className="border-b border-slate-100">
                    <TableCell className="py-2 pr-4" dir="rtl">
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
            <CardTitle className="text-lg font-bold text-[#0b0b56]" dir="rtl">
              حدود او ظرفیتونه (Limits)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-bold text-[#0b0b56]" dir="rtl">
                      حد / ظرفیت
                    </TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">اساسي</TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">پرو</TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">مکمل</TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">انټرپرایز</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {limits.map((limit, index) => (
                    <TableRow key={index} className="border-b border-slate-100">
                      <TableCell className="py-2 pr-4 font-semibold" dir="rtl">
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
            <p className="mt-3 text-sm text-slate-600 leading-relaxed" dir="rtl">
              یادونه: که ستاسو د مدرسې اړتیاوې له دې حدونو لوړې وي، نو د ځانګړي پکېج (Custom
              Package) په توګه تنظیمېږي.
            </p>
          </CardContent>
        </Card>

        {/* Maintenance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#0b0b56]" dir="rtl">
              ساتنه، تازه کول او تخنیکي ملاتړ (Maintenance)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-bold text-[#0b0b56]" dir="rtl">
                      خدمت
                    </TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">
                      آفلاین نسخه
                    </TableHead>
                    <TableHead className="text-center font-bold text-[#0b0b56]">
                      آنلاین نسخه
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceRows.map((row, index) => (
                    <TableRow key={index} className="border-b border-slate-100">
                      <TableCell className="py-2 pr-4" dir="rtl">
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

            <p className="mt-3 text-sm text-slate-600 leading-relaxed" dir="rtl">
              وضاحت: د ساتنې فیس کې د سافټویر تازه کول، تخنیکي ملاتړ، د ستونزو حل، او د امنیت
              اړوند اصلاحات شامل وي.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <div className="text-center text-base text-slate-600 mt-4 font-medium space-y-2" dir="rtl">
        <p>یادونه: تاسو کولای شئ د خپلې خوښی فنکشنونه د همدې بیو په مناسبت انتخاب کړئ.</p>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-bold text-[#0b0b56] mb-1">مهمه خبرتیا:</p>
          <p className="text-sm leading-relaxed">
            ناظم سیستم دواړه آنلاین او آفلاین نسخې لري. دواړه نسخې یو شان ځانګړتیاوې لري. د
            آنلاین سیستم لپاره د کال د ساتنې او تازه کولو فیس او محدودیتونه شته. په آفلاین بڼه کې
            نشته.
          </p>
        </div>
      </div>
    </section>
  );
});
