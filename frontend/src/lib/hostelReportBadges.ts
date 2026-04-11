import type { VariantProps } from 'class-variance-authority';

import { badgeVariants } from '@/components/ui/badge';

export type HostelReportBadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const METRIC_CYCLE: HostelReportBadgeVariant[] = ['info', 'success', 'warning', 'boarder'];

/** Cycles semantic variants for KPI/count badges (tabs, headers). */
export function hostelMetricBadgeVariant(index: number): HostelReportBadgeVariant {
  return METRIC_CYCLE[index % METRIC_CYCLE.length]!;
}
