#!/usr/bin/env node

/**
 * DEBUG PORTAL FUNCTIONS - Investigate why they're still limited
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPortalFunctions() {
  console.log('🔍 DEBUGGING PORTAL FUNCTION LIMITATIONS');
  console.log('='.repeat(60));

  // Test 1: Direct table query
  console.log('\n1. Direct table query:');
  const { count: directCount } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .gte('card_number', 1)
    .lte('card_number', 10000);
  console.log(`   Direct query: ${directCount} cards`);

  // Test 2: Check RLS status
  console.log('\n2. Check if RLS is blocking access:');
  const { data: rlsCheck } = await supabase
    .from('cards')
    .select('card_number')
    .gte('card_number', 1)
    .lte('card_number', 10000)
    .limit(10001); // Try to get more than 1000
  console.log(`   RLS test: ${rlsCheck?.length || 0} cards returned`);

  // Test 3: Admin function test
  console.log('\n3. Admin function test:');
  try {
    const { data: adminCards, error: adminError } = await supabase.rpc('admin_get_all_cards');
    if (adminError) {
      console.log(`   Admin function error: ${adminError.message}`);
    } else {
      console.log(`   Admin function: ${adminCards?.length || 0} cards`);
      if (adminCards && adminCards.length > 0) {
        console.log(`   First card: ${JSON.stringify(adminCards[0], null, 2)}`);
        console.log(`   Last card: ${JSON.stringify(adminCards[adminCards.length - 1], null, 2)}`);
      }
    }
  } catch (error) {
    console.log(`   Admin function failed: ${error.message}`);
  }

  // Test 4: Clinic function test
  console.log('\n4. Clinic function test:');
  try {
    const { data: clinicCards, error: clinicError } = await supabase.rpc('clinic_get_all_cards_mirror');
    if (clinicError) {
      console.log(`   Clinic function error: ${clinicError.message}`);
    } else {
      console.log(`   Clinic function: ${clinicCards?.length || 0} cards`);
    }
  } catch (error) {
    console.log(`   Clinic function failed: ${error.message}`);
  }

  // Test 5: Check if function exists and definition
  console.log('\n5. Function existence check:');
  try {
    const { data: functions, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_definition')
      .eq('routine_name', 'admin_get_all_cards')
      .eq('routine_schema', 'public');

    if (error) {
      console.log(`   Function check error: ${error.message}`);
    } else {
      console.log(`   Functions found: ${functions?.length || 0}`);
      if (functions && functions.length > 0) {
        console.log(`   Function exists: ${functions[0].routine_name}`);
      }
    }
  } catch (error) {
    console.log(`   Function check failed: ${error.message}`);
  }

  // Test 6: Test with different limits
  console.log('\n6. Testing different query approaches:');

  const testQueries = [
    { name: 'LIMIT 1000', query: supabase.from('cards').select('card_number').gte('card_number', 1).lte('card_number', 10000).limit(1000) },
    { name: 'LIMIT 2000', query: supabase.from('cards').select('card_number').gte('card_number', 1).lte('card_number', 10000).limit(2000) },
    { name: 'LIMIT 5000', query: supabase.from('cards').select('card_number').gte('card_number', 1).lte('card_number', 10000).limit(5000) },
    { name: 'LIMIT 10000', query: supabase.from('cards').select('card_number').gte('card_number', 1).lte('card_number', 10000).limit(10000) },
    { name: 'No LIMIT', query: supabase.from('cards').select('card_number').gte('card_number', 1).lte('card_number', 10000) }
  ];

  for (const test of testQueries) {
    try {
      const { data, error } = await test.query;
      if (error) {
        console.log(`   ${test.name}: ERROR - ${error.message}`);
      } else {
        console.log(`   ${test.name}: ${data?.length || 0} cards`);
      }
    } catch (error) {
      console.log(`   ${test.name}: EXCEPTION - ${error.message}`);
    }
  }

  console.log('\n🎯 DIAGNOSIS:');

  if (directCount === 10000 && rlsCheck && rlsCheck.length < 10000) {
    console.log('   Issue: RLS (Row Level Security) is limiting access');
    console.log('   Solution: Execute "ALTER TABLE public.cards DISABLE ROW LEVEL SECURITY;" in Supabase');
  } else if (directCount === 10000 && rlsCheck && rlsCheck.length >= 10000) {
    console.log('   Issue: Function definition problem or caching');
    console.log('   Solution: Re-execute the fix-portal-functions.sql script');
  } else if (directCount < 10000) {
    console.log('   Issue: Not all cards exist in database');
    console.log('   Solution: Need to generate missing cards');
  } else {
    console.log('   Issue: Unknown limitation - check Supabase logs');
  }

  console.log('\n='.repeat(60));
}

debugPortalFunctions().catch(console.error);