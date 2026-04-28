// @ts-check
/**
 * Performance Monitoring Utility
 * Tracks key performance metrics for the application
 */
class PerformanceMonitor {
  metrics: Map<string, any>;
  enabled: boolean;

  constructor() {
    this.metrics = new Map();
    this.enabled = typeof performance !== 'undefined';
  }

  /**
   * Start timing an operation
   * @param {string} name - Name of the operation to track
   * @returns {string} Unique ID for this timing operation
   */
  start(name: string): string | null {
    if (!this.enabled) return null;
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.metrics.set(id, {
      name,
      startTime: performance.now(),
      endTime: null,
      duration: null,
    });
    return id;
  }

  /**
   * End timing an operation
   * @param {string} id - ID returned from start()
   * @returns {number|null} Duration in milliseconds
   */
  end(id: string): number | null {
    if (!this.enabled || !this.metrics.has(id)) return null;
    const metric = this.metrics.get(id);
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Log slow operations (>100ms)
    if (metric.duration > 100) {
      console.warn(
        `[Performance] ${metric.name} took ${metric.duration.toFixed(2)}ms`
      );
    }

    return metric.duration;
  }

  /**
   * Mark a point in time for a specific metric
   * @param {string} name - Name of the metric
   */
  mark(name: string): void {
    if (!this.enabled) return;
    performance.mark(name);
  }

  /**
   * Measure the time between two marks
   * @param {string} startMark - Name of the start mark
   * @param {string} endMark - Name of the end mark
   * @param {string} measureName - Name for the measurement
   * @returns {number|null} Duration in milliseconds
   */
  measure(startMark: string, endMark: string, measureName: string): number | null {
    if (!this.enabled) return null;
    try {
      performance.measure(measureName, startMark, endMark);
      const entries = performance.getEntriesByName(measureName);
      if (entries.length > 0) {
        return entries[0].duration;
      }
    } catch (e) {
      console.warn('[Performance] Measurement failed:', e);
    }
    return null;
  }

  /**
   * Get memory usage if available
   * @returns {Object|null} Memory usage information
   */
  getMemoryUsage(): any | null {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  /**
   * Log current performance metrics summary
   */
  logSummary(): void {
    if (!this.enabled) return;

    console.group('[Performance Metrics Summary]');

    // Calculate average durations by operation name
    const byName = new Map<string, number[]>();
    this.metrics.forEach((metric) => {
      if (metric.duration !== null) {
        if (!byName.has(metric.name)) {
          byName.set(metric.name, []);
        }
        byName.get(metric.name)!.push(metric.duration);
      }
    });

    byName.forEach((durations, name) => {
      const avg = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      console.log(
        `${name}: avg ${avg.toFixed(2)}ms, min ${min.toFixed(2)}ms, max ${max.toFixed(2)}ms (${durations.length} calls)`
      );
    });

    // Log memory usage
    const memory = this.getMemoryUsage();
    if (memory) {
      const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
      const limitMB = (memory.jsHeapSizeLimit / 1048576).toFixed(2);
      console.log(`Memory: ${usedMB}MB / ${totalMB}MB (limit: ${limitMB}MB)`);
    }

    console.groupEnd();
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience function for timing operations
export async function withPerformanceTiming(name: string, fn: () => Promise<any>) {
  const id = performanceMonitor.start(name);
  try {
    const result = await fn();
    performanceMonitor.end(id);
    return result;
  } catch (error) {
    performanceMonitor.end(id);
    throw error;
  }
}
