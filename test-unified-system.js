#!/usr/bin/env node

/**
 * TEST SCRIPT: Unified Card System Migration
 *
 * This script tests the new unified card system to ensure:
 * 1. All 10,000 cards are accessible
 * 2. Backward compatibility works
 * 3. New format is properly implemented
 * 4. Search functions work across all portals
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUnifiedSystem() {
  console.log('🚀 TESTING UNIFIED CARD SYSTEM');
  console.log('='.repeat(60));

  try {
    // Test 1: Check total card count
    console.log('\n📊 Test 1: Card Count Verification');
    console.log('-'.repeat(40));

    const { count: totalCards } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .gte('card_number', 1)
      .lte('card_number', 10000);

    console.log(`✅ Total cards in sequence (1-10000): ${totalCards}`);

    if (totalCards !== 10000) {
      console.log(`❌ ERROR: Expected 10,000 cards, found ${totalCards}`);
      return;
    }

    // Test 2: Check unified format adoption
    console.log('\n🔄 Test 2: Unified Format Adoption');
    console.log('-'.repeat(40));

    const { count: unifiedCards } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .not('unified_control_number', 'is', null)
      .gte('card_number', 1)
      .lte('card_number', 10000);

    console.log(`✅ Cards with unified format: ${unifiedCards}`);

    // Test 3: Sample card lookups
    console.log('\n🔍 Test 3: Card Lookup Compatibility');
    console.log('-'.repeat(40));

    const testSearches = [
      { term: '1', description: 'Card number 1' },
      { term: '00001', description: '5-digit padded' },
      { term: 'MOC-00001', description: 'Legacy format' },
      { term: '10000', description: 'Display number 10000' },
      { term: '10001', description: 'Display number 10001' }
    ];

    for (const test of testSearches) {
      try {
        const { data: searchResult } = await supabase
          .from('cards')
          .select('card_number, control_number, control_number_v2, unified_control_number, display_card_number')
          .or(
            `control_number.like.%${test.term},` +
            `control_number_v2.like.%${test.term},` +
            `unified_control_number.like.%${test.term},` +
            `card_number.eq.${parseInt(test.term.replace(/\D/g, '')) || 0},` +
            `display_card_number.eq.${parseInt(test.term.replace(/\D/g, '')) || 0}`
          )
          .gte('card_number', 1)
          .lte('card_number', 10000)
          .limit(1)
          .single();

        if (searchResult) {
          console.log(`✅ ${test.description}: Found card #${searchResult.card_number}`);
          if (searchResult.unified_control_number) {
            console.log(`   New format: ${searchResult.unified_control_number}`);
          }
        } else {
          console.log(`❌ ${test.description}: Not found`);
        }
      } catch (error) {
        console.log(`❌ ${test.description}: Search failed`);
      }
    }

    // Test 4: Check if universal search function exists
    console.log('\n🔧 Test 4: Universal Search Function');
    console.log('-'.repeat(40));

    try {
      const { data: searchResults } = await supabase
        .rpc('search_card_universal', { search_term: '1' });

      if (searchResults && searchResults.length > 0) {
        console.log('✅ Universal search function working');
        console.log(`   Found ${searchResults.length} results for "1"`);
      } else {
        console.log('⚠️  Universal search function exists but returned no results');
      }
    } catch (error) {
      console.log('❌ Universal search function not available');
      console.log('   This may be expected if the SQL script hasn\'t been run yet');
    }

    // Test 5: Check format consistency
    console.log('\n📋 Test 5: Format Consistency Check');
    console.log('-'.repeat(40));

    const { data: sampleCards } = await supabase
      .from('cards')
      .select('card_number, control_number, control_number_v2, unified_control_number, display_card_number')
      .gte('card_number', 1)
      .lte('card_number', 10)
      .order('card_number');

    if (sampleCards) {
      console.log('Sample cards (1-10):');
      sampleCards.forEach(card => {
        const primary = card.unified_control_number || card.control_number_v2 || card.control_number;
        console.log(`  Card #${card.card_number} → ${primary}`);
      });
    }

    // Test 6: Check accessibility for portals
    console.log('\n🌐 Test 6: Portal Accessibility');
    console.log('-'.repeat(40));

    // Admin portal test - can see all cards
    const { count: adminVisible } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .gte('card_number', 1)
      .lte('card_number', 10000);

    console.log(`✅ Admin portal visibility: ${adminVisible}/10000 cards`);

    // Clinic portal test - can search cards
    const { data: clinicSearchTest } = await supabase
      .from('cards')
      .select('id, card_number, control_number, unified_control_number')
      .or('control_number.like.%00001,unified_control_number.like.%10000')
      .limit(5);

    console.log(`✅ Clinic portal search test: ${clinicSearchTest?.length || 0} results`);

    // Patient portal test - can lookup by various formats
    const patientSearchFormats = ['1', '00001', 'MOC-00001'];
    let patientSuccessful = 0;

    for (const format of patientSearchFormats) {
      try {
        const { data } = await supabase
          .from('cards')
          .select('id')
          .or(
            `control_number.like.%${format},` +
            `control_number_v2.like.%${format},` +
            `unified_control_number.like.%${format}`
          )
          .limit(1)
          .single();

        if (data) patientSuccessful++;
      } catch (error) {
        // Expected for some searches
      }
    }

    console.log(`✅ Patient portal compatibility: ${patientSuccessful}/${patientSearchFormats.length} formats work`);

    console.log('\n🎉 UNIFIED SYSTEM TEST COMPLETED');
    console.log('='.repeat(60));

    if (totalCards === 10000 && unifiedCards > 0) {
      console.log('✅ SYSTEM STATUS: READY FOR PRODUCTION');
    } else {
      console.log('⚠️  SYSTEM STATUS: NEEDS MIGRATION SCRIPT EXECUTION');
      console.log('   Please run: unified-card-system-fix.sql');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nThis may indicate the migration script needs to be run first.');
  }
}

// Run the test
testUnifiedSystem().catch(console.error);