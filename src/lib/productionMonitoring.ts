/**
 * MOCARDS CLOUD - Production Monitoring & Error Tracking
 * Enterprise-grade monitoring for production deployment
 * @version 1.0.0
 */

interface ErrorEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'critical';
  message: string;
  stack?: string;
  context?: any;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
}

interface PerformanceMetric {
  id: string;
  timestamp: string;
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  context?: any;
}

interface BusinessMetric {
  timestamp: string;
  event: string;
  value: number;
  metadata?: any;
}

class ProductionMonitor {
  private static instance: ProductionMonitor;
  private sessionId: string;
  private errorQueue: ErrorEvent[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private businessQueue: BusinessMetric[] = [];
  private isProduction: boolean;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = import.meta.env.PROD;
    this.setupGlobalErrorHandlers();
    this.startPerformanceMonitoring();
    this.scheduleDataFlush();
  }

  static getInstance(): ProductionMonitor {
    if (!ProductionMonitor.instance) {
      ProductionMonitor.instance = new ProductionMonitor();
    }
    return ProductionMonitor.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Setup global error handlers
  private setupGlobalErrorHandlers(): void {
    // Catch JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError('error', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('critical', `Unhandled Promise Rejection: ${event.reason}`, {
        reason: event.reason,
        promise: event.promise
      });
    });

    // Override console methods to capture logs
    if (this.isProduction) {
      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (...args) => {
        this.logError('error', args.join(' '), { originalArgs: args });
        originalError.apply(console, args);
      };

      console.warn = (...args) => {
        this.logError('warn', args.join(' '), { originalArgs: args });
        originalWarn.apply(console, args);
      };
    }
  }

  // Start performance monitoring
  private startPerformanceMonitoring(): void {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.logMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart, 'ms');
          this.logMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart, 'ms');
          this.logMetric('first_byte', navigation.responseStart - navigation.fetchStart, 'ms');
        }

        // Monitor memory usage if available
        const memory = (performance as any).memory;
        if (memory) {
          this.logMetric('memory_used', memory.usedJSHeapSize, 'bytes');
          this.logMetric('memory_total', memory.totalJSHeapSize, 'bytes');
          this.logMetric('memory_limit', memory.jsHeapSizeLimit, 'bytes');
        }
      }, 1000);
    });

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          this.logMetric(`resource_load_${resource.initiatorType}`, resource.duration, 'ms', {
            name: resource.name,
            size: resource.transferSize
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Performance observer not supported');
    }
  }

  // Schedule periodic data flush
  private scheduleDataFlush(): void {
    // Flush data every 30 seconds
    setInterval(() => {
      this.flushData();
    }, 30000);

    // Flush data when page is about to unload
    window.addEventListener('beforeunload', () => {
      this.flushData();
    });
  }

  // Log error events
  logError(level: ErrorEvent['level'], message: string, context?: any): void {
    const error: ErrorEvent = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      stack: context?.error || new Error().stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      sessionId: this.sessionId
    };

    this.errorQueue.push(error);

    // Store in localStorage for persistence
    this.persistError(error);

    // Log critical errors immediately in production
    if (level === 'critical' && this.isProduction) {
      console.error('🚨 CRITICAL ERROR:', error);
      this.flushData();
    }
  }

  // Log performance metrics
  logMetric(name: string, value: number, unit: PerformanceMetric['unit'], context?: any): void {
    const metric: PerformanceMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      name,
      value,
      unit,
      context
    };

    this.metricsQueue.push(metric);
  }

  // Log business metrics
  logBusinessEvent(event: string, value: number = 1, metadata?: any): void {
    const businessMetric: BusinessMetric = {
      timestamp: new Date().toISOString(),
      event,
      value,
      metadata
    };

    this.businessQueue.push(businessMetric);

    // Store important business events immediately
    if (['card_generated', 'clinic_created', 'appointment_booked'].includes(event)) {
      this.persistBusinessEvent(businessMetric);
    }
  }

  // Persist error to localStorage
  private persistError(error: ErrorEvent): void {
    try {
      const errors = this.getStoredErrors();
      errors.push(error);

      // Keep only last 100 errors
      if (errors.length > 100) {
        errors.splice(0, errors.length - 100);
      }

      localStorage.setItem('mocards_error_log', JSON.stringify(errors));
    } catch (e) {
      console.warn('Failed to persist error to localStorage');
    }
  }

  // Persist business event to localStorage
  private persistBusinessEvent(event: BusinessMetric): void {
    try {
      const events = this.getStoredBusinessEvents();
      events.push(event);

      // Keep only last 50 business events
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }

      localStorage.setItem('mocards_business_events', JSON.stringify(events));
    } catch (e) {
      console.warn('Failed to persist business event to localStorage');
    }
  }

  // Get stored errors from localStorage
  private getStoredErrors(): ErrorEvent[] {
    try {
      const stored = localStorage.getItem('mocards_error_log');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Get stored business events from localStorage
  private getStoredBusinessEvents(): BusinessMetric[] {
    try {
      const stored = localStorage.getItem('mocards_business_events');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Get current user ID from session
  private getCurrentUserId(): string | undefined {
    try {
      // Try to get from various possible session storage locations
      const session = localStorage.getItem('mocards_current_user');
      if (session) {
        const user = JSON.parse(session);
        return user.id || user.username;
      }
    } catch (e) {
      // Ignore errors
    }
    return undefined;
  }

  // Flush data to console/external service
  private flushData(): void {
    if (this.errorQueue.length > 0 || this.metricsQueue.length > 0 || this.businessQueue.length > 0) {
      const flushData = {
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        errors: [...this.errorQueue],
        metrics: [...this.metricsQueue],
        businessEvents: [...this.businessQueue],
        systemInfo: this.getSystemInfo()
      };

      // In production, this would send to external monitoring service
      if (this.isProduction) {
        console.log('📊 Flushing monitoring data:', {
          errors: this.errorQueue.length,
          metrics: this.metricsQueue.length,
          businessEvents: this.businessQueue.length
        });
      } else {
        console.log('📊 Development monitoring data:', flushData);
      }

      // Store flush data in localStorage for debugging
      localStorage.setItem('mocards_last_flush', JSON.stringify(flushData));

      // Clear queues
      this.errorQueue = [];
      this.metricsQueue = [];
      this.businessQueue = [];
    }
  }

  // Get system information
  private getSystemInfo(): any {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : null,
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null
    };
  }

  // Public API methods
  getErrorCount(): number {
    return this.getStoredErrors().length;
  }

  getRecentErrors(limit: number = 10): ErrorEvent[] {
    return this.getStoredErrors().slice(-limit);
  }

  getBusinessEventCount(): number {
    return this.getStoredBusinessEvents().length;
  }

  clearStoredData(): void {
    localStorage.removeItem('mocards_error_log');
    localStorage.removeItem('mocards_business_events');
    localStorage.removeItem('mocards_last_flush');
    this.errorQueue = [];
    this.metricsQueue = [];
    this.businessQueue = [];
  }

  // Generate monitoring report
  generateReport(): any {
    return {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      errorCount: this.getErrorCount(),
      recentErrors: this.getRecentErrors(5),
      businessEventCount: this.getBusinessEventCount(),
      systemInfo: this.getSystemInfo(),
      queueSizes: {
        errors: this.errorQueue.length,
        metrics: this.metricsQueue.length,
        businessEvents: this.businessQueue.length
      }
    };
  }
}

// Export singleton instance
export const productionMonitor = ProductionMonitor.getInstance();

// Convenience methods for common operations
export const logError = (level: ErrorEvent['level'], message: string, context?: any) => {
  productionMonitor.logError(level, message, context);
};

export const logPerformance = (name: string, value: number, unit: PerformanceMetric['unit'], context?: any) => {
  productionMonitor.logMetric(name, value, unit, context);
};

export const logBusinessEvent = (event: string, value?: number, metadata?: any) => {
  productionMonitor.logBusinessEvent(event, value, metadata);
};

export default productionMonitor;