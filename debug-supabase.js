// DEBUG SUPABASE CONNECTION AND SCHEMA
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSupabase() {
  console.log('🔍 DEBUGGING SUPABASE CONNECTION AND SCHEMA...\n');

  // Test basic connection
  try {
    console.log('1. Testing connection...');
    const { data: authData, error: authError } = await supabase.from('cards').select('id').limit(1);
    if (authError) {
      console.error('❌ Connection failed:', authError.message);
      console.error('Error details:', authError);
    } else {
      console.log('✅ Connection successful');
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }

  // Check available tables
  const tablesToCheck = ['cards', 'clinics', 'perks', 'perk_redemptions', 'appointments'];

  for (const table of tablesToCheck) {
    console.log(`\n2. Testing table "${table}"...`);
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.error(`❌ Table "${table}" error:`, error.message);
        console.error('Error code:', error.code);
      } else {
        console.log(`✅ Table "${table}" exists`);
        if (data && data.length > 0) {
          console.log(`📋 Sample columns:`, Object.keys(data[0]).join(', '));
        } else {
          console.log(`📋 Table "${table}" is empty`);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking table "${table}":`, error.message);
    }
  }

  // Test card creation (let PostgreSQL generate UUID)
  console.log(`\n3. Testing card creation...`);
  try {
    const testCard = {
      control_number: 'TEST-' + Date.now(),
      status: 'inactive',
      perks_total: 5,
      perks_used: 0,
      expiry_date: '2025-12-31'
    };

    const { data, error } = await supabase.from('cards').insert(testCard).select();
    if (error) {
      console.error('❌ Card creation failed:', error.message);
      console.error('Error details:', error);
    } else {
      console.log('✅ Card creation successful:', data);

      // Clean up test card
      await supabase.from('cards').delete().eq('id', data[0].id);
      console.log('🧹 Test card cleaned up');
    }
  } catch (error) {
    console.error('❌ Card creation error:', error.message);
  }

  // Test with expected schema fields from FINAL-2025-SCHEMA
  console.log(`\n4. Testing with proper schema fields...`);
  try {
    const testCard2 = {
      control_number: 'SCHEMA-TEST-' + Date.now(),
      full_name: null,
      status: 'inactive',
      perks_total: 5,
      perks_used: 0,
      clinic_id: null,
      expiry_date: '2025-12-31',
      notes: null,
      issued_by: null,
      activated_at: null,
      deactivated_at: null
    };

    const { data, error } = await supabase.from('cards').insert(testCard2).select();
    if (error) {
      console.error('❌ Schema test failed:', error.message);
      console.error('Error details:', error);
    } else {
      console.log('✅ Schema test successful:', data);

      // Clean up test card
      await supabase.from('cards').delete().eq('id', data[0].id);
      console.log('🧹 Schema test card cleaned up');
    }
  } catch (error) {
    console.error('❌ Schema test error:', error.message);
  }
}

debugSupabase().then(() => {
  console.log('\n🎯 SUPABASE DEBUG COMPLETE');
}).catch(error => {
  console.error('💥 Debug script failed:', error);
});