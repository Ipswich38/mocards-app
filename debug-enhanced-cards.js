#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEnhancedCards() {
  console.log('🔍 Debugging Enhanced Card Generation Issue\n');

  try {
    // 1. Check if admin user exists
    console.log('1️⃣ Checking Admin User...');
    const adminUserId = '609e400b-27bf-476a-a5f5-7d793d85293f';

    const { data: admin, error: adminError } = await supabase
      .from('mocards_admin_users')
      .select('id, username')
      .eq('id', adminUserId)
      .single();

    if (adminError) {
      console.error('❌ Admin error:', adminError);
      return;
    }
    console.log('✅ Admin found:', admin.username);

    // 2. Test simple batch creation
    console.log('\n2️⃣ Testing Simple Batch Creation...');

    const timestamp = Date.now();
    const batchNumber = `DBG${timestamp.toString().slice(-6)}`;

    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert({
        batch_number: batchNumber,
        total_cards: 3,
        created_by: adminUserId
      })
      .select()
      .single();

    if (batchError) {
      console.error('❌ Batch creation error:', batchError);
      return;
    }
    console.log('✅ Batch created:', batch.batch_number);

    // 3. Test card creation with enhanced system
    console.log('\n3️⃣ Testing Enhanced Card Creation...');

    for (let i = 1; i <= 3; i++) {
      const controlNumber = `DBG${timestamp.toString().slice(-4)}${i}`;
      const incompletePasscode = Math.random().toString().slice(2, 6).padStart(4, '0');

      console.log(`Creating card ${i}: ${controlNumber} / ${incompletePasscode}`);

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

      if (cardError) {
        console.error(`❌ Card ${i} creation error:`, cardError);
        continue;
      }

      // Create perks
      const perks = ['consultation', 'cleaning', 'extraction', 'fluoride'];
      for (const perk of perks) {
        const { error: perkError } = await supabase
          .from('card_perks')
          .insert({
            card_id: card.id,
            perk_type: perk,
            claimed: false
          });

        if (perkError) {
          console.error(`❌ Perk creation error for ${perk}:`, perkError);
        }
      }

      console.log(`✅ Card ${i} created successfully`);
    }

    // 4. Test enhanced card system function
    console.log('\n4️⃣ Testing Enhanced Card System Function...');

    try {
      // Test the actual enhanced card system function
      const { enhancedCardSystem } = await import('./src/lib/enhanced-card-system.ts');

      const result = await enhancedCardSystem.createEnhancedCardBatch(adminUserId, 2, 'debug_test');
      console.log('✅ Enhanced card system works!');
      console.log('Generated:', result.cards.length, 'cards');

      // Cleanup the test batch
      await supabase.from('card_perks').delete().in('card_id', result.cards.map(c => c.id));
      await supabase.from('cards').delete().eq('batch_id', result.batch.id);
      await supabase.from('card_batches').delete().eq('id', result.batch.id);
      console.log('✅ Test batch cleaned up');

    } catch (enhancedError) {
      console.error('❌ Enhanced card system error:', enhancedError);
    }

    // Cleanup debug batch
    console.log('\n🧹 Cleaning up debug data...');
    const cardIds = await supabase
      .from('cards')
      .select('id')
      .eq('batch_id', batch.id);

    if (cardIds.data) {
      await supabase.from('card_perks').delete().in('card_id', cardIds.data.map(c => c.id));
    }
    await supabase.from('cards').delete().eq('batch_id', batch.id);
    await supabase.from('card_batches').delete().eq('id', batch.id);
    console.log('✅ Debug data cleaned up');

    console.log('\n🎯 Debug Complete - Check Enhanced Cards UI');

  } catch (error) {
    console.error('💥 Debug error:', error);
  }
}

debugEnhancedCards();