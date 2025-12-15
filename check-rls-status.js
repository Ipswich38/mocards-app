#!/usr/bin/env node

/**
 * CHECK RLS STATUS - Verify if RLS is actually disabled
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSStatus() {
  console.log('🔍 CHECKING RLS STATUS');
  console.log('='.repeat(40));

  // Test 1: Simple count without limits
  console.log('\n1. Simple count test:');
  const { count: totalCount } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true });
  console.log(`   Total cards in table: ${totalCount}`);

  // Test 2: Range count
  console.log('\n2. Range count test (1-10000):');
  const { count: rangeCount } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .gte('card_number', 1)
    .lte('card_number', 10000);
  console.log(`   Cards in range 1-10000: ${rangeCount}`);

  // Test 3: Fetch test with different approaches
  console.log('\n3. Fetch tests:');

  const { data: test1 } = await supabase
    .from('cards')
    .select('card_number')
    .limit(1500);
  console.log(`   LIMIT 1500: ${test1?.length || 0} cards`);

  const { data: test2 } = await supabase
    .from('cards')
    .select('card_number')
    .range(0, 1499);
  console.log(`   RANGE 0-1499: ${test2?.length || 0} cards`);

  const { data: test3 } = await supabase
    .from('cards')
    .select('card_number')
    .gte('card_number', 1)
    .lte('card_number', 2000);
  console.log(`   WHERE card_number 1-2000: ${test3?.length || 0} cards`);

  // Test 4: Check RLS status via query (if possible)
  console.log('\n4. RLS status check:');
  try {
    const { data: rlsStatus, error } = await supabase.rpc('check_rls_status');
    if (error) {
      console.log(`   RLS status function not available: ${error.message}`);
    } else {
      console.log(`   RLS status: ${JSON.stringify(rlsStatus)}`);
    }
  } catch (error) {
    console.log(`   RLS status check failed: ${error.message}`);
  }

  // Test 5: Direct SQL execution test
  console.log('\n5. Testing SQL execution permissions:');
  try {
    const { data: sqlTest, error } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT COUNT(*) as total FROM public.cards WHERE card_number BETWEEN 1 AND 10000'
    });
    if (error) {
      console.log(`   SQL exec not available: ${error.message}`);
    } else {
      console.log(`   Direct SQL count: ${JSON.stringify(sqlTest)}`);
    }
  } catch (error) {
    console.log(`   SQL exec failed: ${error.message}`);
  }

  console.log('\n📊 ANALYSIS:');
  if (rangeCount === 10000 && test3 && test3.length < 2000) {
    console.log('   ✅ All 10,000 cards exist in database');
    console.log('   ❌ BUT: Fetch operations are still limited');
    console.log('   📋 NEXT STEPS:');
    console.log('      1. RLS may still be enabled - double-check in Supabase Dashboard');
    console.log('      2. Or there might be a client-side pagination limit');
    console.log('      3. Try: ALTER TABLE public.cards DISABLE ROW LEVEL SECURITY;');
  } else if (rangeCount < 10000) {
    console.log('   ❌ Not all cards exist in the database');
    console.log('   📋 Need to generate missing cards first');
  } else {
    console.log('   🤔 Unexpected result - need manual investigation');
  }

  console.log('\n='.repeat(40));
}

checkRLSStatus().catch(console.error);