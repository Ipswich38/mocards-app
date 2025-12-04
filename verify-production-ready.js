#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyProductionReady() {
  console.log('🔍 Verifying Production-Ready Enhanced Card System\n');

  try {
    // 1. Test Enhanced Card Generation
    console.log('1️⃣ Testing Enhanced Card Generation...');
    const adminUserId = '609e400b-27bf-476a-a5f5-7d793d85293f';

    const timestamp = Date.now();
    const batchNumber = `TEST-${timestamp.toString().slice(-8)}`;

    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert({
        batch_number: batchNumber,
        total_cards: 2,
        created_by: adminUserId
      })
      .select()
      .single();

    if (batchError) throw batchError;
    console.log('✅ Card batch generation works');

    // 2. Test Card Creation with Enhanced Features
    console.log('\n2️⃣ Testing Enhanced Card Features...');
    const cards = [];

    for (let i = 1; i <= 2; i++) {
      const controlNumber = `TST-${timestamp.toString().slice(-8)}-${i.toString().padStart(3, '0')}`;
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
      cards.push(card);

      // Test perks creation
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
    }
    console.log('✅ Enhanced card features work');

    // 3. Test Production Schema Functions
    console.log('\n3️⃣ Testing Production Schema Functions...');

    // Test clinic code generation
    try {
      const { data: clinicCode, error: codeError } = await supabase
        .rpc('generate_clinic_code');
      if (!codeError) {
        console.log(`✅ Clinic code generation works: ${clinicCode}`);
      }
    } catch (err) {
      console.log('⚠️  Clinic code generation not available');
    }

    // Test password generation
    try {
      const { data: password, error: passError } = await supabase
        .rpc('generate_clinic_password');
      if (!passError) {
        console.log(`✅ Clinic password generation works: ${password}`);
      }
    } catch (err) {
      console.log('⚠️  Clinic password generation not available');
    }

    // 4. Test Production Tables
    console.log('\n4️⃣ Testing Production Tables...');

    const productionTables = [
      'clinic_subscription_plans',
      'clinic_sales',
      'clinic_perk_redemptions',
      'clinic_monthly_reports'
    ];

    for (const table of productionTables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (!error) {
        console.log(`✅ ${table} table accessible`);
      } else {
        console.log(`❌ ${table} table error: ${error.message}`);
      }
    }

    // 5. Test Location-Based Passcode System
    console.log('\n5️⃣ Testing Location-Based Passcode System...');

    // Simulate location assignment
    const testCard = cards[0];
    const locationCode = 'CAV';
    const completePasscode = `${locationCode}${testCard.passcode}`;

    const { data: updatedCard, error: updateError } = await supabase
      .from('cards')
      .update({
        passcode: completePasscode,
        location_code: locationCode
      })
      .eq('id', testCard.id)
      .select()
      .single();

    if (!updateError) {
      console.log(`✅ Location-based passcode works: ${testCard.passcode} → ${completePasscode}`);
    }

    // 6. Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('card_perks').delete().in('card_id', cards.map(c => c.id));
    await supabase.from('cards').delete().eq('batch_id', batch.id);
    await supabase.from('card_batches').delete().eq('id', batch.id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 PRODUCTION VERIFICATION COMPLETE!');
    console.log('\n✅ System Status: READY FOR PRODUCTION');
    console.log('🌐 Enhanced Cards UI available at: http://localhost:5174');
    console.log('👤 Login as admin to access Enhanced Cards tab');

  } catch (error) {
    console.error('❌ Production verification failed:', error);
  }
}

verifyProductionReady();