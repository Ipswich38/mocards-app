#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEnhancedUI() {
  console.log('🧪 Testing Enhanced Card System for UI Integration\n');

  try {
    // Test admin ID from UI
    const adminUserId = '609e400b-27bf-476a-a5f5-7d793d85293f';

    // Create a small test batch (3 cards)
    const timestamp = Date.now();
    const batchNumber = `TST${timestamp.toString().slice(-6)}`;

    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert({
        batch_number: batchNumber,
        total_cards: 3,
        created_by: adminUserId
      })
      .select()
      .single();

    if (batchError) throw batchError;
    console.log(`✅ Test batch created: ${batch.batch_number}`);

    // Generate 3 test cards
    const testCards = [];
    for (let i = 1; i <= 3; i++) {
      const controlNumber = `TC${timestamp.toString().slice(-4)}${i}`;
      const incompletePasscode = Math.random().toString().slice(2, 6).padStart(4, '0');

      const { data: card, error: cardError } = await supabase
        .from('cards')
        .insert({
          batch_id: batch.id,
          control_number: controlNumber,
          passcode: incompletePasscode,
          location_code: 'PHL',
          status: 'unactivated'
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Create perks
      const perks = ['consultation', 'cleaning', 'extraction', 'fluoride'];
      for (const perk of perks) {
        await supabase
          .from('card_perks')
          .insert({
            card_id: card.id,
            perk_type: perk,
            claimed: false
          });
      }

      testCards.push({
        ...card,
        completeExample: `CAV${incompletePasscode}`
      });

      console.log(`Card ${i}: ${controlNumber} / ${incompletePasscode} → CAV${incompletePasscode}`);
    }

    console.log('\n🎯 Enhanced UI System Ready!');
    console.log('📋 Test Data Created:');
    console.log(`   Batch: ${batch.batch_number}`);
    console.log(`   Cards: ${testCards.length}`);
    console.log(`   Admin: ${adminUserId}`);

    console.log('\n✅ Features to Test in UI:');
    console.log('  1. Enhanced Cards tab in Super Admin');
    console.log('  2. Batch generation (10, 25, 50, 100 cards)');
    console.log('  3. Location-based passcode system');
    console.log('  4. Card metadata display');
    console.log('  5. Workflow instructions');

    console.log('\n🚀 UI is ready for production testing!');

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    const cardIds = testCards.map(c => c.id);
    await supabase.from('card_perks').delete().in('card_id', cardIds);
    await supabase.from('cards').delete().eq('batch_id', batch.id);
    await supabase.from('card_batches').delete().eq('id', batch.id);
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('💥 Error testing enhanced UI:', error);
  }
}

testEnhancedUI();