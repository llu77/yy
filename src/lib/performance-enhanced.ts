// Enhanced Performance Monitoring System
import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  
  private constructor() {
    this.setupDefaultThresholds();
    this.initializeObservers();
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  private setupDefaultThresholds() {
    // Page load thresholds
    this.thresholds.set('FCP', { metric: 'FCP', warning: 1800, critical: 3000 });
    this.thresholds.set('LCP', { metric: 'LCP', warning: 2500, critical: 4000 });
    this.thresholds.set('FID', { metric: 'FID', warning: 100, critical: 300 });
    this.thresholds.set('CLS', { metric: 'CLS', warning: 0.1, critical: 0.25 });
    this.thresholds.set('TTFB', { metric: 'TTFB', warning: 800, critical: 1800 });
    
    // API thresholds
    this.thresholds.set('api-response', { metric: 'api-response', warning: 1000, critical: 3000 });
    this.thresholds.set('db-query', { metric: 'db-query', warning: 100, critical: 500 });
  }
  
  private initializeObservers() {
    if (typeof window === 'undefined') return;
    
    // Core Web Vitals
    this.observeWebVitals();
    
    // Resource timing
    this.observeResources();
    
    // Long tasks
    this.observeLongTasks();
    
    // Memory usage
    this.observeMemory();
  }
  
  private observeWebVitals() {
    // First Contentful Paint
    const paintObserver = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime, 'ms');
        }
      }
    });
    paintObserver.observe({ entryTypes: ['paint'] });
    this.observers.set('paint', paintObserver);
    
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entries) => {
      const lastEntry = entries.getEntries().at(-1);
      if (lastEntry) {
        this.recordMetric('LCP', lastEntry.startTime, 'ms');
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.set('lcp', lcpObserver);
    
    // Layout Shift
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];
    
    const layoutShiftObserver = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          clsEntries.push(entry);
        }
      }
      this.recordMetric('CLS', clsValue, 'score');
    });
    layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.set('cls', layoutShiftObserver);
  }
  
  private observeResources() {
    const resourceObserver = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries() as PerformanceResourceTiming[]) {
        const duration = entry.responseEnd - entry.startTime;
        const size = entry.transferSize || 0;
        
        // Track slow resources
        if (duration > 1000) {
          this.recordMetric('slow-resource', duration, 'ms', {
            name: entry.name,
            type: entry.initiatorType,
            size: size.toString()
          });
          
          logger.warn('Slow resource detected', {
            url: entry.name,
            duration,
            size,
            type: entry.initiatorType
          });
        }
        
        // Track large resources
        if (size > 500 * 1024) { // 500KB
          this.recordMetric('large-resource', size, 'bytes', {
            name: entry.name,
            type: entry.initiatorType,
            duration: duration.toString()
          });
        }
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.set('resource', resourceObserver);
  }
  
  private observeLongTasks() {
    if ('PerformanceObserver' in window && 'supportedEntryTypes' in PerformanceObserver) {
      const supportedTypes = (PerformanceObserver as any).supportedEntryTypes;
      
      if (supportedTypes.includes('longtask')) {
        const longTaskObserver = new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) {
            this.recordMetric('long-task', entry.duration, 'ms', {
              name: entry.name,
              startTime: entry.startTime.toString()
            });
            
            if (entry.duration > 100) {
              logger.warn('Long task detected', {
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      }
    }
  }
  
  private observeMemory() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        
        this.recordMetric('js-heap-used', memory.usedJSHeapSize, 'bytes');
        this.recordMetric('js-heap-limit', memory.jsHeapSizeLimit, 'bytes');
        
        const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usage > 90) {
          logger.warn('High memory usage', {
            usage: `${usage.toFixed(2)}%`,
            used: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }
  
  recordMetric(
    name: string, 
    value: number, 
    unit: string = 'ms', 
    tags?: Record<string, string>
  ) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);
    
    // Keep only last 100 entries per metric
    if (metricArray.length > 100) {
      metricArray.shift();
    }
    
    // Check thresholds
    this.checkThreshold(name, value);
  }
  
  private checkThreshold(metricName: string, value: number) {
    const threshold = this.thresholds.get(metricName);
    if (!threshold) return;
    
    if (value > threshold.critical) {
      logger.error(`Performance critical: ${metricName}`, {
        value,
        threshold: threshold.critical,
        unit: 'ms'
      });
    } else if (value > threshold.warning) {
      logger.warn(`Performance warning: ${metricName}`, {
        value,
        threshold: threshold.warning,
        unit: 'ms'
      });
    }
  }
  
  // API timing helper
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      this.recordMetric(name, duration, 'ms', tags);
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.recordMetric(`${name}-error`, duration, 'ms', {
        ...tags,
        error: (error as Error).message
      });
      
      throw error;
    }
  }
  
  // Sync operation timing
  measure<T>(
    name: string,
    operation: () => T,
    tags?: Record<string, string>
  ): T {
    const start = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - start;
      
      this.recordMetric(name, duration, 'ms', tags);
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.recordMetric(`${name}-error`, duration, 'ms', {
        ...tags,
        error: (error as Error).message
      });
      
      throw error;
    }
  }
  
  // Get metrics summary
  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;
      
      const values = metrics.map(m => m.value);
      const sorted = [...values].sort((a, b) => a - b);
      
      summary[name] = {
        count: metrics.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        latest: metrics[metrics.length - 1].value,
        unit: metrics[0].unit
      };
    }
    
    return summary;
  }
  
  // Export metrics for analysis
  exportMetrics(): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];
    
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    
    return allMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
  }
  
  // Cleanup observers
  destroy() {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    this.clearMetrics();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hooks
export function usePerformanceMonitor() {
  return performanceMonitor;
}

// HOC for component performance tracking
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return (props: P) => {
    const startTime = performance.now();
    
    React.useEffect(() => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.recordMetric(
        'component-render',
        renderTime,
        'ms',
        { component: componentName }
      );
    }, []);
    
    return <Component {...props} />;
  };
}