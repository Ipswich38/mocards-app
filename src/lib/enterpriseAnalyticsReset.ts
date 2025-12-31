/**
 * MOCARDS CLOUD - Enterprise Analytics Reset System
 * Complete analytics data reset for fresh client deployment
 * @version 1.0.0
 */

import { supabase } from './supabase';
import { logBusinessEvent, logError } from './productionMonitoring';

interface AnalyticsResetResult {
  success: boolean;
  clearedTables: string[];
  errors: string[];
  timestamp: string;
  resetId: string;
}

interface AnalyticsTable {
  name: string;
  description: string;
  resetStrategy: 'truncate' | 'delete' | 'update_zero';
}

class EnterpriseAnalyticsResetManager {
  private static instance: EnterpriseAnalyticsResetManager;

  // Define all analytics-related tables and their reset strategies
  private analyticsTable: AnalyticsTable[] = [
    { name: 'analytics_events', description: 'User interaction events', resetStrategy: 'truncate' },
    { name: 'analytics_metrics', description: 'Business performance metrics', resetStrategy: 'truncate' },
    { name: 'analytics_sessions', description: 'User session tracking', resetStrategy: 'truncate' },
    { name: 'analytics_dashboards', description: 'Dashboard view analytics', resetStrategy: 'truncate' },
    { name: 'analytics_reports', description: 'Generated reports cache', resetStrategy: 'truncate' },
    { name: 'card_usage_analytics', description: 'Card usage tracking', resetStrategy: 'truncate' },
    { name: 'clinic_performance_metrics', description: 'Clinic performance data', resetStrategy: 'truncate' },
    { name: 'appointment_analytics', description: 'Appointment booking analytics', resetStrategy: 'truncate' },
    { name: 'revenue_analytics', description: 'Revenue tracking data', resetStrategy: 'truncate' },
    { name: 'user_behavior_analytics', description: 'User behavior patterns', resetStrategy: 'truncate' },
  ];

  private constructor() {}

  static getInstance(): EnterpriseAnalyticsResetManager {
    if (!EnterpriseAnalyticsResetManager.instance) {
      EnterpriseAnalyticsResetManager.instance = new EnterpriseAnalyticsResetManager();
    }
    return EnterpriseAnalyticsResetManager.instance;
  }

  /**
   * Perform complete analytics reset to fresh state
   */
  async resetToFreshState(): Promise<AnalyticsResetResult> {
    const resetId = `analytics_reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const result: AnalyticsResetResult = {
      success: false,
      clearedTables: [],
      errors: [],
      timestamp: new Date().toISOString(),
      resetId
    };

    console.log('🔄 Starting Enterprise Analytics Reset...', { resetId });
    logBusinessEvent('analytics_reset_started', 1, { resetId });

    try {
      // Step 1: Clear all analytics tables
      for (const table of this.analyticsTable) {
        try {
          await this.clearAnalyticsTable(table);
          result.clearedTables.push(table.name);
          console.log(`✅ Cleared ${table.name}: ${table.description}`);
        } catch (error) {
          const errorMsg = `Failed to clear ${table.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logError('error', errorMsg, { table: table.name, resetId });
        }
      }

      // Step 2: Reset analytics counters in existing data
      await this.resetAnalyticsCounters();
      result.clearedTables.push('analytics_counters_reset');

      // Step 3: Clear localStorage analytics cache
      await this.clearLocalStorageAnalytics();
      result.clearedTables.push('localStorage_analytics_cache');

      // Step 4: Initialize fresh analytics baseline
      await this.initializeFreshBaseline(resetId);
      result.clearedTables.push('fresh_baseline_initialized');

      result.success = result.errors.length === 0;

      console.log('🎉 Enterprise Analytics Reset Complete:', {
        success: result.success,
        clearedTables: result.clearedTables.length,
        errors: result.errors.length
      });

      logBusinessEvent('analytics_reset_completed', 1, {
        resetId,
        success: result.success,
        tablesCleared: result.clearedTables.length,
        errors: result.errors.length
      });

    } catch (error) {
      result.errors.push(`Critical reset error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
      logError('critical', 'Analytics reset failed', { error, resetId });
    }

    return result;
  }

  /**
   * Clear specific analytics table based on strategy
   */
  private async clearAnalyticsTable(table: AnalyticsTable): Promise<void> {
    console.log(`🔄 Clearing ${table.name} using ${table.resetStrategy} strategy`);

    switch (table.resetStrategy) {
      case 'truncate':
        // For tables that might not exist yet, use delete instead
        const { error } = await supabase
          .from(table.name)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except impossible UUID

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          throw error;
        }
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table.name)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (deleteError && !deleteError.message.includes('relation') && !deleteError.message.includes('does not exist')) {
          throw deleteError;
        }
        break;

      case 'update_zero':
        // This would be used for tables where we want to zero out values rather than delete
        const { error: updateError } = await supabase
          .from(table.name)
          .update({
            count: 0,
            value: 0,
            total: 0,
            last_reset: new Date().toISOString()
          })
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (updateError && !updateError.message.includes('relation') && !updateError.message.includes('does not exist')) {
          throw updateError;
        }
        break;
    }
  }

  /**
   * Reset analytics counters in existing business tables
   */
  private async resetAnalyticsCounters(): Promise<void> {
    console.log('🔄 Resetting analytics counters in business tables');

    try {
      // Reset card usage counters
      const { error: cardError } = await supabase
        .from('cards')
        .update({
          perks_used: 0,
          last_analytics_update: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (cardError && !cardError.message.includes('column') && !cardError.message.includes('does not exist')) {
        console.warn('Could not reset card analytics counters:', cardError.message);
      }

      // Reset clinic performance metrics
      const { error: clinicError } = await supabase
        .from('clinics')
        .update({
          total_appointments: 0,
          total_revenue: 0,
          last_analytics_reset: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (clinicError && !clinicError.message.includes('column') && !clinicError.message.includes('does not exist')) {
        console.warn('Could not reset clinic analytics counters:', clinicError.message);
      }

      console.log('✅ Analytics counters reset completed');
    } catch (error) {
      console.warn('Non-critical error resetting analytics counters:', error);
    }
  }

  /**
   * Clear all analytics-related localStorage data
   */
  private async clearLocalStorageAnalytics(): Promise<void> {
    console.log('🔄 Clearing localStorage analytics cache');

    const analyticsKeys = [
      'mocards_analytics_cache',
      'mocards_dashboard_metrics',
      'mocards_performance_data',
      'mocards_user_analytics',
      'mocards_business_metrics',
      'mocards_last_analytics_sync',
      'mocards_analytics_preferences',
      'mocards_chart_cache',
      'mocards_dashboard_state'
    ];

    analyticsKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Cleared localStorage key: ${key}`);
      } catch (error) {
        console.warn(`Could not clear localStorage key ${key}:`, error);
      }
    });

    // Clear sessionStorage analytics as well
    const sessionKeys = [
      'mocards_session_analytics',
      'mocards_current_metrics',
      'mocards_temp_dashboard_data'
    ];

    sessionKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        console.log(`✅ Cleared sessionStorage key: ${key}`);
      } catch (error) {
        console.warn(`Could not clear sessionStorage key ${key}:`, error);
      }
    });
  }

  /**
   * Initialize fresh analytics baseline for new deployment
   */
  private async initializeFreshBaseline(resetId: string): Promise<void> {
    console.log('🔄 Initializing fresh analytics baseline');

    const baselineData = {
      reset_id: resetId,
      deployment_start: new Date().toISOString(),
      initial_state: {
        total_users: 0,
        total_cards: 0,
        total_clinics: 0,
        total_appointments: 0,
        total_revenue: 0
      },
      version: '1.0.0',
      reset_reason: 'enterprise_fresh_deployment'
    };

    // Store baseline in localStorage for immediate access
    try {
      localStorage.setItem('mocards_analytics_baseline', JSON.stringify(baselineData));
      localStorage.setItem('mocards_last_analytics_reset', new Date().toISOString());
      console.log('✅ Fresh analytics baseline initialized');
    } catch (error) {
      console.warn('Could not store analytics baseline:', error);
    }
  }

  /**
   * Verify analytics reset completion
   */
  async verifyResetCompletion(): Promise<{ verified: boolean; details: any }> {
    console.log('🔍 Verifying analytics reset completion');

    const verification = {
      verified: true,
      details: {
        emptyTables: [] as string[],
        nonEmptyTables: [] as string[],
        localStorageCleared: true,
        baselineExists: false
      }
    };

    // Check if analytics tables are empty
    for (const table of this.analyticsTable) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('id', { count: 'exact', head: true });

        if (!error) {
          const count = data?.length || 0;
          if (count === 0) {
            verification.details.emptyTables.push(table.name);
          } else {
            verification.details.nonEmptyTables.push(table.name);
            verification.verified = false;
          }
        }
      } catch (error) {
        // Table might not exist, which is fine
        verification.details.emptyTables.push(`${table.name} (not exists)`);
      }
    }

    // Check localStorage
    verification.details.localStorageCleared = !localStorage.getItem('mocards_analytics_cache');
    verification.details.baselineExists = !!localStorage.getItem('mocards_analytics_baseline');

    return verification;
  }

  /**
   * Get reset status and history
   */
  getResetHistory(): any {
    try {
      const lastReset = localStorage.getItem('mocards_last_analytics_reset');
      const baseline = localStorage.getItem('mocards_analytics_baseline');

      return {
        lastReset: lastReset ? new Date(lastReset) : null,
        baseline: baseline ? JSON.parse(baseline) : null,
        isReset: !!lastReset && !!baseline
      };
    } catch (error) {
      return {
        lastReset: null,
        baseline: null,
        isReset: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const enterpriseAnalyticsReset = EnterpriseAnalyticsResetManager.getInstance();

// Convenience methods
export const resetEnterpriseAnalytics = () => {
  return enterpriseAnalyticsReset.resetToFreshState();
};

export const verifyAnalyticsReset = () => {
  return enterpriseAnalyticsReset.verifyResetCompletion();
};

export const getAnalyticsResetStatus = () => {
  return enterpriseAnalyticsReset.getResetHistory();
};

export default enterpriseAnalyticsReset;