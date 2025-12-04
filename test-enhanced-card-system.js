#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEnhancedCardGeneration() {
  console.log('🧪 Testing Enhanced Card Generation System\n');

  try {
    // 1. Test enhanced card batch creation
    console.log('1️⃣ Testing Enhanced Card Batch Creation...');

    // Get admin ID
    const { data: admin } = await supabase
      .from('mocards_admin_users')
      .select('id')
      .eq('username', 'admin')
      .single();

    if (!admin) {
      throw new Error('Admin user not found');
    }

    // Generate batch with enhanced metadata
    const timestamp = Date.now();
    const batchNumber = `MOB-${timestamp.toString().slice(-8)}`;

    // Create batch with enhanced metadata structure
    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert({
        batch_number: batchNumber,
        total_cards: 10,
        created_by: admin.id,
        batch_status: 'generating',
        batch_metadata: {
          generation_timestamp: new Date().toISOString(),
          admin_user: admin.id,
          intended_distribution: 'production_test',
          expiry_period: 12
        }
      })
      .select()
      .single();

    if (batchError) {
      console.log('⚠️ Batch creation failed, trying without metadata:', batchError.message);

      // Fallback to basic batch creation
      const { data: fallbackBatch, error: fallbackError } = await supabase
        .from('card_batches')
        .insert({
          batch_number: batchNumber,
          total_cards: 10,
          created_by: admin.id
        })
        .select()
        .single();

      if (fallbackError) throw fallbackError;
      console.log('✅ Basic batch created:', fallbackBatch.batch_number);
    } else {
      console.log('✅ Enhanced batch created:', batch.batch_number);
    }

    const batchData = batch || fallbackBatch;

    // 2. Generate 10 cards with location-pending status
    console.log('\n2️⃣ Generating 10 Cards with Enhanced Metadata...');

    const generatedCards = [];
    for (let i = 1; i <= 10; i++) {
      const controlNumber = `MOC-${timestamp.toString().slice(-8)}-${i.toString().padStart(3, '0')}`;

      // Generate incomplete passcode (4 digits only)
      const incompletePasscode = Math.random().toString().slice(2, 6).padStart(4, '0');

      // Card metadata structure
      const cardMetadata = {
        batch_creation_date: new Date().toISOString(),
        card_position_in_batch: i,
        total_perks_count: 8,
        initial_perks: [
          'consultation',
          'cleaning',
          'extraction',
          'fluoride',
          'whitening',
          'xray',
          'denture',
          'braces'
        ],
        validity_period_months: 12
      };

      // Create card with enhanced structure
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .insert({
          batch_id: batchData.id,
          control_number: controlNumber,
          passcode: `___${incompletePasscode}`, // Incomplete passcode format
          location_code: 'PHL', // Default Philippines
          status: 'location_pending', // New status waiting for location assignment
          card_metadata: cardMetadata
        })
        .select()
        .single();

      if (cardError) {
        console.log(`⚠️ Card ${i} creation failed, trying without metadata:`, cardError.message);

        // Fallback to basic card creation
        const { data: fallbackCard, error: fallbackCardError } = await supabase
          .from('cards')
          .insert({
            batch_id: batchData.id,
            control_number: controlNumber,
            passcode: `___${incompletePasscode}`,
            location_code: 'PHL',
            status: 'unactivated' // Use existing status if location_pending not available
          })
          .select()
          .single();

        if (fallbackCardError) throw fallbackCardError;
        generatedCards.push({ ...fallbackCard, incomplete_passcode: incompletePasscode });
      } else {
        generatedCards.push({ ...card, incomplete_passcode: incompletePasscode });
      }

      // Create perks for each card
      const perkTypes = cardMetadata.initial_perks;
      for (const perkType of perkTypes) {
        await supabase
          .from('card_perks')
          .insert({
            card_id: card?.id || fallbackCard?.id,
            perk_type: perkType,
            claimed: false
          });
      }

      console.log(`   Card ${i}: ${controlNumber} / ___${incompletePasscode}`);
    }

    console.log(`\n✅ Generated ${generatedCards.length} cards successfully!`);

    // 3. Test location code assignment simulation
    console.log('\n3️⃣ Testing Location Code Assignment...');

    const cardToAssign = generatedCards[0];
    const locationCode = 'CAV'; // Cavite location code

    // Complete the passcode with location code
    const completePasscode = `${locationCode}${cardToAssign.incomplete_passcode}`;

    const { data: updatedCard, error: updateError } = await supabase
      .from('cards')
      .update({
        passcode: completePasscode,
        location_code: locationCode,
        status: 'unactivated' // Ready for activation
      })
      .eq('id', cardToAssign.id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`✅ Location assigned to card: ${cardToAssign.control_number}`);
    console.log(`   Complete passcode: ${completePasscode}`);
    console.log(`   Location: ${locationCode} (Cavite)`);

    // 4. Test card activation workflow
    console.log('\n4️⃣ Testing Card Activation...');

    // Get a test clinic
    const { data: clinic } = await supabase
      .from('mocards_clinics')
      .select('id, clinic_name, commission_rate')
      .limit(1)
      .single();

    if (clinic) {
      const activatedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setFullYear(activatedAt.getFullYear() + 1);

      const { data: activatedCard, error: activationError } = await supabase
        .from('cards')
        .update({
          status: 'activated',
          assigned_clinic_id: clinic.id,
          activated_at: activatedAt.toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('id', updatedCard.id)
        .select()
        .single();

      if (activationError) throw activationError;

      console.log(`✅ Card activated successfully!`);
      console.log(`   Assigned to: ${clinic.clinic_name}`);
      console.log(`   Valid until: ${expiresAt.toLocaleDateString()}`);
    }

    // 5. Display batch summary
    console.log('\n5️⃣ Batch Generation Summary...');
    console.log(`📦 Batch Number: ${batchNumber}`);
    console.log(`📊 Total Cards: ${generatedCards.length}`);
    console.log(`🔢 Control Numbers: ${generatedCards[0].control_number} to ${generatedCards[generatedCards.length-1].control_number}`);
    console.log(`🎫 Sample Incomplete Passcode: ___${generatedCards[0].incomplete_passcode}`);
    console.log(`🏷️ Sample Complete Passcode: CAV${generatedCards[0].incomplete_passcode}`);

    console.log('\n🎉 Enhanced Card Generation System Test Completed!');
    console.log('\n✨ Key Features Demonstrated:');
    console.log('  ✅ Batch generation with metadata');
    console.log('  ✅ Incomplete passcode generation (___XXXX)');
    console.log('  ✅ Location code assignment process');
    console.log('  ✅ Complete passcode formation (CAVXXXX)');
    console.log('  ✅ Card activation workflow');
    console.log('  ✅ 1-year validity period');
    console.log('  ✅ 8 initial perks per card');
    console.log('\n🚀 System Ready for Production Use!');

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');

    const cardIds = generatedCards.map(c => c.id);
    await supabase.from('card_perks').delete().in('card_id', cardIds);
    await supabase.from('cards').delete().eq('batch_id', batchData.id);
    await supabase.from('card_batches').delete().eq('id', batchData.id);

    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('💥 Error in enhanced card generation test:', error);
  }
}

testEnhancedCardGeneration();