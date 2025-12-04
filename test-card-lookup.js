#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCardLookup() {
  console.log('🔍 Testing card lookup with corrected query...\n');

  try {
    // Test the exact query that the app uses
    const controlNumber = 'MO-C000001-001';
    const passcode = '123456';

    console.log(`Looking up card: ${controlNumber} with passcode: ${passcode}`);

    let query = supabase
      .from('cards')
      .select(`
        *,
        clinic:mocards_clinics(*),
        perks:card_perks(*)
      `)
      .eq('control_number', controlNumber);

    if (passcode) {
      query = query.eq('passcode', passcode);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('❌ Card lookup failed:', error);
    } else {
      console.log('✅ Card lookup successful!');
      console.log('Card details:', {
        control_number: data.control_number,
        passcode: data.passcode,
        status: data.status,
        clinic_name: data.clinic?.clinic_name,
        clinic_code: data.clinic?.clinic_code,
        perks_total: data.perks?.length,
        perks_claimed: data.perks?.filter(p => p.claimed).length,
        perks_available: data.perks?.filter(p => !p.claimed).length
      });

      console.log('\nPerks breakdown:');
      data.perks?.forEach(perk => {
        console.log(`  ${perk.perk_type}: ${perk.claimed ? 'CLAIMED' : 'AVAILABLE'}`);
      });
    }

    // Test card generation function components
    console.log('\n🔧 Testing card generation components...');

    // Check if we can create a batch
    const batchData = {
      batch_number: 'TEST-B001',
      total_cards: 5,
      created_by: '609e400b-27bf-476a-a5f5-7d793d85293f' // Admin ID from our debug
    };

    console.log('Testing batch creation...');
    const { data: batchResult, error: batchError } = await supabase
      .from('card_batches')
      .insert(batchData)
      .select()
      .single();

    if (batchError) {
      console.log('❌ Batch creation failed:', batchError.message);
    } else {
      console.log('✅ Batch creation works');

      // Clean up test batch
      await supabase
        .from('card_batches')
        .delete()
        .eq('id', batchResult.id);
      console.log('🧹 Cleaned up test batch');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testCardLookup();