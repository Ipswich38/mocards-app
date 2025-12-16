#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCardGeneration() {
  console.log('🧪 Testing card generation without passcode...\n');

  try {
    // First, create a test batch
    console.log('📦 Creating test batch...');
    const batchNumber = `TEST-BATCH-${Date.now()}`;
    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert({
        batch_number: batchNumber,
        total_cards: 5,
        status: 'active',
        created_by: 'test-script',
        notes: 'Test batch to verify passcode fix'
      })
      .select()
      .single();

    if (batchError) {
      throw new Error(`Failed to create test batch: ${batchError.message}`);
    }

    console.log(`✅ Test batch created: ${batch.batch_number}`);

    // Generate 5 test cards without passcode
    console.log('\n🎯 Generating 5 test cards WITHOUT passcode...');
    const testCards = [];

    for (let i = 1; i <= 5; i++) {
      testCards.push({
        batch_id: batch.id,
        control_number: `TEST-${Date.now()}-${i.toString().padStart(3, '0')}`,
        location_code: 'TST',
        card_number: 90000 + i, // Use high numbers to avoid conflicts
        is_activated: false,
        status: 'unassigned',
        migration_version: 2
        // NOTE: NO passcode field - this should work now!
      });
    }

    // Insert the test cards
    const { data: insertedCards, error: insertError } = await supabase
      .from('cards')
      .insert(testCards)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert test cards: ${insertError.message}`);
    }

    console.log(`✅ Successfully inserted ${insertedCards.length} cards without passcode!`);

    // Display the test cards
    console.log('\n📋 Test cards created:');
    insertedCards.forEach((card, index) => {
      console.log(`   ${index + 1}. ${card.control_number} | Card #${card.card_number} | Status: ${card.status}`);
    });

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('cards').delete().eq('batch_id', batch.id);
    await supabase.from('card_batches').delete().eq('id', batch.id);

    console.log('✅ Test data cleaned up successfully!');

    console.log('\n🎉 SUCCESS: Card generation works without passcode!');
    console.log('🚀 The UI should now work properly for generating cards.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 If this fails, run the SQL script "eliminate-passcode-completely.sql" in Supabase SQL Editor first.');
    process.exit(1);
  }
}

// Run the test
testCardGeneration();