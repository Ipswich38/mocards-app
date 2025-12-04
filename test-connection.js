#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔌 Testing Supabase connection...');
  console.log(`📡 URL: ${supabaseUrl}`);

  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error);
      return;
    }

    console.log('✅ Basic connection works');

    // Check if mocards schema exists
    console.log('\n🔍 Checking MOCARDS schema...');

    const { data: mocardsData, error: mocardsError } = await supabase
      .from('mocards.clinics')
      .select('*')
      .limit(1);

    if (mocardsError) {
      console.error('❌ MOCARDS schema issue:', mocardsError.message);
      console.log('💡 This is why login fails - the schema doesn\'t exist yet!');

      // Check if regular clinics table exists
      const { data: regularData, error: regularError } = await supabase
        .from('clinics')
        .select('*')
        .limit(1);

      if (!regularError) {
        console.log('✅ Found regular clinics table');
        console.log('🔧 You need to run the fix-mocards-schema.sql script');
      }
    } else {
      console.log('✅ MOCARDS schema exists');

      // Test demo clinic lookup
      console.log('\n🏥 Testing demo clinic...');
      const { data: clinic, error: clinicError } = await supabase
        .from('mocards.clinics')
        .select('*')
        .eq('clinic_code', 'DEMO001');

      if (clinicError) {
        console.error('❌ Demo clinic lookup failed:', clinicError);
      } else {
        console.log('✅ Demo clinic found:', clinic);
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

testConnection();