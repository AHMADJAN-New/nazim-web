// Lazy-loaded recharts module
// Import from this file instead of 'recharts' directly to enable code splitting
// This creates a separate chunk that only loads when charts are rendered

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Chart loading skeleton component
export const ChartSkeleton = () => (
  <div className="flex aspect-video items-center justify-center">
    <Skeleton className="h-full w-full" />
  </div>
);

// Singleton pattern: Load recharts once and cache it
// This prevents multiple parallel imports that cause initialization errors
let rechartsModule: typeof import('recharts') | null = null;
let loadPromise: Promise<typeof import('recharts')> | null = null;

/**
 * Load recharts module (singleton pattern)
 * Ensures recharts is only loaded once to prevent initialization errors
 */
function loadRecharts(): Promise<typeof import('recharts')> {
  if (rechartsModule) {
    return Promise.resolve(rechartsModule);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = import('recharts').then((mod) => {
    rechartsModule = mod;
    return mod;
  });

  return loadPromise;
}

// Wrapper components that lazy-load recharts
// These throw promises that Suspense can catch
function createLazyComponent<T extends React.ComponentType<any>>(
  getComponent: (mod: typeof import('recharts')) => T
): T {
  return ((props: any) => {
    if (!rechartsModule) {
      // Throw promise for Suspense to catch
      throw loadRecharts();
    }
    const Component = getComponent(rechartsModule);
    return <Component {...props} />;
  }) as T;
}

// Export lazy-loaded components
export const ResponsiveContainer = createLazyComponent((mod) => mod.ResponsiveContainer);
export const BarChart = createLazyComponent((mod) => mod.BarChart);
export const Bar = createLazyComponent((mod) => mod.Bar);
export const XAxis = createLazyComponent((mod) => mod.XAxis);
export const YAxis = createLazyComponent((mod) => mod.YAxis);
export const CartesianGrid = createLazyComponent((mod) => mod.CartesianGrid);
export const Tooltip = createLazyComponent((mod) => mod.Tooltip);
export const LineChart = createLazyComponent((mod) => mod.LineChart);
export const Line = createLazyComponent((mod) => mod.Line);
export const Area = createLazyComponent((mod) => mod.Area);
export const AreaChart = createLazyComponent((mod) => mod.AreaChart);
export const Legend = createLazyComponent((mod) => mod.Legend);
export const PieChart = createLazyComponent((mod) => mod.PieChart);
export const Pie = createLazyComponent((mod) => mod.Pie);
export const Cell = createLazyComponent((mod) => mod.Cell);
