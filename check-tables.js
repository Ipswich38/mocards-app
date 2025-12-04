#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAllTables() {
  console.log('🔍 Checking for MOCARDS tables...');

  const tablesToTest = [
    'mocards_admin_users',
    'mocards_clinics',
    'card_batches',
    'cards',
    'card_perks',
    'card_transactions'
  ];

  for (const tableName of tablesToTest) {
    try {
      console.log(`\n📋 Testing table: ${tableName}`);

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: Found ${data?.length || 0} records`);
        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`   Columns: ${columns.join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message}`);
    }
  }

  // Check demo data specifically
  console.log('\n🔍 Checking demo data...');

  try {
    const { data: adminData, error: adminError } = await supabase
      .from('mocards_admin_users')
      .select('username')
      .eq('username', 'admin');

    if (!adminError && adminData?.length) {
      console.log('✅ Demo admin user exists');
    } else {
      console.log('❌ Demo admin user not found:', adminError?.message);
    }

    const { data: clinicData, error: clinicError } = await supabase
      .from('mocards_clinics')
      .select('clinic_code')
      .eq('clinic_code', 'DEMO001');

    if (!clinicError && clinicData?.length) {
      console.log('✅ Demo clinic exists');
    } else {
      console.log('❌ Demo clinic not found:', clinicError?.message);
    }

    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select('control_number')
      .eq('control_number', 'MO-C000001-001');

    if (!cardError && cardData?.length) {
      console.log('✅ Demo card exists');
    } else {
      console.log('❌ Demo card not found:', cardError?.message);
    }

  } catch (error) {
    console.log('❌ Error checking demo data:', error.message);
  }

  console.log('\n📝 Next steps:');
  console.log('1. If tables don\'t exist, run fixed-simple-setup.sql');
  console.log('2. If they exist but passwords fail, run the UPDATE statements from generate-hashes.js');
}

checkAllTables();