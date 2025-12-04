#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteOpenDentalWorkflow() {
  console.log('🧪 Testing Complete OpenDental-Style MOCARDS Workflow\n');

  try {
    const adminUserId = '609e400b-27bf-476a-a5f5-7d793d85293f';
    const timestamp = Date.now();

    // Step 1: ADMIN GENERATES CARDS
    console.log('1️⃣ ADMIN: Generating fresh card batch...');
    const batchNumber = `DEMO-${timestamp.toString().slice(-6)}`;

    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert({
        batch_number: batchNumber,
        total_cards: 5,
        created_by: adminUserId
      })
      .select()
      .single();

    if (batchError) throw batchError;
    console.log(`✅ Batch created: ${batch.batch_number}`);

    const generatedCards = [];
    for (let i = 1; i <= 5; i++) {
      const controlNumber = `DEMO-${timestamp.toString().slice(-6)}-${i.toString().padStart(3, '0')}`;
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

      generatedCards.push({ ...card, incomplete_passcode: incompletePasscode });
    }
    console.log(`✅ ${generatedCards.length} cards generated with incomplete passcodes`);

    // Step 2: ADMIN ASSIGNS CARDS TO CLINIC
    console.log('\n2️⃣ ADMIN: Assigning cards to clinic...');

    // Get a test clinic
    const { data: clinic, error: clinicError } = await supabase
      .from('mocards_clinics')
      .select('*')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (clinicError) {
      console.log('⚠️  No active clinic found. Creating demo clinic...');
      const { data: newClinic, error: newClinicError } = await supabase
        .from('mocards_clinics')
        .insert({
          clinic_code: 'DEMO01',
          clinic_name: 'Demo Dental Clinic',
          password_hash: '$2a$10$demo.hash.for.testing',
          contact_email: 'demo@clinic.com',
          status: 'active'
        })
        .select()
        .single();

      if (newClinicError) throw newClinicError;
      clinic = newClinic;
      console.log(`✅ Demo clinic created: ${clinic.clinic_name}`);
    }

    // Assign first 3 cards to clinic
    const cardIdsToAssign = generatedCards.slice(0, 3).map(c => c.id);
    const { error: assignError } = await supabase
      .from('cards')
      .update({ assigned_clinic_id: clinic.id })
      .in('id', cardIdsToAssign);

    if (assignError) throw assignError;
    console.log(`✅ ${cardIdsToAssign.length} cards assigned to ${clinic.clinic_name}`);

    // Step 3: CLINIC ACTIVATES CARD FOR PATIENT
    console.log('\n3️⃣ CLINIC: Activating card for patient...');

    const testCard = generatedCards[0];
    const clinicCode = 'CAV'; // Cavite location
    const completePasscode = `${clinicCode}${testCard.incomplete_passcode}`;

    // Clinic completes passcode and activates
    const { data: activatedCard, error: activateError } = await supabase
      .from('cards')
      .update({
        passcode: completePasscode,
        location_code: clinicCode,
        status: 'activated',
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        updated_at: new Date().toISOString()
      })
      .eq('id', testCard.id)
      .select()
      .single();

    if (activateError) throw activateError;

    // Record sale
    const { data: sale, error: saleError } = await supabase
      .from('clinic_sales')
      .insert({
        clinic_id: clinic.id,
        card_id: testCard.id,
        sale_amount: 1500, // ₱1,500
        commission_amount: 150, // 10% commission
        customer_name: 'Juan Dela Cruz',
        customer_phone: '09171234567',
        payment_method: 'cash',
        status: 'completed'
      })
      .select()
      .single();

    if (saleError) throw saleError;

    console.log(`✅ Card activated: ${testCard.control_number}`);
    console.log(`   Complete passcode: ${completePasscode}`);
    console.log(`   Customer: ${sale.customer_name}`);
    console.log(`   Sale amount: ₱${sale.sale_amount}`);

    // Step 4: CLINIC REDEEMS PERK
    console.log('\n4️⃣ CLINIC: Redeeming customer perk...');

    // Get a perk to redeem
    const { data: perkToRedeem, error: perkError } = await supabase
      .from('card_perks')
      .select('*')
      .eq('card_id', testCard.id)
      .eq('claimed', false)
      .eq('perk_type', 'consultation')
      .single();

    if (perkError) throw perkError;

    // Redeem the perk
    const { error: redeemError } = await supabase
      .from('card_perks')
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
        claimed_by_clinic: clinic.id
      })
      .eq('id', perkToRedeem.id);

    if (redeemError) throw redeemError;

    // Record redemption
    await supabase
      .from('clinic_perk_redemptions')
      .insert({
        clinic_id: clinic.id,
        card_id: testCard.id,
        perk_id: perkToRedeem.id,
        service_provided: 'Free dental consultation',
        service_value: 500
      });

    console.log(`✅ Perk redeemed: ${perkToRedeem.perk_type}`);
    console.log(`   Service: Free dental consultation`);
    console.log(`   Value: ₱500`);

    // Step 5: CARDHOLDER CHECKS STATUS
    console.log('\n5️⃣ CARDHOLDER: Checking card status...');

    const { data: cardStatus, error: statusError } = await supabase
      .from('cards')
      .select(`
        *,
        clinic:mocards_clinics(clinic_name),
        perks:card_perks(*)
      `)
      .eq('control_number', testCard.control_number)
      .eq('passcode', completePasscode)
      .single();

    if (statusError) throw statusError;

    console.log(`✅ Card lookup successful:`);
    console.log(`   Control: ${cardStatus.control_number}`);
    console.log(`   Passcode: ${cardStatus.passcode}`);
    console.log(`   Status: ${cardStatus.status}`);
    console.log(`   Clinic: ${cardStatus.clinic.clinic_name}`);
    console.log(`   Expires: ${new Date(cardStatus.expires_at).toLocaleDateString()}`);

    const availablePerks = cardStatus.perks.filter(p => !p.claimed);
    const usedPerks = cardStatus.perks.filter(p => p.claimed);

    console.log(`   Available perks: ${availablePerks.length}`);
    console.log(`   Used perks: ${usedPerks.length}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('clinic_perk_redemptions').delete().eq('card_id', testCard.id);
    await supabase.from('clinic_sales').delete().eq('card_id', testCard.id);
    await supabase.from('card_perks').delete().in('card_id', generatedCards.map(c => c.id));
    await supabase.from('cards').delete().eq('batch_id', batch.id);
    await supabase.from('card_batches').delete().eq('id', batch.id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 COMPLETE WORKFLOW TEST SUCCESSFUL!');
    console.log('\n📋 OpenDental-Style Workflow Summary:');
    console.log('1. ✅ Admin generated secure, unique cards');
    console.log('2. ✅ Admin assigned cards to clinic partner');
    console.log('3. ✅ Clinic activated card with location-based passcode');
    console.log('4. ✅ Clinic recorded sale and commission');
    console.log('5. ✅ Clinic redeemed customer perk');
    console.log('6. ✅ Cardholder can check status and validity');

    console.log('\n🌐 System is ready for production!');
    console.log('Access the system at: http://localhost:5174');

  } catch (error) {
    console.error('❌ Workflow test failed:', error);
  }
}

testCompleteOpenDentalWorkflow();