import React from 'react';
import { logger } from './logger';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private marks: Map<string, number> = new Map();
  private observers: Set<PerformanceObserver> = new Set();

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  // Start performance measurement
  startMark(name: string): void {
    this.marks.set(name, performance.now());
    performance.mark(`${name}-start`);
  }

  // End performance measurement and log
  endMark(name: string, logThreshold = 50): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      logger.warn('Performance mark not found', {
        component: 'Performance',
        metadata: { name },
      });
      return 0;
    }

    const duration = performance.now() - startTime;
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    if (duration > logThreshold) {
      logger.performance(name, duration, {
        component: 'Performance',
        metadata: { threshold: logThreshold },
      });
    }

    this.marks.delete(name);
    return duration;
  }

  // Measure function execution time
  measure<T>(name: string, fn: () => T): T {
    this.startMark(name);
    try {
      const result = fn();
      this.endMark(name);
      return result;
    } catch (error) {
      this.endMark(name);
      throw error;
    }
  }

  // Measure async function execution time
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMark(name);
    try {
      const result = await fn();
      this.endMark(name);
      return result;
    } catch (error) {
      this.endMark(name);
      throw error;
    }
  }

  // Setup Core Web Vitals monitoring
  setupCoreWebVitals(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      logger.performance('LCP', lastEntry.startTime, {
        component: 'Performance',
        metadata: { 
          type: 'LCP',
          element: (lastEntry as any).element?.tagName,
          good: lastEntry.startTime <= 2500,
        },
      });
    });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        logger.performance('FID', (entry as any).processingStart - (entry as any).startTime, {
          component: 'Performance',
          metadata: { 
            type: 'FID',
            good: ((entry as any).processingStart - (entry as any).startTime) <= 100,
          },
        });
      });
    });

    // Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });

      if (clsValue > 0) {
        logger.performance('CLS', clsValue, {
          component: 'Performance',
          metadata: { 
            type: 'CLS',
            good: clsValue <= 0.1,
          },
        });
      }
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      this.observers.add(lcpObserver);
      this.observers.add(fidObserver);
      this.observers.add(clsObserver);
    } catch (error) {
      logger.warn('Failed to setup performance observers', {
        component: 'Performance',
        metadata: { error: error.toString() },
      });
    }
  }

  // Cleanup observers
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.marks.clear();
  }
}

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React component performance measurement
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName?: string
) {
  const name = componentName || Component.displayName || Component.name || 'Anonymous';

  return React.memo((props: T) => {
    const renderStartTime = React.useRef<number>();
    
    // Start measuring render time
    renderStartTime.current = performance.now();

    React.useLayoutEffect(() => {
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;
        if (renderTime > 16) { // More than one frame at 60fps
          logger.performance(`${name} render`, renderTime, {
            component: name,
            metadata: { type: 'render' },
          });
        }
      }
    });

    return React.createElement(Component, props);
  });
}

// Hook for measuring component performance
export function usePerformanceTracking(componentName: string) {
  const renderStartTime = React.useRef<number>();
  const mountTime = React.useRef<number>();

  React.useEffect(() => {
    mountTime.current = performance.now();
    return () => {
      if (mountTime.current) {
        const totalTime = performance.now() - mountTime.current;
        logger.performance(`${componentName} lifecycle`, totalTime, {
          component: componentName,
          metadata: { type: 'lifecycle' },
        });
      }
    };
  }, [componentName]);

  const startRender = React.useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRender = React.useCallback(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      if (renderTime > 16) {
        logger.performance(`${componentName} render`, renderTime, {
          component: componentName,
          metadata: { type: 'render' },
        });
      }
    }
  }, [componentName]);

  return { startRender, endRender };
}

// Memory management utilities
export const memoryUtils = {
  // Get memory usage information
  getMemoryUsage: (): {
    used: number;
    total: number;
    percentage: number;
  } | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    }
    return null;
  },

  // Monitor memory usage
  monitorMemory: (threshold = 80): void => {
    const checkMemory = () => {
      const usage = memoryUtils.getMemoryUsage();
      if (usage && usage.percentage > threshold) {
        logger.warn('High memory usage detected', {
          component: 'Performance',
          metadata: usage,
        });
      }
    };

    // Check every 30 seconds
    setInterval(checkMemory, 30000);
  },

  // Force garbage collection (if available)
  forceGC: (): void => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      logger.debug('Garbage collection forced', { component: 'Performance' });
    }
  },
};

