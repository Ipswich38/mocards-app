#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDirectly() {
  console.log('🔌 Testing direct table access...');

  try {
    // Try mocards.clinics first
    console.log('\n🏥 Testing mocards.clinics...');
    const { data: mocardsData, error: mocardsError } = await supabase
      .from('mocards.clinics')
      .select('clinic_code, clinic_name')
      .limit(1);

    if (mocardsError) {
      console.log('❌ mocards.clinics failed:', mocardsError.message);
      console.log('❗ This confirms the MOCARDS schema doesn\'t exist yet!');
    } else {
      console.log('✅ mocards.clinics works:', mocardsData);
    }

    // Try regular clinics table
    console.log('\n🏥 Testing regular clinics...');
    const { data: clinicsData, error: clinicsError } = await supabase
      .from('clinics')
      .select('name, slug')
      .limit(3);

    if (clinicsError) {
      console.log('❌ clinics failed:', clinicsError.message);
    } else {
      console.log('✅ clinics works, found:', clinicsData?.length, 'records');
      if (clinicsData?.length) {
        console.log('   Sample:', clinicsData[0]);
      }
    }

    // Test admin_users
    console.log('\n👤 Testing admin_users...');
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('username')
      .limit(1);

    if (adminError) {
      console.log('❌ admin_users failed:', adminError.message);
    } else {
      console.log('✅ admin_users works');
    }

    // Test mocards.admin_users
    console.log('\n👤 Testing mocards.admin_users...');
    const { data: mocardsAdminData, error: mocardsAdminError } = await supabase
      .from('mocards.admin_users')
      .select('username')
      .limit(1);

    if (mocardsAdminError) {
      console.log('❌ mocards.admin_users failed:', mocardsAdminError.message);
    } else {
      console.log('✅ mocards.admin_users works');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('If mocards.* tables failed, you need to:');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Run the fix-mocards-schema.sql script');
  console.log('3. Then test logins again');
}

testDirectly();