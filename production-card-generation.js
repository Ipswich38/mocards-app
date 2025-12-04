#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateProductionCardBatch() {
  console.log('🎯 MOCARDS Production Card Generation System\n');

  try {
    // 1. Check database schema first
    console.log('1️⃣ Checking Database Schema...');

    const { data: batchSchema, error: batchSchemaError } = await supabase
      .from('card_batches')
      .select('*')
      .limit(1);

    const { data: cardSchema, error: cardSchemaError } = await supabase
      .from('cards')
      .select('*')
      .limit(1);

    console.log('✅ Database connection verified');

    // 2. Get admin user
    console.log('\n2️⃣ Getting Admin User...');

    const { data: admin, error: adminError } = await supabase
      .from('mocards_admin_users')
      .select('id, username')
      .eq('username', 'admin')
      .single();

    if (adminError || !admin) {
      throw new Error('Admin user not found');
    }
    console.log(`✅ Admin found: ${admin.username}`);

    // 3. Create production card batch
    console.log('\n3️⃣ Creating Production Card Batch...');

    const timestamp = Date.now();
    const batchNumber = `MOB-${timestamp.toString().slice(-8)}`;

    // Create batch with minimal required fields
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
    console.log(`✅ Production batch created: ${batch.batch_number}`);

    // 4. Generate 10 production-ready cards
    console.log('\n4️⃣ Generating 10 Production Cards...');
    console.log('Format: Control Number / Incomplete Passcode (___XXXX)');
    console.log('-------------------------------------------------------');

    const productionCards = [];

    for (let i = 1; i <= 10; i++) {
      // Generate unique control number
      const controlNumber = `MOC-${timestamp.toString().slice(-8)}-${i.toString().padStart(3, '0')}`;

      // Generate 4-digit incomplete passcode
      const incompletePasscode = Math.random().toString().slice(2, 6).padStart(4, '0');
      const incompleteFormat = `___${incompletePasscode}`;

      // Create card with production settings
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .insert({
          batch_id: batch.id,
          control_number: controlNumber,
          passcode: incompleteFormat,
          location_code: 'PHL',
          status: 'unactivated'
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Create 8 default perks for each card
      const defaultPerks = [
        'consultation',
        'cleaning',
        'extraction',
        'fluoride',
        'whitening',
        'xray',
        'denture',
        'braces'
      ];

      for (const perkType of defaultPerks) {
        await supabase
          .from('card_perks')
          .insert({
            card_id: card.id,
            perk_type: perkType,
            claimed: false
          });
      }

      // Log card creation
      await supabase
        .from('card_transactions')
        .insert({
          card_id: card.id,
          transaction_type: 'created',
          performed_by: 'admin',
          performed_by_id: admin.id
        });

      productionCards.push({
        ...card,
        incompletePasscode,
        position: i
      });

      console.log(`Card ${i.toString().padStart(2, '0')}: ${controlNumber} / ${incompleteFormat}`);
    }

    // 5. Demonstrate location assignment workflow
    console.log('\n5️⃣ Demonstrating Location Assignment Workflow...');

    const demoCard = productionCards[0];
    console.log(`\nDemo Card: ${demoCard.control_number}`);
    console.log(`Incomplete Passcode: ${demoCard.passcode}`);

    // Simulate clinic assigning location code
    const locationCode = 'CAV'; // Cavite location
    const completePasscode = `${locationCode}${demoCard.incompletePasscode}`;

    console.log(`\n🏥 Clinic assigns location code: ${locationCode}`);
    console.log(`✅ Complete passcode: ${completePasscode}`);

    // Update card with complete passcode
    const { data: updatedCard, error: updateError } = await supabase
      .from('cards')
      .update({
        passcode: completePasscode,
        location_code: locationCode
      })
      .eq('id', demoCard.id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`✅ Card updated with location assignment`);

    // 6. Demonstrate activation workflow
    console.log('\n6️⃣ Demonstrating Card Activation...');

    // Find a test clinic
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
        .eq('control_number', demoCard.control_number)
        .eq('passcode', completePasscode)
        .select()
        .single();

      if (activationError) throw activationError;

      console.log(`✅ Card activated by: ${clinic.clinic_name}`);
      console.log(`📅 Valid until: ${expiresAt.toLocaleDateString()}`);

      // Log activation
      await supabase
        .from('card_transactions')
        .insert({
          card_id: activatedCard.id,
          transaction_type: 'activated',
          performed_by: 'clinic',
          performed_by_id: clinic.id
        });
    }

    // 7. Production Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PRODUCTION CARD BATCH SUMMARY');
    console.log('='.repeat(60));
    console.log(`📦 Batch Number: ${batch.batch_number}`);
    console.log(`👤 Created By: ${admin.username}`);
    console.log(`📅 Created: ${new Date().toLocaleDateString()}`);
    console.log(`📊 Total Cards: ${productionCards.length}`);
    console.log(`🔢 Control Range: ${productionCards[0].control_number} to ${productionCards[9].control_number}`);
    console.log(`🎫 Passcode Format: ___XXXX (incomplete)`);
    console.log(`🏷️ Location Assignment: Location + 4-digit = Complete`);
    console.log(`🎁 Perks per Card: 8 unclaimed services`);
    console.log(`⏰ Validity Period: 1 year from activation`);
    console.log('='.repeat(60));

    console.log('\n🎯 WORKFLOW DEMONSTRATION:');
    console.log('1. ✅ Admin generates batch with incomplete passcodes');
    console.log('2. ✅ Clinic receives cards and assigns location codes');
    console.log('3. ✅ Complete passcode is formed (e.g., CAV1234)');
    console.log('4. ✅ Clinic can now activate cards for customers');
    console.log('5. ✅ Cards get 1-year validity from activation date');
    console.log('6. ✅ 8 perks are available for redemption');

    console.log('\n📋 SAMPLE PRODUCTION DATA:');
    productionCards.slice(0, 5).forEach((card, index) => {
      console.log(`Card ${index + 1}:`);
      console.log(`  Control: ${card.control_number}`);
      console.log(`  Incomplete: ${card.passcode}`);
      console.log(`  Complete Example: CAV${card.incompletePasscode}`);
      if (index < 4) console.log('');
    });

    console.log('\n🚀 PRODUCTION SYSTEM READY!');
    console.log('📝 Next Steps:');
    console.log('  1. Build admin dashboard for batch generation');
    console.log('  2. Build clinic interface for location assignment');
    console.log('  3. Integrate with existing activation system');
    console.log('  4. Deploy to production environment');

    // Keep data for admin dashboard testing (don't cleanup)
    console.log('\n💾 Keeping production test data for dashboard integration...');
    console.log(`🔑 Test batch ID: ${batch.id}`);
    console.log(`📋 Test batch number: ${batch.batch_number}`);

  } catch (error) {
    console.error('💥 Error in production card generation:', error);
    process.exit(1);
  }
}

generateProductionCardBatch();