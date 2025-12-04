#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSimpleCardBatch() {
  console.log('🎯 Simple MOCARDS Production Card Generation\n');

  try {
    // Get admin user
    const { data: admin } = await supabase
      .from('mocards_admin_users')
      .select('id')
      .eq('username', 'admin')
      .single();

    if (!admin) throw new Error('Admin not found');

    // Create batch with shorter name
    const batchNumber = `MB${Date.now().toString().slice(-6)}`;

    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert({
        batch_number: batchNumber,
        total_cards: 10,
        created_by: admin.id
      })
      .select()
      .single();

    if (batchError) throw batchError;
    console.log(`✅ Batch created: ${batch.batch_number}`);

    // Generate cards with enhanced passcode system
    console.log('\n🎫 Generating Cards with Location-Based Passcodes:');
    console.log('Format: Control / Incomplete (___XXXX) → Complete (CAVXXXX)');
    console.log('-'.repeat(60));

    const cards = [];
    for (let i = 1; i <= 10; i++) {
      // Shorter control number to avoid length issues
      const controlNumber = `MC${batchNumber.slice(-4)}${i.toString().padStart(2, '0')}`;

      // Generate 4-digit incomplete passcode
      const incompleteDigits = Math.random().toString().slice(2, 6).padStart(4, '0');
      const incompletePasscode = `___${incompleteDigits}`;

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
        console.log(`Error creating card ${i}:`, cardError);
        continue;
      }

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

      cards.push({
        ...card,
        incompleteDigits,
        completeExample: `CAV${incompleteDigits}`
      });

      console.log(`${i.toString().padStart(2, '0')}. ${controlNumber} / ${incompletePasscode} → CAV${incompleteDigits}`);
    }

    console.log('\n🎯 PRODUCTION WORKFLOW DEMONSTRATED:');
    console.log('===============================================');
    console.log(`📦 Batch: ${batch.batch_number}`);
    console.log(`📊 Cards: ${cards.length} generated`);
    console.log(`🔧 Format: ___XXXX (incomplete) → CAVXXXX (complete)`);
    console.log(`🏥 Process: Clinic assigns location code to activate`);
    console.log(`⏰ Validity: 1 year from activation`);

    console.log('\n✅ Enhanced Card System Features:');
    console.log('  🎫 Unique batch-based control numbers');
    console.log('  🔢 Location-based passcode completion');
    console.log('  🏷️ Clinic assignment before activation');
    console.log('  🎁 Default perks per card');
    console.log('  📝 Transaction logging');

    console.log('\n🚀 Ready for Admin Dashboard Integration!');

    // Show sample for testing
    if (cards.length > 0) {
      const sample = cards[0];
      console.log('\n📋 Sample for Testing:');
      console.log(`Control: ${sample.control_number}`);
      console.log(`Incomplete: ${sample.passcode}`);
      console.log(`Complete: CAV${sample.incompleteDigits}`);
      console.log(`Card ID: ${sample.id}`);
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

generateSimpleCardBatch();