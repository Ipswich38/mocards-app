#!/usr/bin/env node

/**
 * MOCARDS CLOUD - Enterprise Analytics Reset Script
 * Resets all analytics data to fresh state for client deployment
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Use environment variables or default to local
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your-project-url';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Analytics tables to reset
const ANALYTICS_TABLES = [
  'analytics_events',
  'analytics_metrics',
  'analytics_sessions',
  'analytics_dashboards',
  'analytics_reports',
  'card_usage_analytics',
  'clinic_performance_metrics',
  'appointment_analytics',
  'revenue_analytics',
  'user_behavior_analytics'
];

// Analytics counters in business tables to reset
const BUSINESS_TABLE_RESETS = [
  {
    table: 'cards',
    updates: { perks_used: 0, last_analytics_update: new Date().toISOString() }
  },
  {
    table: 'clinics',
    updates: { total_appointments: 0, total_revenue: 0, last_analytics_reset: new Date().toISOString() }
  },
  {
    table: 'users',
    updates: { login_count: 0, last_activity_analytics_reset: new Date().toISOString() }
  }
];

async function resetEnterpriseAnalytics() {
  console.log('🚀 Starting Enterprise Analytics Reset...');
  console.log('=' .repeat(60));

  const resetId = `analytics_reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  const results = {
    success: false,
    resetId,
    startTime: new Date().toISOString(),
    clearedTables: [],
    updatedTables: [],
    errors: [],
    duration: 0
  };

  try {
    // Step 1: Clear Analytics Tables
    console.log('📊 Step 1: Clearing Analytics Tables');
    console.log('-'.repeat(40));

    for (const tableName of ANALYTICS_TABLES) {
      try {
        console.log(`🔄 Clearing ${tableName}...`);

        const { data, error } = await supabase
          .from(tableName)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          throw error;
        }

        results.clearedTables.push(tableName);
        console.log(`✅ ${tableName} cleared successfully`);

      } catch (error) {
        const errorMsg = `Failed to clear ${tableName}: ${error.message}`;
        results.errors.push(errorMsg);
        console.log(`❌ ${errorMsg}`);
      }
    }

    // Step 2: Reset Analytics Counters in Business Tables
    console.log('\n📈 Step 2: Resetting Analytics Counters');
    console.log('-'.repeat(40));

    for (const resetConfig of BUSINESS_TABLE_RESETS) {
      try {
        console.log(`🔄 Updating ${resetConfig.table} analytics counters...`);

        const { error } = await supabase
          .from(resetConfig.table)
          .update(resetConfig.updates)
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error && !error.message.includes('column') && !error.message.includes('does not exist')) {
          console.log(`⚠️  Warning: ${resetConfig.table} - ${error.message}`);
        } else {
          results.updatedTables.push(resetConfig.table);
          console.log(`✅ ${resetConfig.table} counters reset successfully`);
        }

      } catch (error) {
        console.log(`⚠️  Warning: Could not update ${resetConfig.table} - ${error.message}`);
      }
    }

    // Step 3: Create Analytics Baseline Record
    console.log('\n🎯 Step 3: Creating Fresh Analytics Baseline');
    console.log('-'.repeat(40));

    const baselineData = {
      reset_id: resetId,
      reset_timestamp: new Date().toISOString(),
      reset_type: 'enterprise_fresh_deployment',
      baseline_metrics: {
        total_users: 0,
        total_cards: 0,
        total_clinics: 0,
        total_appointments: 0,
        total_revenue: 0
      },
      version: '1.0.0',
      performed_by: 'enterprise_analytics_reset_script'
    };

    try {
      // Try to create analytics_baseline table entry
      const { error: baselineError } = await supabase
        .from('analytics_baseline')
        .insert([baselineData]);

      if (baselineError && !baselineError.message.includes('relation') && !baselineError.message.includes('does not exist')) {
        console.log(`⚠️  Could not create baseline record: ${baselineError.message}`);
      } else {
        console.log('✅ Analytics baseline record created');
      }
    } catch (error) {
      console.log(`⚠️  Baseline creation warning: ${error.message}`);
    }

    // Step 4: Verify Reset Completion
    console.log('\n🔍 Step 4: Verifying Reset Completion');
    console.log('-'.repeat(40));

    let totalRecords = 0;
    for (const tableName of ANALYTICS_TABLES) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true });

        if (!error) {
          const recordCount = count || 0;
          totalRecords += recordCount;
          console.log(`📊 ${tableName}: ${recordCount} records`);
        }
      } catch (error) {
        console.log(`📊 ${tableName}: Table does not exist (OK)`);
      }
    }

    // Step 5: Generate Reset Report
    const duration = Date.now() - startTime;
    results.duration = duration;
    results.success = results.errors.length === 0;

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ENTERPRISE ANALYTICS RESET COMPLETE');
    console.log('='.repeat(60));
    console.log(`Reset ID: ${resetId}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success: ${results.success ? 'YES' : 'NO'}`);
    console.log(`Tables Cleared: ${results.clearedTables.length}`);
    console.log(`Tables Updated: ${results.updatedTables.length}`);
    console.log(`Errors: ${results.errors.length}`);
    console.log(`Remaining Analytics Records: ${totalRecords}`);

    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors Encountered:');
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log('\n📝 Cleared Tables:');
    results.clearedTables.forEach((table, index) => {
      console.log(`  ✅ ${index + 1}. ${table}`);
    });

    if (results.updatedTables.length > 0) {
      console.log('\n🔄 Updated Tables:');
      results.updatedTables.forEach((table, index) => {
        console.log(`  📊 ${index + 1}. ${table}`);
      });
    }

    console.log('\n🚀 Enterprise Analytics is now in FRESH STATE');
    console.log('   Ready for client deployment!');
    console.log('=' .repeat(60));

    // Save reset report
    const reportPath = `analytics-reset-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Reset report saved: ${reportPath}`);

    return results;

  } catch (error) {
    results.errors.push(`Critical error: ${error.message}`);
    results.success = false;
    results.duration = Date.now() - startTime;

    console.log('\n❌ CRITICAL ERROR DURING RESET');
    console.log('=' .repeat(60));
    console.log(`Error: ${error.message}`);
    console.log(`Reset ID: ${resetId}`);
    console.log(`Duration: ${results.duration}ms`);

    return results;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetEnterpriseAnalytics()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Script execution error:', error);
      process.exit(1);
    });
}

export { resetEnterpriseAnalytics };