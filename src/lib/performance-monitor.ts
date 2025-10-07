// Performance Monitoring and Optimization Utilities

import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface MemoryMetric {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private memoryMetrics: MemoryMetric[] = [];
  private observers: PerformanceObserver[] = [];
  
  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
      this.startMemoryMonitoring();
    }
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  private initializeObservers(): void {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      // Navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.logNavigationTiming(entry as PerformanceNavigationTiming);
          }
        });
      });
      
      try {
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (e) {
        logger.warn('Failed to observe navigation timing', { error: (e as Error).message });
      }
      
      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 1000) { // Log slow resources (>1s)
            logger.warn('Slow resource detected', {
              name: entry.name,
              duration: entry.duration,
              type: (entry as PerformanceResourceTiming).initiatorType
            });
          }
        });
      });
      
      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        logger.warn('Failed to observe resource timing', { error: (e as Error).message });
      }
      
      // Long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          logger.warn('Long task detected', {
            duration: entry.duration,
            startTime: entry.startTime
          });
        });
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        // Long task API might not be available
      }
    }
  }
  
  private logNavigationTiming(entry: PerformanceNavigationTiming): void {
    const metrics = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      domComplete: entry.domComplete - entry.domInteractive,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      firstPaint: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0
    };
    
    // Get paint timings
    if ('performance' in window && 'getEntriesByType' in performance) {
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((paintEntry) => {
        if (paintEntry.name === 'first-paint') {
          metrics.firstPaint = paintEntry.startTime;
        } else if (paintEntry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = paintEntry.startTime;
        }
      });
    }
    
    logger.info('Navigation Performance Metrics', metrics);
  }
  
  private startMemoryMonitoring(): void {
    if (!('memory' in performance)) return;
    
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      const memory = (performance as any).memory;
      const metric: MemoryMetric = {
        timestamp: Date.now(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
      
      this.memoryMetrics.push(metric);
      
      // Keep only last 100 metrics (50 minutes of data)
      if (this.memoryMetrics.length > 100) {
        this.memoryMetrics.shift();
      }
      
      // Check for memory leaks
      const usagePercentage = (metric.usedJSHeapSize / metric.jsHeapSizeLimit) * 100;
      if (usagePercentage > 90) {
        logger.critical('High memory usage detected', {
          usagePercentage: usagePercentage.toFixed(2),
          usedMB: (metric.usedJSHeapSize / 1024 / 1024).toFixed(2),
          limitMB: (metric.jsHeapSizeLimit / 1024 / 1024).toFixed(2)
        });
      }
    }, 30000);
  }
  
  // Public methods
  startMeasure(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }
  
  endMeasure(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`No metric found with name: ${name}`);
      return null;
    }
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    // Log if operation took more than 100ms
    if (metric.duration > 100) {
      logger.warn('Slow operation detected', {
        name,
        duration: `${metric.duration.toFixed(2)}ms`,
        metadata: metric.metadata
      });
    }
    
    this.metrics.delete(name);
    return metric.duration;
  }
  
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasure(name);
    return fn().finally(() => {
      this.endMeasure(name);
    });
  }
  
  getMemoryUsage(): MemoryMetric | null {
    if (!('memory' in performance)) return null;
    
    const memory = (performance as any).memory;
    return {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };
  }
  
  getMemoryTrend(): { increasing: boolean; averageGrowthRate: number } | null {
    if (this.memoryMetrics.length < 10) return null;
    
    const recent = this.memoryMetrics.slice(-10);
    const firstUsage = recent[0].usedJSHeapSize;
    const lastUsage = recent[recent.length - 1].usedJSHeapSize;
    const timeDiff = recent[recent.length - 1].timestamp - recent[0].timestamp;
    
    const growthRate = ((lastUsage - firstUsage) / timeDiff) * 1000 * 60; // bytes per minute
    
    return {
      increasing: lastUsage > firstUsage,
      averageGrowthRate: growthRate
    };
  }
  
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
    this.memoryMetrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hooks for performance monitoring
import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const mountTime = useRef<number>(0);
  
  useEffect(() => {
    renderCount.current++;
    
    if (renderCount.current === 1) {
      // First render (mount)
      mountTime.current = performance.now();
      performanceMonitor.startMeasure(`${componentName}-mount`);
    } else {
      // Re-render
      logger.debug(`Component re-rendered: ${componentName}`, {
        renderCount: renderCount.current
      });
    }
    
    return () => {
      if (renderCount.current === 1) {
        // Component unmounting
        const mountDuration = performanceMonitor.endMeasure(`${componentName}-mount`);
        if (mountDuration && mountDuration > 50) {
          logger.warn('Slow component mount', {
            component: componentName,
            duration: `${mountDuration.toFixed(2)}ms`
          });
        }
      }
    };
  }, [componentName]);
  
  return {
    renderCount: renderCount.current,
    measureOperation: (operationName: string) => {
      const fullName = `${componentName}-${operationName}`;
      return {
        start: () => performanceMonitor.startMeasure(fullName),
        end: () => performanceMonitor.endMeasure(fullName)
      };
    }
  };
}

// Debounce utility for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttle utility for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memoization utility
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}
