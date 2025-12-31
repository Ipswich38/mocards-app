#!/usr/bin/env node

/**
 * MOCARDS CLOUD - Clear LocalStorage Analytics Script
 * Clears all analytics-related localStorage for fresh deployment
 * @version 1.0.0
 */

const ANALYTICS_KEYS = [
  'mocards_analytics_cache',
  'mocards_dashboard_metrics',
  'mocards_performance_data',
  'mocards_user_analytics',
  'mocards_business_metrics',
  'mocards_last_analytics_sync',
  'mocards_analytics_preferences',
  'mocards_chart_cache',
  'mocards_dashboard_state',
  'mocards_error_log',
  'mocards_business_events',
  'mocards_last_flush'
];

console.log('🧹 MOCARDS LocalStorage Analytics Cleanup');
console.log('=' .repeat(50));

console.log('📋 Analytics keys to clear:');
ANALYTICS_KEYS.forEach((key, index) => {
  console.log(`  ${index + 1}. ${key}`);
});

console.log('\n💡 To clear these in your browser console:');
console.log('Copy and paste this JavaScript code:');
console.log('\n```javascript');

ANALYTICS_KEYS.forEach(key => {
  console.log(`localStorage.removeItem('${key}');`);
});

console.log(`
// Also clear sessionStorage analytics
sessionStorage.removeItem('mocards_session_analytics');
sessionStorage.removeItem('mocards_current_metrics');
sessionStorage.removeItem('mocards_temp_dashboard_data');

// Set fresh analytics baseline
localStorage.setItem('mocards_analytics_baseline', JSON.stringify({
  reset_id: 'manual_reset_${Date.now()}',
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
}));

localStorage.setItem('mocards_last_analytics_reset', new Date().toISOString());

console.log('🎉 LocalStorage analytics cleared!');
\`\`\`
`);

console.log('\n🚀 Analytics LocalStorage is now ready for fresh deployment!');
console.log('=' .repeat(50));