// Virtual scrolling utilities
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  scrollTop: number;
}

export function calculateVirtualScrollItems(
  itemCount: number,
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5, scrollTop } = options;
  
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(itemCount - 1, startIndex + visibleCount - 1);
  
  const visibleStartIndex = Math.max(0, startIndex - overscan);
  const visibleEndIndex = Math.min(itemCount - 1, endIndex + overscan);
  
  return {
    visibleStartIndex,
    visibleEndIndex,
    offsetY: visibleStartIndex * itemHeight,
    totalHeight: itemCount * itemHeight,
  };
}

// Hook for virtual scrolling
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const virtualItems = React.useMemo(() => {
    return calculateVirtualScrollItems(items.length, {
      itemHeight,
      containerHeight,
      overscan,
      scrollTop,
    });
  }, [items.length, itemHeight, containerHeight, overscan, scrollTop]);

  const visibleItems = React.useMemo(() => {
    return items.slice(virtualItems.visibleStartIndex, virtualItems.visibleEndIndex + 1);
  }, [items, virtualItems.visibleStartIndex, virtualItems.visibleEndIndex]);

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight: virtualItems.totalHeight,
    offsetY: virtualItems.offsetY,
    handleScroll,
  };
}

// Debounce utility for performance
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle utility for performance
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttledCallback = React.useRef<T>();
  const lastRun = React.useRef<number>();

  React.useEffect(() => {
    throttledCallback.current = callback;
  });

  return React.useCallback(
    ((...args: any[]) => {
      if (lastRun.current === undefined) {
        throttledCallback.current?.(...args);
        lastRun.current = Date.now();
      } else {
        window.clearTimeout(lastRun.current as number);
        lastRun.current = window.setTimeout(() => {
          if (Date.now() - lastRun.current! >= delay) {
            throttledCallback.current?.(...args);
            lastRun.current = Date.now();
          }
        }, delay - (Date.now() - lastRun.current)) as unknown as number;
      }
    }) as T,
    [delay]
  );
}

// Image lazy loading utilities
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>();

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          const img = new Image();
          
          img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
            observer.disconnect();
          };
          
          img.onerror = () => {
            setIsError(true);
            observer.disconnect();
          };
          
          img.src = src;
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return { imageSrc, isLoaded, isError, imgRef };
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1, ...options }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [elementRef, options]);

  return isVisible;
}

// Bundle size analyzer (development only)
export const bundleAnalyzer = {
  analyzeChunks: () => {
    if (import.meta.env.DEV) {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const totalSize = scripts.length;
      
      logger.info('Bundle analysis', {
        component: 'Performance',
        metadata: {
          totalChunks: totalSize,
          chunks: scripts.map(script => (script as HTMLScriptElement).src),
        },
      });
    }
  },

  measureBundleLoad: () => {
    if (import.meta.env.DEV) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      logger.performance('Bundle load time', loadTime, {
        component: 'Performance',
        metadata: { type: 'bundle-load' },
      });
    }
  },
};

// Initialize performance monitoring
export const initializePerformanceMonitoring = () => {
  // Only setup Core Web Vitals in production or when explicitly enabled
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_CORE_WEB_VITALS === 'true') {
    performanceMonitor.setupCoreWebVitals();
  }
  
  // Memory monitoring can be expensive, only enable in production
  if (import.meta.env.PROD) {
    memoryUtils.monitorMemory();
  }
  
  // Bundle analysis only when explicitly enabled in dev
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_BUNDLE_ANALYSIS === 'true') {
    bundleAnalyzer.analyzeChunks();
    bundleAnalyzer.measureBundleLoad();
  }

  logger.info('Performance monitoring initialized', {
    component: 'Performance',
  });
};