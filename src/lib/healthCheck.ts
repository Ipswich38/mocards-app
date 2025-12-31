/**
 * MOCARDS CLOUD - Production Health Check System
 * Comprehensive monitoring and diagnostics for production deployment
 * @version 1.0.0
 */

import { supabase } from './supabase';
import { cardOperations, clinicOperations } from './data';

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  responseTime?: number;
  details?: any;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  checks: {
    database: HealthCheckResult;
    authentication: HealthCheckResult;
    cardOperations: HealthCheckResult;
    clinicOperations: HealthCheckResult;
    storage: HealthCheckResult;
    performance: HealthCheckResult;
  };
  summary: {
    totalChecks: number;
    healthyChecks: number;
    warningChecks: number;
    criticalChecks: number;
  };
}

class HealthChecker {
  private static instance: HealthChecker;
  private lastHealthCheck: SystemHealth | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  // Database connectivity check
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase
        .from('perks')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'critical',
          message: `Database connection failed: ${error.message}`,
          timestamp: new Date().toISOString(),
          responseTime
        };
      }

      return {
        status: responseTime < 1000 ? 'healthy' : 'warning',
        message: responseTime < 1000
          ? 'Database connection healthy'
          : 'Database connection slow but functional',
        timestamp: new Date().toISOString(),
        responseTime,
        details: { recordCount: data?.length || 0 }
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  // Authentication system check
  async checkAuthentication(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Test session validation
      const session = supabase.auth.getSession();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'Authentication system operational',
        timestamp: new Date().toISOString(),
        responseTime,
        details: { sessionAvailable: !!session }
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Authentication check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  // Card operations functionality check
  async checkCardOperations(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const cards = await cardOperations.getAll();
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 2000 ? 'healthy' : 'warning',
        message: responseTime < 2000
          ? 'Card operations functioning normally'
          : 'Card operations slow but functional',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          totalCards: cards.length,
          activeCards: cards.filter(c => c.status === 'active').length
        }
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Card operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  // Clinic operations functionality check
  async checkClinicOperations(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const clinics = await clinicOperations.getAll();
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 2000 ? 'healthy' : 'warning',
        message: responseTime < 2000
          ? 'Clinic operations functioning normally'
          : 'Clinic operations slow but functional',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          totalClinics: clinics.length,
          activeClinics: clinics.filter(c => c.isActive).length
        }
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Clinic operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  // Storage and caching check
  async checkStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Test localStorage availability
      const testKey = 'mocards_health_check_test';
      const testValue = Date.now().toString();

      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      const responseTime = Date.now() - startTime;

      if (retrieved === testValue) {
        return {
          status: 'healthy',
          message: 'Storage systems operational',
          timestamp: new Date().toISOString(),
          responseTime,
          details: {
            localStorageItems: localStorage.length,
            storageAvailable: true
          }
        };
      } else {
        return {
          status: 'warning',
          message: 'Storage system inconsistency detected',
          timestamp: new Date().toISOString(),
          responseTime
        };
      }
    } catch (error) {
      return {
        status: 'warning',
        message: `Storage check completed with issues: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  // Performance metrics check
  async checkPerformance(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Memory usage check (if available)
      const memory = (performance as any).memory;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      const responseTime = Date.now() - startTime;

      const performanceData = {
        memoryUsage: memory ? {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        } : null,
        pageLoad: navigation ? {
          domLoad: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
          fullLoad: Math.round(navigation.loadEventEnd - navigation.fetchStart)
        } : null,
        connectionType: (navigator as any).connection?.effectiveType || 'unknown'
      };

      const memoryUsage = memory ? memory.usedJSHeapSize / memory.jsHeapSizeLimit : 0;
      const status = memoryUsage > 0.8 ? 'warning' : 'healthy';

      return {
        status,
        message: status === 'healthy'
          ? 'Performance metrics within normal ranges'
          : 'Performance metrics show potential issues',
        timestamp: new Date().toISOString(),
        responseTime,
        details: performanceData
      };
    } catch (error) {
      return {
        status: 'warning',
        message: `Performance check completed: ${error instanceof Error ? error.message : 'Limited metrics available'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  // Comprehensive health check
  async performHealthCheck(): Promise<SystemHealth> {
    console.log('🏥 Running comprehensive health check...');

    const [
      database,
      authentication,
      cardOperations,
      clinicOperations,
      storage,
      performance
    ] = await Promise.all([
      this.checkDatabase(),
      this.checkAuthentication(),
      this.checkCardOperations(),
      this.checkClinicOperations(),
      this.checkStorage(),
      this.checkPerformance()
    ]);

    const checks = {
      database,
      authentication,
      cardOperations,
      clinicOperations,
      storage,
      performance
    };

    // Calculate summary
    const allChecks = Object.values(checks);
    const healthyChecks = allChecks.filter(c => c.status === 'healthy').length;
    const warningChecks = allChecks.filter(c => c.status === 'warning').length;
    const criticalChecks = allChecks.filter(c => c.status === 'critical').length;

    // Determine overall status
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalChecks > 0) {
      overall = 'critical';
    } else if (warningChecks > 2) {
      overall = 'critical';
    } else if (warningChecks > 0) {
      overall = 'warning';
    }

    const systemHealth: SystemHealth = {
      overall,
      checks,
      summary: {
        totalChecks: allChecks.length,
        healthyChecks,
        warningChecks,
        criticalChecks
      }
    };

    this.lastHealthCheck = systemHealth;

    console.log(`🏥 Health check completed: ${overall.toUpperCase()}`, {
      healthy: healthyChecks,
      warnings: warningChecks,
      critical: criticalChecks
    });

    return systemHealth;
  }

  // Start continuous monitoring
  startMonitoring(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      const health = await this.performHealthCheck();

      // Log critical issues
      if (health.overall === 'critical') {
        console.error('🚨 CRITICAL SYSTEM ISSUES DETECTED:', health);
      } else if (health.overall === 'warning') {
        console.warn('⚠️ System warnings detected:', health);
      }

      // Store health data for monitoring
      localStorage.setItem('mocards_last_health_check', JSON.stringify(health));
    }, intervalMs);

    console.log('🔄 Health monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('⏹️ Health monitoring stopped');
    }
  }

  // Get last health check results
  getLastHealthCheck(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  // Get health status for API endpoint
  getHealthStatus(): { status: string; timestamp: string } {
    const health = this.getLastHealthCheck();
    return {
      status: health?.overall || 'unknown',
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const healthChecker = HealthChecker.getInstance();
export default healthChecker;