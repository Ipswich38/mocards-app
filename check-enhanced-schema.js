#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnhancedSchema() {
  console.log('🔍 Checking Enhanced Schema Status\n');

  try {
    // Check if enhanced columns exist in card_batches
    console.log('1️⃣ Checking card_batches table...');
    const { data: batches, error: batchError } = await supabase
      .from('card_batches')
      .select('id, batch_metadata, cards_generated')
      .limit(1);

    if (batchError) {
      console.log('❌ Enhanced columns missing in card_batches:', batchError.message);
    } else {
      console.log('✅ card_batches enhanced columns exist');
    }

    // Check if enhanced columns exist in cards
    console.log('\n2️⃣ Checking cards table...');
    const { data: cards, error: cardError } = await supabase
      .from('cards')
      .select('id, card_metadata, assigned_clinic_id')
      .limit(1);

    if (cardError) {
      console.log('❌ Enhanced columns missing in cards:', cardError.message);
    } else {
      console.log('✅ cards enhanced columns exist');
    }

    // Check if location_code_assignments table exists
    console.log('\n3️⃣ Checking location_code_assignments table...');
    const { data: assignments, error: assignmentError } = await supabase
      .from('location_code_assignments')
      .select('*')
      .limit(1);

    if (assignmentError) {
      console.log('❌ location_code_assignments table missing:', assignmentError.message);
    } else {
      console.log('✅ location_code_assignments table exists');
    }

    // Check if enhanced functions exist
    console.log('\n4️⃣ Checking enhanced functions...');
    try {
      const { data: funcResult, error: funcError } = await supabase
        .rpc('generate_incomplete_passcode');

      if (funcError) {
        console.log('❌ Enhanced functions missing:', funcError.message);
      } else {
        console.log('✅ Enhanced functions exist - sample passcode:', funcResult);
      }
    } catch (err) {
      console.log('❌ Enhanced functions missing:', err.message);
    }

    // Check production schema tables
    console.log('\n5️⃣ Checking production schema tables...');
    const productionTables = [
      'clinic_subscription_plans',
      'clinic_sales',
      'clinic_perk_redemptions',
      'clinic_monthly_reports'
    ];

    for (const table of productionTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table} table missing:`, error.message);
      } else {
        console.log(`✅ ${table} table exists`);
      }
    }

  } catch (error) {
    console.error('💥 Schema check error:', error);
  }
}

checkEnhancedSchema();