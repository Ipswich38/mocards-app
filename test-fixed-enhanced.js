#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simplified enhanced card system for testing
const testEnhancedCardSystem = {
  async createEnhancedCardBatch(adminUserId, totalCards = 10, distributionPlan) {
    try {
      const timestamp = Date.now();
      const batchNumber = `MOB-${timestamp.toString().slice(-8)}`;

      const { data: batch, error: batchError } = await supabase
        .from('card_batches')
        .insert({
          batch_number: batchNumber,
          total_cards: totalCards,
          created_by: adminUserId
        })
        .select()
        .single();

      if (batchError) throw batchError;

      const generatedCards = [];

      for (let i = 1; i <= totalCards; i++) {
        const controlNumber = `MOC-${timestamp.toString().slice(-8)}-${i.toString().padStart(3, '0')}`;
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
        const perks = ['consultation', 'cleaning', 'extraction', 'fluoride', 'whitening', 'xray', 'denture', 'braces'];
        for (const perk of perks) {
          await supabase
            .from('card_perks')
            .insert({
              card_id: card.id,
              perk_type: perk,
              claimed: false
            });
        }

        // Log transaction
        await supabase
          .from('card_transactions')
          .insert({
            card_id: card.id,
            transaction_type: 'created',
            performed_by: 'admin',
            performed_by_id: adminUserId
          });

        generatedCards.push({
          ...card,
          incomplete_passcode: incompletePasscode,
          batch_number: batchNumber,
          card_metadata: {
            batch_creation_date: new Date().toISOString(),
            card_position_in_batch: i,
            total_perks_count: 8,
            initial_perks: perks,
            validity_period_months: 12
          }
        });
      }

      return {
        batch: { ...batch, cards_generated: totalCards },
        cards: generatedCards
      };

    } catch (error) {
      console.error('Error creating enhanced card batch:', error);
      throw error;
    }
  }
};

async function testFixedSystem() {
  console.log('🧪 Testing Fixed Enhanced Card System\n');

  try {
    const adminUserId = '609e400b-27bf-476a-a5f5-7d793d85293f';

    console.log('Testing batch generation...');
    const result = await testEnhancedCardSystem.createEnhancedCardBatch(adminUserId, 5, 'ui_test');

    console.log('✅ SUCCESS!');
    console.log(`📦 Batch: ${result.batch.batch_number}`);
    console.log(`🎫 Cards: ${result.cards.length} generated`);

    result.cards.forEach((card, index) => {
      console.log(`   Card ${index + 1}: ${card.control_number} / ${card.incomplete_passcode} → CAV${card.incomplete_passcode}`);
    });

    console.log('\n🎯 Enhanced Cards UI should now work!');

    // Keep data for UI testing
    console.log(`💾 Test data preserved (Batch: ${result.batch.batch_number})`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFixedSystem();