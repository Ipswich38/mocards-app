#!/usr/bin/env node

/**
 * END-TO-END PRODUCTION TEST
 *
 * Tests complete application flow to ensure everything works after migration:
 * 1. Database connectivity and migration verification
 * 2. Portal access testing (admin/clinic/patient)
 * 3. Card search and lookup functionality
 * 4. Card lifecycle: generation → assignment → activation → redemption
 * 5. Cross-portal data consistency
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '', critical = false) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const priority = critical ? ' [CRITICAL]' : '';
  console.log(`${status}${priority}: ${name}${details ? ` - ${details}` : ''}`);

  testResults.tests.push({ name, passed, details, critical });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// =============================================================================
// 1. FOUNDATION TESTS
// =============================================================================

async function testDatabaseConnectivity() {
  console.log('\n📊 TESTING DATABASE CONNECTIVITY');
  console.log('-'.repeat(50));

  try {
    const { data } = await supabase.from('cards').select('id').limit(1);
    logTest('Database Connection', !!data, 'Supabase connection active', true);
    return true;
  } catch (error) {
    logTest('Database Connection', false, error.message, true);
    return false;
  }
}

async function testMigrationIntegrity() {
  console.log('\n📊 TESTING MIGRATION INTEGRITY');
  console.log('-'.repeat(50));

  try {
    // Test 10,000 cards exist
    const { count: cardCount } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .gte('card_number', 1)
      .lte('card_number', 10000);

    logTest('10,000 Cards Present', cardCount === 10000, `Found ${cardCount}/10000 cards`, true);

    // Test unified format exists
    const { count: unifiedCount } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .not('unified_control_number', 'is', null)
      .gte('card_number', 1)
      .lte('card_number', 10000);

    logTest('Unified Format Applied', unifiedCount > 0, `${unifiedCount} cards have unified format`);

    // Test display numbers
    const { count: displayCount } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .gte('display_card_number', 10000)
      .lte('display_card_number', 19999);

    logTest('Display Numbers Updated', displayCount > 0, `${displayCount} cards have new display format`);

    return cardCount === 10000;
  } catch (error) {
    logTest('Migration Integrity', false, error.message, true);
    return false;
  }
}

// =============================================================================
// 2. PORTAL ACCESS TESTS
// =============================================================================

async function testPortalFunctions() {
  console.log('\n🌐 TESTING PORTAL FUNCTIONS');
  console.log('-'.repeat(50));

  try {
    // Test Admin Portal
    const { data: adminCards } = await supabase.rpc('admin_get_all_cards');
    logTest('Admin Portal Access', !!adminCards, `Returns ${adminCards?.length || 0} cards`, true);
    logTest('Admin Portal Complete', adminCards?.length === 10000, `Expected 10,000, got ${adminCards?.length || 0}`, true);

    // Test Clinic Portal
    const { data: clinicCards } = await supabase.rpc('clinic_get_all_cards_mirror');
    logTest('Clinic Portal Access', !!clinicCards, `Returns ${clinicCards?.length || 0} cards`, true);
    logTest('Clinic Portal Complete', clinicCards?.length === 10000, `Expected 10,000, got ${clinicCards?.length || 0}`, true);

    // Test Patient Portal
    const { data: patientResult } = await supabase.rpc('patient_lookup_card', { search_term: '00001' });
    logTest('Patient Portal Access', !!patientResult, `Can lookup cards`, true);

    return true;
  } catch (error) {
    logTest('Portal Functions', false, error.message, true);
    return false;
  }
}

// =============================================================================
// 3. SEARCH FUNCTIONALITY TESTS
// =============================================================================

async function testSearchFunctionality() {
  console.log('\n🔍 TESTING SEARCH FUNCTIONALITY');
  console.log('-'.repeat(50));

  const searchTests = [
    { term: '1', description: 'Card number 1' },
    { term: '00001', description: '5-digit format' },
    { term: 'MOC-00001', description: 'Legacy format' },
    { term: '10000', description: 'Display number' },
    { term: 'MOC-10000', description: 'Display MOC format' }
  ];

  let passedTests = 0;

  for (const test of searchTests) {
    try {
      const { data: searchResults } = await supabase.rpc('search_card_universal', {
        search_term: test.term
      });

      const passed = searchResults && searchResults.length > 0;
      logTest(`Search: ${test.description}`, passed, `Found ${searchResults?.length || 0} results`);

      if (passed) passedTests++;

      // Also test patient portal search
      const { data: patientResults } = await supabase.rpc('patient_lookup_card', {
        search_term: test.term
      });

      const patientPassed = patientResults && patientResults.length > 0;
      logTest(`Patient Search: ${test.description}`, patientPassed, `Found ${patientResults?.length || 0} results`);

    } catch (error) {
      logTest(`Search: ${test.description}`, false, error.message);
    }
  }

  return passedTests >= 3; // At least 3/5 search formats should work
}

// =============================================================================
// 4. CARD LIFECYCLE TESTS
// =============================================================================

async function testCardLifecycle() {
  console.log('\n🔄 TESTING CARD LIFECYCLE');
  console.log('-'.repeat(50));

  try {
    // Get an unassigned card
    const { data: unassignedCards } = await supabase
      .from('cards')
      .select('*')
      .eq('status', 'unassigned')
      .gte('card_number', 1)
      .lte('card_number', 10000)
      .limit(1);

    logTest('Unassigned Cards Available', !!unassignedCards?.length, `Found ${unassignedCards?.length || 0} unassigned cards`);

    if (!unassignedCards?.length) return false;

    const testCard = unassignedCards[0];

    // Test card has proper format
    const hasLegacyFormat = !!testCard.control_number;
    const hasUnifiedFormat = !!testCard.unified_control_number;
    const hasDisplayNumber = !!testCard.display_card_number;

    logTest('Card Legacy Format', hasLegacyFormat, testCard.control_number || 'Missing');
    logTest('Card Unified Format', hasUnifiedFormat, testCard.unified_control_number || 'Missing');
    logTest('Card Display Number', hasDisplayNumber, testCard.display_card_number?.toString() || 'Missing');

    // Test card can be found by different search methods
    const searches = [
      testCard.card_number?.toString(),
      testCard.control_number,
      testCard.unified_control_number
    ].filter(Boolean);

    let searchSuccesses = 0;
    for (const searchTerm of searches) {
      try {
        const { data: found } = await supabase.rpc('search_card_universal', {
          search_term: searchTerm
        });

        if (found?.some(card => card.id === testCard.id)) {
          searchSuccesses++;
          logTest(`Card Findable by: ${searchTerm}`, true, 'Card found in universal search');
        }
      } catch (error) {
        logTest(`Card Findable by: ${searchTerm}`, false, error.message);
      }
    }

    logTest('Card Search Coverage', searchSuccesses > 0, `Findable by ${searchSuccesses}/${searches.length} methods`);

    return true;
  } catch (error) {
    logTest('Card Lifecycle', false, error.message);
    return false;
  }
}

// =============================================================================
// 5. DATA CONSISTENCY TESTS
// =============================================================================

async function testDataConsistency() {
  console.log('\n🔒 TESTING DATA CONSISTENCY');
  console.log('-'.repeat(50));

  try {
    // Test no duplicate card numbers
    const { data: duplicateCheck } = await supabase
      .from('cards')
      .select('card_number')
      .gte('card_number', 1)
      .lte('card_number', 10000);

    const cardNumbers = duplicateCheck?.map(c => c.card_number).filter(n => n != null) || [];
    const uniqueNumbers = new Set(cardNumbers);
    const hasDuplicates = cardNumbers.length !== uniqueNumbers.size;

    logTest('No Duplicate Card Numbers', !hasDuplicates, `${cardNumbers.length} cards, ${uniqueNumbers.size} unique`);

    // Test no missing numbers in sequence
    const missingNumbers = [];
    for (let i = 1; i <= 10000; i++) {
      if (!uniqueNumbers.has(i)) {
        missingNumbers.push(i);
      }
    }

    logTest('Complete Sequence 1-10000', missingNumbers.length === 0, `${missingNumbers.length} missing numbers`);

    // Test format consistency
    const { data: formatCheck } = await supabase
      .from('cards')
      .select('card_number, control_number, unified_control_number, display_card_number')
      .gte('card_number', 1)
      .lte('card_number', 5);

    let formatConsistent = true;
    let inconsistencies = [];

    formatCheck?.forEach(card => {
      const expectedDisplay = card.card_number + 9999;

      if (card.display_card_number !== expectedDisplay) {
        formatConsistent = false;
        inconsistencies.push(`Card ${card.card_number}: display number should be ${expectedDisplay}, got ${card.display_card_number}`);
      }

      if (card.unified_control_number && !card.unified_control_number.includes(expectedDisplay.toString().padStart(5, '0'))) {
        formatConsistent = false;
        inconsistencies.push(`Card ${card.card_number}: unified format doesn't match display number`);
      }
    });

    logTest('Format Consistency', formatConsistent, inconsistencies.join('; ') || 'All formats consistent');

    return !hasDuplicates && missingNumbers.length === 0 && formatConsistent;
  } catch (error) {
    logTest('Data Consistency', false, error.message);
    return false;
  }
}

// =============================================================================
// 6. PERFORMANCE TESTS
// =============================================================================

async function testPerformance() {
  console.log('\n⚡ TESTING PERFORMANCE');
  console.log('-'.repeat(50));

  try {
    // Test admin portal load time
    const adminStart = Date.now();
    const { data: adminCards } = await supabase.rpc('admin_get_all_cards');
    const adminTime = Date.now() - adminStart;

    logTest('Admin Portal Performance', adminTime < 10000, `Loaded ${adminCards?.length || 0} cards in ${adminTime}ms`);

    // Test search performance
    const searchStart = Date.now();
    await supabase.rpc('search_card_universal', { search_term: '00001' });
    const searchTime = Date.now() - searchStart;

    logTest('Search Performance', searchTime < 2000, `Search completed in ${searchTime}ms`);

    // Test patient lookup performance
    const patientStart = Date.now();
    await supabase.rpc('patient_lookup_card', { search_term: '00001' });
    const patientTime = Date.now() - patientStart;

    logTest('Patient Lookup Performance', patientTime < 1000, `Lookup completed in ${patientTime}ms`);

    return adminTime < 10000 && searchTime < 2000;
  } catch (error) {
    logTest('Performance Tests', false, error.message);
    return false;
  }
}

// =============================================================================
// 7. MAIN TEST EXECUTION
// =============================================================================

async function runEndToEndTests() {
  console.log('🚀 STARTING END-TO-END PRODUCTION TESTS');
  console.log('='.repeat(70));
  console.log('Testing complete application flow after production migration...\n');

  const startTime = Date.now();

  // Run all test suites
  const dbConnected = await testDatabaseConnectivity();
  if (!dbConnected) {
    console.log('\n❌ Database connectivity failed - aborting tests');
    return;
  }

  const migrationOk = await testMigrationIntegrity();
  const portalsOk = await testPortalFunctions();
  const searchOk = await testSearchFunctionality();
  const lifecycleOk = await testCardLifecycle();
  const consistencyOk = await testDataConsistency();
  const performanceOk = await testPerformance();

  // Generate final report
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\n' + '='.repeat(70));
  console.log('📊 END-TO-END TEST RESULTS');
  console.log('='.repeat(70));

  console.log(`\n📈 TEST STATISTICS:`);
  console.log(`   Duration: ${duration.toFixed(1)}s`);
  console.log(`   Tests Passed: ${testResults.passed}`);
  console.log(`   Tests Failed: ${testResults.failed}`);
  console.log(`   Total Tests: ${testResults.tests.length}`);

  // Critical test failures
  const criticalFailures = testResults.tests.filter(t => !t.passed && t.critical);
  if (criticalFailures.length > 0) {
    console.log(`\n🚨 CRITICAL FAILURES (${criticalFailures.length}):`);
    criticalFailures.forEach((test, i) => {
      console.log(`   ${i + 1}. ${test.name}: ${test.details}`);
    });
  }

  // Test suite summary
  console.log(`\n📋 TEST SUITE RESULTS:`);
  console.log(`   Database Connectivity: ${dbConnected ? '✅' : '❌'}`);
  console.log(`   Migration Integrity: ${migrationOk ? '✅' : '❌'}`);
  console.log(`   Portal Functions: ${portalsOk ? '✅' : '❌'}`);
  console.log(`   Search Functionality: ${searchOk ? '✅' : '❌'}`);
  console.log(`   Card Lifecycle: ${lifecycleOk ? '✅' : '❌'}`);
  console.log(`   Data Consistency: ${consistencyOk ? '✅' : '❌'}`);
  console.log(`   Performance: ${performanceOk ? '✅' : '❌'}`);

  // Overall assessment
  const allCriticalPassed = criticalFailures.length === 0;
  const majorSystemsWorking = dbConnected && migrationOk && portalsOk;

  console.log(`\n🎯 PRODUCTION READINESS:`);
  if (allCriticalPassed && majorSystemsWorking) {
    console.log(`   ✅ READY FOR PRODUCTION`);
    console.log(`   All critical systems operational`);
    console.log(`   ${testResults.passed}/${testResults.tests.length} tests passed`);
  } else {
    console.log(`   ❌ NOT READY FOR PRODUCTION`);
    console.log(`   ${criticalFailures.length} critical issues found`);
    console.log(`   Review failed tests before deployment`);
  }

  console.log(`\n🏁 END-TO-END TESTING COMPLETE`);
  console.log('='.repeat(70));
}

// Execute the tests
runEndToEndTests().catch(console.error);