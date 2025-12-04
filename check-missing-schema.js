#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMissingSchema() {
  console.log('🔍 Checking Missing Schema Components for Enhanced Card System\n');

  try {
    // Check card_batches table structure
    console.log('1️⃣ Checking card_batches table structure...');
    const { data: batchSample, error: batchError } = await supabase
      .from('card_batches')
      .select('*')
      .limit(1)
      .single();

    if (batchError && !batchError.message.includes('No rows')) {
      console.log('❌ card_batches table issue:', batchError.message);
    } else if (batchSample) {
      console.log('✅ card_batches columns:', Object.keys(batchSample));

      // Check for missing enhanced columns
      const requiredBatchColumns = ['batch_metadata', 'cards_generated'];
      const missingBatchColumns = requiredBatchColumns.filter(col => !(col in batchSample));
      if (missingBatchColumns.length > 0) {
        console.log('⚠️  Missing batch columns:', missingBatchColumns);
      } else {
        console.log('✅ All required batch columns present');
      }
    } else {
      console.log('⚠️  No batches in database to check structure');
    }

    // Check cards table structure
    console.log('\n2️⃣ Checking cards table structure...');
    const { data: cardSample, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .limit(1)
      .single();

    if (cardError && !cardError.message.includes('No rows')) {
      console.log('❌ cards table issue:', cardError.message);
    } else if (cardSample) {
      console.log('✅ cards columns:', Object.keys(cardSample));

      // Check for missing enhanced columns
      const requiredCardColumns = ['card_metadata', 'assigned_clinic_id'];
      const missingCardColumns = requiredCardColumns.filter(col => !(col in cardSample));
      if (missingCardColumns.length > 0) {
        console.log('⚠️  Missing card columns:', missingCardColumns);
      } else {
        console.log('✅ All required card columns present');
      }
    } else {
      console.log('⚠️  No cards in database to check structure');
    }

    // Check enhanced production tables
    console.log('\n3️⃣ Checking enhanced production tables...');
    const enhancedTables = {
      'clinic_subscription_plans': ['plan_name', 'monthly_card_limit', 'price_per_month'],
      'clinic_sales': ['clinic_id', 'card_id', 'sale_amount', 'commission_amount'],
      'clinic_perk_redemptions': ['clinic_id', 'card_id', 'perk_id', 'service_provided'],
      'clinic_monthly_reports': ['clinic_id', 'report_month', 'report_year'],
      'location_code_assignments': ['clinic_id', 'card_id', 'location_code']
    };

    for (const [tableName, requiredColumns] of Object.entries(enhancedTables)) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
        .single();

      if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`❌ Missing table: ${tableName}`);
      } else if (error && !error.message.includes('No rows')) {
        console.log(`⚠️  ${tableName} table issue:`, error.message);
      } else {
        console.log(`✅ ${tableName} table exists`);
        if (data) {
          const presentColumns = Object.keys(data);
          const missingColumns = requiredColumns.filter(col => !presentColumns.includes(col));
          if (missingColumns.length > 0) {
            console.log(`   ⚠️  Missing columns in ${tableName}:`, missingColumns);
          }
        }
      }
    }

    // Check enhanced functions
    console.log('\n4️⃣ Checking enhanced functions...');
    const enhancedFunctions = [
      'generate_clinic_code',
      'generate_clinic_password',
      'generate_incomplete_passcode',
      'complete_passcode'
    ];

    for (const funcName of enhancedFunctions) {
      try {
        const { data, error } = await supabase.rpc(funcName);
        if (error) {
          console.log(`❌ Missing function: ${funcName} - ${error.message}`);
        } else {
          console.log(`✅ Function exists: ${funcName}`);
        }
      } catch (err) {
        console.log(`❌ Missing function: ${funcName} - ${err.message}`);
      }
    }

    // Test card generation with enhanced features
    console.log('\n5️⃣ Testing enhanced card generation with full metadata...');

    try {
      const adminUserId = '609e400b-27bf-476a-a5f5-7d793d85293f';
      const timestamp = Date.now();
      const batchNumber = `SCHEMA-${timestamp.toString().slice(-6)}`;

      // Try to create batch with enhanced metadata
      const { data: batch, error: batchMetaError } = await supabase
        .from('card_batches')
        .insert({
          batch_number: batchNumber,
          total_cards: 1,
          created_by: adminUserId,
          batch_metadata: {
            generation_timestamp: new Date().toISOString(),
            admin_user: adminUserId,
            intended_distribution: 'schema_test',
            expiry_period: 12
          },
          cards_generated: 0
        })
        .select()
        .single();

      if (batchMetaError) {
        console.log('❌ Enhanced batch creation failed:', batchMetaError.message);
      } else {
        console.log('✅ Enhanced batch creation works');

        // Try to create card with enhanced metadata
        const { data: card, error: cardMetaError } = await supabase
          .from('cards')
          .insert({
            batch_id: batch.id,
            control_number: `SCHEMA-${timestamp.toString().slice(-6)}-001`,
            passcode: '1234',
            location_code: 'TST',
            status: 'unactivated',
            card_metadata: {
              batch_creation_date: new Date().toISOString(),
              card_position_in_batch: 1,
              total_perks_count: 8,
              initial_perks: ['consultation', 'cleaning'],
              validity_period_months: 12
            }
          })
          .select()
          .single();

        if (cardMetaError) {
          console.log('❌ Enhanced card creation failed:', cardMetaError.message);
        } else {
          console.log('✅ Enhanced card creation works');

          // Clean up test data
          await supabase.from('cards').delete().eq('id', card.id);
        }

        // Clean up test batch
        await supabase.from('card_batches').delete().eq('id', batch.id);
      }
    } catch (testError) {
      console.log('❌ Enhanced features test failed:', testError.message);
    }

    console.log('\n📋 SCHEMA STATUS SUMMARY:');
    console.log('=====================================');

  } catch (error) {
    console.error('💥 Schema check failed:', error);
  }
}

checkMissingSchema();