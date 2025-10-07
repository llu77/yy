// React Performance Optimization Components and Utilities

import React, { memo, lazy, Suspense, useCallback, useMemo, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { performanceMonitor } from './performance-monitor';

// Lazy loading wrapper with error boundary
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string,
  retries = 3
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        performanceMonitor.startMeasure(`lazy-load-${componentName}`);
        const module = await importFn();
        performanceMonitor.endMeasure(`lazy-load-${componentName}`);
        return module;
      } catch (error) {
        lastError = error as Error;
        
        // If it's a chunk load error, wait and retry
        if (error instanceof Error && error.message.includes('Loading chunk')) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  });
}

// Optimized lazy loading with preload
export function lazyWithPreload<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): {
  Component: React.LazyExoticComponent<T>;
  preload: () => Promise<void>;
} {
  let preloadedModule: Promise<{ default: T }> | null = null;
  
  const preload = () => {
    if (!preloadedModule) {
      preloadedModule = importFn();
    }
    return preloadedModule.then(() => undefined);
  };
  
  const Component = lazy(() => preloadedModule || importFn());
  
  return { Component, preload };
}

// Loading fallback component
export const LoadingFallback: React.FC<{ 
  height?: string | number;
  text?: string;
}> = memo(({ height = 200, text = 'جاري التحميل...' }) => (
  <div className="flex flex-col items-center justify-center p-4" style={{ minHeight: height }}>
    <Skeleton className="h-12 w-12 rounded-full mb-4" />
    <Skeleton className="h-4 w-32" />
    {text && <p className="text-sm text-muted-foreground mt-2">{text}</p>}
  </div>
));

LoadingFallback.displayName = 'LoadingFallback';

// Optimized Suspense wrapper
export const OptimizedSuspense: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
}> = ({ children, fallback, componentName = 'Component' }) => {
  const mountTime = useRef(performance.now());
  
  useEffect(() => {
    const loadTime = performance.now() - mountTime.current;
    if (loadTime > 1000) {
      performanceMonitor.startMeasure(`slow-suspense-${componentName}`);
      performanceMonitor.endMeasure(`slow-suspense-${componentName}`);
    }
  }, [componentName]);
  
  return (
    <Suspense fallback={fallback || <LoadingFallback />}>
      {children}
    </Suspense>
  );
};

// Virtual list component for large data sets
interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 3,
  className = ''
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [ref, options]);
  
  return isIntersecting;
}

// Image lazy loading component
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  onLoadTime?: (time: number) => void;
}

export const LazyImage: React.FC<LazyImageProps> = memo(({
  src,
  alt,
  fallback,
  onLoadTime,
  className,
  ...props
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const isIntersecting = useIntersectionObserver(imgRef, {
    threshold: 0.01,
    rootMargin: '50px'
  });
  
  const loadStartTime = useRef<number>(0);
  
  useEffect(() => {
    if (isIntersecting && src && !isLoaded && !error) {
      loadStartTime.current = performance.now();
    }
  }, [isIntersecting, src, isLoaded, error]);
  
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    const loadTime = performance.now() - loadStartTime.current;
    onLoadTime?.(loadTime);
    
    if (loadTime > 1000) {
      performanceMonitor.startMeasure(`slow-image-${src}`);
      performanceMonitor.endMeasure(`slow-image-${src}`);
    }
  }, [src, onLoadTime]);
  
  const handleError = useCallback(() => {
    setError(true);
  }, []);
  
  if (error && fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <>
      {!isLoaded && !error && (
        <Skeleton className={`absolute inset-0 ${className}`} />
      )}
      <img
        ref={imgRef}
        src={isIntersecting ? src : undefined}
        alt={alt}
        className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </>
  );
});

LazyImage.displayName = 'LazyImage';

// Debounced input component
interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = memo(({
  value: initialValue,
  onChange,
  debounceMs = 500,
  ...props
}) => {
  const [value, setValue] = React.useState(initialValue);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounceMs);
    
    return () => clearTimeout(timeout);
  }, [value, debounceMs, onChange]);
  
  return (
    <input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
});

DebouncedInput.displayName = 'DebouncedInput';

// Optimized table with virtualization
interface OptimizedTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    render?: (value: any, item: T) => React.ReactNode;
  }>;
  rowHeight?: number;
  height?: number;
  onRowClick?: (item: T) => void;
}

export function OptimizedTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 48,
  height = 400,
  onRowClick
}: OptimizedTableProps<T>) {
  const renderRow = useCallback((item: T, index: number) => (
    <tr 
      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onRowClick?.(item)}
    >
      {columns.map(column => (
        <td key={String(column.key)} className="px-4 py-2">
          {column.render 
            ? column.render(item[column.key], item)
            : String(item[column.key] ?? '')
          }
        </td>
      ))}
    </tr>
  ), [columns, onRowClick]);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted sticky top-0 z-10">
          <tr>
            {columns.map(column => (
              <th 
                key={String(column.key)} 
                className="px-4 py-2 text-right font-medium"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
      </table>
      <VirtualList
        items={data}
        height={height - rowHeight} // Subtract header height
        itemHeight={rowHeight}
        renderItem={(item, index) => (
          <table className="w-full">
            <tbody>{renderRow(item, index)}</tbody>
          </table>
        )}
      />
    </div>
  );
}

// Export optimized memo with custom comparison
export function optimizedMemo<P extends object>(
  Component: React.FC<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
): React.MemoExoticComponent<React.FC<P>> {
  return memo(Component, propsAreEqual || ((prevProps, nextProps) => {
    // Custom shallow comparison that ignores functions
    const prevKeys = Object.keys(prevProps) as Array<keyof P>;
    const nextKeys = Object.keys(nextProps) as Array<keyof P>;
    
    if (prevKeys.length !== nextKeys.length) return false;
    
    for (const key of prevKeys) {
      if (typeof prevProps[key] === 'function' && typeof nextProps[key] === 'function') {
        continue; // Skip function comparison
      }
      if (prevProps[key] !== nextProps[key]) return false;
    }
    
    return true;
  }));
}
