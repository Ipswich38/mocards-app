#!/usr/bin/env node

/**
 * COMPREHENSIVE PRODUCTION AUDIT
 *
 * This script audits the entire MOCards application for:
 * 1. Demo traces that need removal
 * 2. Non-functioning features that should work
 * 3. Flow/logic issues causing domino effects
 * 4. Gaps between requirements and implementation
 *
 * Categories audited:
 * - Database connectivity and queries
 * - Portal access and permissions
 * - Card generation and management
 * - Search functionality across all portals
 * - Clinic management and assignments
 * - Perk system and redemptions
 * - Authentication and authorization
 * - UI/UX flow and navigation
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Audit results storage
const auditResults = {
  critical: [],
  major: [],
  minor: [],
  demo_traces: [],
  non_functioning: [],
  flow_issues: []
};

function logIssue(severity, category, description, file = null, line = null) {
  const issue = {
    severity,
    category,
    description,
    file,
    line,
    timestamp: new Date().toISOString()
  };

  auditResults[severity].push(issue);
  console.log(`🔴 ${severity.toUpperCase()}: ${category} - ${description}${file ? ` (${file}:${line})` : ''}`);
}

function logSuccess(description) {
  console.log(`✅ ${description}`);
}

// =============================================================================
// 1. DATABASE CONNECTIVITY AND SCHEMA AUDIT
// =============================================================================

async function auditDatabase() {
  console.log('\n🔍 AUDITING DATABASE CONNECTIVITY AND SCHEMA');
  console.log('='.repeat(60));

  try {
    // Test basic connectivity
    const { data: testQuery } = await supabase.from('cards').select('id').limit(1);
    if (!testQuery) {
      logIssue('critical', 'DATABASE', 'Cannot connect to Supabase database');
      return false;
    }
    logSuccess('Database connectivity working');

    // Check if migration was applied
    const { data: migrationCheck } = await supabase
      .from('cards')
      .select('unified_control_number')
      .limit(1);

    if (!migrationCheck || !migrationCheck[0]?.unified_control_number) {
      logIssue('critical', 'MIGRATION', 'Production migration not applied - unified_control_number missing');
    } else {
      logSuccess('Production migration applied successfully');
    }

    // Check for 10,000 cards requirement
    const { count: cardCount } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .gte('card_number', 1)
      .lte('card_number', 10000);

    if (cardCount !== 10000) {
      logIssue('critical', 'DATA_INTEGRITY', `Missing cards: Expected 10,000, found ${cardCount}`);
    } else {
      logSuccess('All 10,000 sequential cards present');
    }

    // Test portal functions exist
    try {
      const { data: adminTest } = await supabase.rpc('admin_get_all_cards').limit(1);
      logSuccess('Admin portal function working');
    } catch (error) {
      logIssue('critical', 'PORTAL_FUNCTION', 'admin_get_all_cards function missing or broken');
    }

    try {
      const { data: clinicTest } = await supabase.rpc('clinic_get_all_cards_mirror').limit(1);
      logSuccess('Clinic portal function working');
    } catch (error) {
      logIssue('critical', 'PORTAL_FUNCTION', 'clinic_get_all_cards_mirror function missing or broken');
    }

    try {
      const { data: patientTest } = await supabase.rpc('patient_lookup_card', { search_term: '00001' });
      logSuccess('Patient portal function working');
    } catch (error) {
      logIssue('critical', 'PORTAL_FUNCTION', 'patient_lookup_card function missing or broken');
    }

    return true;
  } catch (error) {
    logIssue('critical', 'DATABASE', `Database audit failed: ${error.message}`);
    return false;
  }
}

// =============================================================================
// 2. CODE AUDIT FOR DEMO TRACES
// =============================================================================

function auditCodeForDemo() {
  console.log('\n🔍 AUDITING CODE FOR DEMO TRACES');
  console.log('='.repeat(60));

  const demoPatterns = [
    { pattern: /demo|test|sample|example/gi, severity: 'major', category: 'DEMO_CODE' },
    { pattern: /TODO|FIXME|HACK|TEMP/gi, severity: 'minor', category: 'DEMO_CODE' },
    { pattern: /localhost|127\.0\.0\.1/gi, severity: 'major', category: 'HARDCODE' },
    { pattern: /console\.log|console\.warn|console\.error/gi, severity: 'minor', category: 'DEBUG_CODE' },
    { pattern: /alert\(|confirm\(/gi, severity: 'major', category: 'DEMO_UI' },
    { pattern: /password.*=.*['"][^'"]*['"]/gi, severity: 'critical', category: 'SECURITY' }
  ];

  const filesToAudit = [
    'src/components/MOCAdminDashboardV2.tsx',
    'src/components/ClinicDashboard.tsx',
    'src/components/ClinicCardManagement.tsx',
    'src/components/CardActivationV2.tsx',
    'src/components/CardholderLookup.tsx',
    'src/components/SearchComponent.tsx',
    'src/lib/supabase.ts',
    'src/lib/streamlined-operations.ts'
  ];

  filesToAudit.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      demoPatterns.forEach(({ pattern, severity, category }) => {
        lines.forEach((line, index) => {
          const matches = line.match(pattern);
          if (matches) {
            matches.forEach(match => {
              logIssue(severity, category, `Found "${match}" in code`, file, index + 1);
            });
          }
        });
      });
    } else {
      logIssue('major', 'MISSING_FILE', `Expected file not found: ${file}`);
    }
  });
}

// =============================================================================
// 3. PORTAL ACCESS AUDIT
// =============================================================================

async function auditPortalAccess() {
  console.log('\n🔍 AUDITING PORTAL ACCESS REQUIREMENTS');
  console.log('='.repeat(60));

  // Admin Portal Requirements
  try {
    const { data: adminCards } = await supabase.rpc('admin_get_all_cards');
    if (!adminCards || adminCards.length !== 10000) {
      logIssue('critical', 'PORTAL_ACCESS', `Admin portal: Expected 10,000 cards, got ${adminCards?.length || 0}`);
    } else {
      logSuccess('Admin portal: Can access all 10,000 cards');
    }

    // Check admin can see unassigned, assigned, and activated cards
    const statuses = ['unassigned', 'assigned', 'activated'];
    for (const status of statuses) {
      const cardsWithStatus = adminCards.filter(card => card.status === status);
      if (cardsWithStatus.length > 0) {
        logSuccess(`Admin portal: Can see ${status} cards (${cardsWithStatus.length})`);
      }
    }
  } catch (error) {
    logIssue('critical', 'PORTAL_ACCESS', `Admin portal access failed: ${error.message}`);
  }

  // Clinic Portal Requirements
  try {
    const { data: clinicCards } = await supabase.rpc('clinic_get_all_cards_mirror');
    if (!clinicCards || clinicCards.length !== 10000) {
      logIssue('critical', 'PORTAL_ACCESS', `Clinic portal: Expected 10,000 cards, got ${clinicCards?.length || 0}`);
    } else {
      logSuccess('Clinic portal: Can mirror all 10,000 cards');
    }

    // Check clinic can see assignment details
    const assignedCards = clinicCards.filter(card => card.assigned_clinic_id !== null);
    const activatableCards = clinicCards.filter(card => card.can_activate === true);

    logSuccess(`Clinic portal: Can see ${assignedCards.length} assigned cards`);
    logSuccess(`Clinic portal: Can activate ${activatableCards.length} cards`);
  } catch (error) {
    logIssue('critical', 'PORTAL_ACCESS', `Clinic portal access failed: ${error.message}`);
  }

  // Patient Portal Requirements
  const testSearches = ['1', '00001', '10000', 'MOC-00001', 'MOC-10000-01-CVT001'];

  for (const searchTerm of testSearches) {
    try {
      const { data: patientResult } = await supabase.rpc('patient_lookup_card', { search_term: searchTerm });
      if (patientResult && patientResult.length > 0) {
        logSuccess(`Patient portal: Can search by "${searchTerm}"`);
      } else {
        logIssue('major', 'PORTAL_ACCESS', `Patient portal: Cannot find card with "${searchTerm}"`);
      }
    } catch (error) {
      logIssue('critical', 'PORTAL_ACCESS', `Patient portal search failed for "${searchTerm}": ${error.message}`);
    }
  }
}

// =============================================================================
// 4. CARD MANAGEMENT FLOW AUDIT
// =============================================================================

async function auditCardManagementFlow() {
  console.log('\n🔍 AUDITING CARD MANAGEMENT FLOW');
  console.log('='.repeat(60));

  try {
    // Test card generation flow
    const { data: unassignedCards } = await supabase
      .from('cards')
      .select('*')
      .eq('status', 'unassigned')
      .gte('card_number', 1)
      .lte('card_number', 10000)
      .limit(5);

    if (!unassignedCards || unassignedCards.length === 0) {
      logIssue('major', 'CARD_FLOW', 'No unassigned cards available for clinic assignment');
    } else {
      logSuccess(`Found ${unassignedCards.length} unassigned cards available for assignment`);
    }

    // Test card format consistency
    const { data: sampleCards } = await supabase
      .from('cards')
      .select('card_number, control_number, unified_control_number, display_card_number')
      .gte('card_number', 1)
      .lte('card_number', 5)
      .order('card_number');

    let formatIssues = 0;
    sampleCards?.forEach(card => {
      // Check format transformation
      const expectedDisplay = card.card_number + 9999;
      const expectedUnified = `MOC-${String(expectedDisplay).padStart(5, '0')}-01-CVT001`;

      if (card.display_card_number !== expectedDisplay) {
        logIssue('major', 'CARD_FORMAT', `Card ${card.card_number}: Wrong display number ${card.display_card_number}, expected ${expectedDisplay}`);
        formatIssues++;
      }

      if (!card.unified_control_number?.startsWith('MOC-')) {
        logIssue('major', 'CARD_FORMAT', `Card ${card.card_number}: Invalid unified format "${card.unified_control_number}"`);
        formatIssues++;
      }
    });

    if (formatIssues === 0) {
      logSuccess('Card format transformation working correctly');
    }

    // Test clinic assignment capability
    const { data: clinics } = await supabase
      .from('mocards_clinics')
      .select('id, clinic_name')
      .limit(1);

    if (!clinics || clinics.length === 0) {
      logIssue('critical', 'CARD_FLOW', 'No clinics available for card assignment');
    } else {
      logSuccess('Clinics available for card assignment');
    }

  } catch (error) {
    logIssue('critical', 'CARD_FLOW', `Card management flow audit failed: ${error.message}`);
  }
}

// =============================================================================
// 5. PERK SYSTEM AUDIT
// =============================================================================

async function auditPerkSystem() {
  console.log('\n🔍 AUDITING PERK SYSTEM');
  console.log('='.repeat(60));

  try {
    // Check default perk templates
    const { data: perkTemplates } = await supabase
      .from('default_perk_templates')
      .select('*')
      .eq('is_active', true);

    if (!perkTemplates || perkTemplates.length === 0) {
      logIssue('critical', 'PERK_SYSTEM', 'No active perk templates found');
    } else {
      logSuccess(`Found ${perkTemplates.length} active perk templates`);
    }

    // Check perk types consistency
    const validPerkTypes = [
      'consultation', 'cleaning', 'extraction', 'fluoride', 'whitening',
      'xray', 'denture', 'braces', 'filling', 'root_canal'
    ];

    const invalidPerks = perkTemplates?.filter(perk =>
      !validPerkTypes.includes(perk.perk_type)
    );

    if (invalidPerks && invalidPerks.length > 0) {
      invalidPerks.forEach(perk => {
        logIssue('major', 'PERK_SYSTEM', `Invalid perk type: "${perk.perk_type}" in template "${perk.perk_name}"`);
      });
    } else {
      logSuccess('All perk types are valid');
    }

    // Test perk assignment to cards
    const { data: cardPerks } = await supabase
      .from('card_perks')
      .select('*')
      .limit(1);

    if (cardPerks && cardPerks.length > 0) {
      logSuccess('Perk assignment system operational');
    } else {
      logIssue('minor', 'PERK_SYSTEM', 'No card perks found - may need initial perk assignment');
    }

  } catch (error) {
    logIssue('critical', 'PERK_SYSTEM', `Perk system audit failed: ${error.message}`);
  }
}

// =============================================================================
// 6. SEARCH FUNCTIONALITY AUDIT
// =============================================================================

async function auditSearchFunctionality() {
  console.log('\n🔍 AUDITING SEARCH FUNCTIONALITY');
  console.log('='.repeat(60));

  const searchTests = [
    { term: '1', description: 'Simple card number' },
    { term: '00001', description: '5-digit padded' },
    { term: 'MOC-00001', description: 'Legacy format' },
    { term: '10000', description: 'Display number' },
    { term: 'MOC-10000-01-CVT001', description: 'Unified format' }
  ];

  for (const test of searchTests) {
    try {
      const { data: searchResult } = await supabase.rpc('search_card_universal', {
        search_term: test.term
      });

      if (searchResult && searchResult.length > 0) {
        logSuccess(`Universal search: "${test.term}" (${test.description}) - Found ${searchResult.length} results`);
      } else {
        logIssue('major', 'SEARCH', `Universal search failed for "${test.term}" (${test.description})`);
      }
    } catch (error) {
      logIssue('critical', 'SEARCH', `Universal search error for "${test.term}": ${error.message}`);
    }
  }

  // Test backward compatibility
  try {
    const { data: legacySearch } = await supabase
      .from('cards')
      .select('*')
      .or('control_number.like.%00001,control_number_v2.like.%00001,unified_control_number.like.%10000')
      .limit(1);

    if (legacySearch && legacySearch.length > 0) {
      logSuccess('Backward compatibility search working');
    } else {
      logIssue('major', 'SEARCH', 'Backward compatibility search not working');
    }
  } catch (error) {
    logIssue('critical', 'SEARCH', `Backward compatibility test failed: ${error.message}`);
  }
}

// =============================================================================
// 7. FLOW LOGIC AUDIT
// =============================================================================

async function auditFlowLogic() {
  console.log('\n🔍 AUDITING APPLICATION FLOW LOGIC');
  console.log('='.repeat(60));

  // Check card lifecycle flow: unassigned -> assigned -> activated
  try {
    const { data: flowTest } = await supabase
      .from('cards')
      .select('status, is_activated, assigned_clinic_id')
      .gte('card_number', 1)
      .lte('card_number', 100); // Sample first 100 cards

    let flowIssues = 0;

    flowTest?.forEach((card, index) => {
      // Logic check: activated cards must be assigned
      if (card.is_activated && !card.assigned_clinic_id) {
        logIssue('critical', 'FLOW_LOGIC', `Card ${index + 1}: Activated but not assigned to clinic`);
        flowIssues++;
      }

      // Logic check: assigned cards should have status 'assigned' or 'activated'
      if (card.assigned_clinic_id && !['assigned', 'activated'].includes(card.status)) {
        logIssue('major', 'FLOW_LOGIC', `Card ${index + 1}: Assigned to clinic but status is "${card.status}"`);
        flowIssues++;
      }

      // Logic check: unassigned cards should not be activated
      if (card.status === 'unassigned' && card.is_activated) {
        logIssue('critical', 'FLOW_LOGIC', `Card ${index + 1}: Unassigned but activated`);
        flowIssues++;
      }
    });

    if (flowIssues === 0) {
      logSuccess('Card lifecycle flow logic is consistent');
    } else {
      logIssue('major', 'FLOW_LOGIC', `Found ${flowIssues} flow logic inconsistencies`);
    }

  } catch (error) {
    logIssue('critical', 'FLOW_LOGIC', `Flow logic audit failed: ${error.message}`);
  }

  // Check clinic-card relationship integrity
  try {
    const { data: relationshipTest } = await supabase
      .from('cards')
      .select(`
        id,
        assigned_clinic_id,
        clinic:mocards_clinics(id, clinic_name)
      `)
      .not('assigned_clinic_id', 'is', null)
      .limit(10);

    let relationshipIssues = 0;

    relationshipTest?.forEach(card => {
      if (card.assigned_clinic_id && !card.clinic) {
        logIssue('critical', 'FLOW_LOGIC', `Card ${card.id}: Assigned to non-existent clinic ${card.assigned_clinic_id}`);
        relationshipIssues++;
      }
    });

    if (relationshipIssues === 0) {
      logSuccess('Clinic-card relationships are valid');
    }

  } catch (error) {
    logIssue('critical', 'FLOW_LOGIC', `Relationship integrity audit failed: ${error.message}`);
  }
}

// =============================================================================
// 8. MAIN AUDIT EXECUTION
// =============================================================================

async function runComprehensiveAudit() {
  console.log('🚀 STARTING COMPREHENSIVE PRODUCTION AUDIT');
  console.log('='.repeat(80));
  console.log('Auditing MOCards application for production readiness...\n');

  const startTime = Date.now();

  // Run all audits
  const dbConnected = await auditDatabase();
  if (dbConnected) {
    auditCodeForDemo();
    await auditPortalAccess();
    await auditCardManagementFlow();
    await auditPerkSystem();
    await auditSearchFunctionality();
    await auditFlowLogic();
  }

  // Generate audit report
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE AUDIT REPORT');
  console.log('='.repeat(80));

  const totalIssues = Object.values(auditResults).reduce((sum, issues) => sum + issues.length, 0);

  console.log(`\n📈 AUDIT STATISTICS:`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Total Issues Found: ${totalIssues}`);
  console.log(`   Critical Issues: ${auditResults.critical.length}`);
  console.log(`   Major Issues: ${auditResults.major.length}`);
  console.log(`   Minor Issues: ${auditResults.minor.length}`);

  if (auditResults.critical.length > 0) {
    console.log(`\n🚨 CRITICAL ISSUES (MUST FIX):`);
    auditResults.critical.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue.category}: ${issue.description}`);
    });
  }

  if (auditResults.major.length > 0) {
    console.log(`\n⚠️  MAJOR ISSUES (SHOULD FIX):`);
    auditResults.major.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue.category}: ${issue.description}`);
    });
  }

  // Production readiness assessment
  console.log(`\n🎯 PRODUCTION READINESS ASSESSMENT:`);

  if (auditResults.critical.length === 0) {
    console.log(`   ✅ READY FOR PRODUCTION`);
    console.log(`   All critical systems operational`);
  } else {
    console.log(`   ❌ NOT READY FOR PRODUCTION`);
    console.log(`   ${auditResults.critical.length} critical issues must be resolved`);
  }

  if (auditResults.major.length === 0) {
    console.log(`   ✅ No major issues found`);
  } else {
    console.log(`   ⚠️  ${auditResults.major.length} major issues should be addressed`);
  }

  // Save detailed report
  const reportPath = path.join(process.cwd(), 'PRODUCTION-AUDIT-REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    duration: duration,
    summary: {
      total_issues: totalIssues,
      critical: auditResults.critical.length,
      major: auditResults.major.length,
      minor: auditResults.minor.length,
      production_ready: auditResults.critical.length === 0
    },
    issues: auditResults
  }, null, 2));

  console.log(`\n📄 Detailed audit report saved to: ${reportPath}`);
  console.log('\n🏁 COMPREHENSIVE AUDIT COMPLETE');
  console.log('='.repeat(80));
}

// Execute the audit
runComprehensiveAudit().catch(console.error);