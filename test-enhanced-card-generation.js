#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateEnhancedCardBatch() {
  console.log('🎯 Production-Ready Enhanced Card Generation System\n');

  try {
    // 1. Get admin user for batch creation
    console.log('1️⃣ Getting Admin User...');

    const { data: admin } = await supabase
      .from('mocards_admin_users')
      .select('id, username')
      .eq('username', 'admin')
      .single();

    if (!admin) {
      throw new Error('Admin user not found');
    }
    console.log(`✅ Admin found: ${admin.username}`);

    // 2. Create enhanced card batch
    console.log('\n2️⃣ Creating Enhanced Card Batch...');

    const timestamp = Date.now();
    const batchNumber = `MOB-${timestamp.toString().slice(-8)}`;

    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert({
        batch_number: batchNumber,
        total_cards: 10,
        created_by: admin.id,
        batch_status: 'generating'
      })
      .select()
      .single();

    if (batchError) throw batchError;
    console.log(`✅ Batch created: ${batch.batch_number}`);

    // 3. Generate 10 enhanced cards
    console.log('\n3️⃣ Generating 10 Enhanced Cards...');

    const generatedCards = [];

    for (let i = 1; i <= 10; i++) {
      // Generate unique control number
      const controlNumber = `MOC-${timestamp.toString().slice(-8)}-${i.toString().padStart(3, '0')}`;

      // Generate 4-digit incomplete passcode (___XXXX format)
      const incompletePasscode = Math.random().toString().slice(2, 6).padStart(4, '0');
      const incompleteFormat = `___${incompletePasscode}`;

      // Create card record
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .insert({
          batch_id: batch.id,
          control_number: controlNumber,
          passcode: incompleteFormat, // Format: ___XXXX
          location_code: 'PHL', // Default Philippines
          status: 'unactivated' // Will be location_pending in enhanced version
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Create 8 initial perks for each card
      const perkTypes = [
        'consultation',
        'cleaning',
        'extraction',
        'fluoride',
        'whitening',
        'xray',
        'denture',
        'braces'
      ];

      for (const perkType of perkTypes) {
        await supabase
          .from('card_perks')
          .insert({
            card_id: card.id,
            perk_type: perkType,
            claimed: false
          });
      }

      // Log card creation transaction
      await supabase
        .from('card_transactions')
        .insert({
          card_id: card.id,
          transaction_type: 'created',
          performed_by: 'admin',
          performed_by_id: admin.id,
          details: {
            batch_number: batch.batch_number,
            card_position: i,
            incomplete_passcode: incompletePasscode,
            creation_method: 'enhanced_batch_generation'
          }
        });

      generatedCards.push({
        ...card,
        incomplete_passcode: incompletePasscode,
        position: i
      });

      console.log(`   Card ${i}: ${controlNumber} / ${incompleteFormat}`);
    }

    // 4. Update batch status
    await supabase
      .from('card_batches')
      .update({
        batch_status: 'completed',
        cards_generated: 10
      })
      .eq('id', batch.id);

    console.log('\n4️⃣ Simulating Location Code Assignment...');

    // Test location assignment on first card
    const testCard = generatedCards[0];
    const locationCode = 'CAV'; // Cavite clinic
    const completePasscode = `${locationCode}${testCard.incomplete_passcode}`;

    const { data: assignedCard, error: assignError } = await supabase
      .from('cards')
      .update({
        passcode: completePasscode,
        location_code: locationCode,
        status: 'unactivated' // Ready for clinic activation
      })
      .eq('id', testCard.id)
      .select()
      .single();

    if (assignError) throw assignError;

    console.log(`✅ Location assigned to: ${testCard.control_number}`);
    console.log(`   Complete passcode: ${completePasscode}`);
    console.log(`   Location: ${locationCode} (Cavite)`);

    // 5. Test card activation by clinic
    console.log('\n5️⃣ Testing Card Activation...');

    // Get test clinic
    const { data: clinic } = await supabase
      .from('mocards_clinics')
      .select('id, clinic_name')
      .limit(1)
      .single();

    if (clinic) {
      const activatedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setFullYear(activatedAt.getFullYear() + 1); // 1-year validity

      const { data: activatedCard, error: activationError } = await supabase
        .from('cards')
        .update({
          status: 'activated',
          assigned_clinic_id: clinic.id,
          activated_at: activatedAt.toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('control_number', testCard.control_number)
        .eq('passcode', completePasscode)
        .select()
        .single();

      if (activationError) throw activationError;

      console.log(`✅ Card activated successfully!`);
      console.log(`   Assigned to: ${clinic.clinic_name}`);
      console.log(`   Valid until: ${expiresAt.toLocaleDateString()}`);

      // Record activation transaction
      await supabase
        .from('card_transactions')
        .insert({
          card_id: activatedCard.id,
          transaction_type: 'activated',
          performed_by: 'clinic',
          performed_by_id: clinic.id,
          details: {
            activation_date: activatedAt.toISOString(),
            expiry_date: expiresAt.toISOString(),
            complete_passcode: completePasscode,
            location_code: locationCode
          }
        });
    }

    // 6. Generate batch report
    console.log('\n6️⃣ Enhanced Card Batch Report...');
    console.log('==========================================');
    console.log(`📦 Batch Number: ${batch.batch_number}`);
    console.log(`👤 Created By: Admin (${admin.id})`);
    console.log(`📅 Created: ${new Date().toISOString()}`);
    console.log(`📊 Total Cards: ${generatedCards.length}`);
    console.log(`🎫 Card Range: ${generatedCards[0].control_number} - ${generatedCards[9].control_number}`);
    console.log(`🔢 Passcode Format: ___XXXX (4-digit incomplete)`);
    console.log(`🏷️ Location Assignment: CAV + 4-digit = Complete passcode`);
    console.log(`🎁 Perks per Card: 8 unclaimed perks`);
    console.log(`⏰ Validity: 1 year from activation`);
    console.log('==========================================');

    console.log('\n✨ Sample Card Details:');
    generatedCards.slice(0, 3).forEach((card, index) => {
      console.log(`   Card ${index + 1}:`);
      console.log(`     Control: ${card.control_number}`);
      console.log(`     Incomplete: ___${card.incomplete_passcode}`);
      console.log(`     Complete (CAV): CAV${card.incomplete_passcode}`);
      console.log(`     Status: ${card.status}`);
      console.log('');
    });

    console.log('🎯 Enhanced Card Generation Workflow Complete!');
    console.log('\n🔧 Production Features Implemented:');
    console.log('  ✅ Unique batch generation');
    console.log('  ✅ Incomplete passcode system (___XXXX)');
    console.log('  ✅ Location code assignment process');
    console.log('  ✅ Complete passcode formation (e.g., CAV1234)');
    console.log('  ✅ Card activation with 1-year validity');
    console.log('  ✅ Transaction logging');
    console.log('  ✅ 8 perks per card');
    console.log('  ✅ Batch status tracking');

    console.log('\n🚀 System Ready for Admin Dashboard Integration!');

    // Cleanup test data for clean state
    console.log('\n🧹 Cleaning up test data...');
    const cardIds = generatedCards.map(c => c.id);
    await supabase.from('card_transactions').delete().in('card_id', cardIds);
    await supabase.from('card_perks').delete().in('card_id', cardIds);
    await supabase.from('cards').delete().eq('batch_id', batch.id);
    await supabase.from('card_batches').delete().eq('id', batch.id);
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('💥 Error in enhanced card generation:', error);
    process.exit(1);
  }
}

generateEnhancedCardBatch();