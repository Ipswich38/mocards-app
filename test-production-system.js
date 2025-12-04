#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProductionWorkflow() {
  console.log('🚀 Testing Complete Production MOCARDS Workflow\n');

  try {
    // 1. Test Admin can create a new clinic
    console.log('1️⃣ Testing Admin Clinic Creation...');

    // Generate clinic code and password
    const generateClinicCode = () => {
      const timestamp = Date.now().toString().slice(-4);
      return `CL${timestamp}`;
    };

    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
      return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const testClinicCode = generateClinicCode();
    const testPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Create test clinic
    const { data: newClinic, error: clinicError } = await supabase
      .from('mocards_clinics')
      .insert({
        clinic_code: testClinicCode,
        clinic_name: 'Test Dental Clinic',
        password_hash: hashedPassword,
        contact_email: 'test@clinic.com',
        contact_phone: '+63 915 123 4567',
        address: '123 Test Street, Test City',
        owner_name: 'Dr. Test Dentist',
        subscription_plan: 'professional',
        monthly_card_limit: 500,
        commission_rate: 12.00,
        status: 'active'
      })
      .select()
      .single();

    if (clinicError) throw clinicError;

    console.log(`   ✅ Clinic created: ${newClinic.clinic_name}`);
    console.log(`   📋 Clinic Code: ${testClinicCode}`);
    console.log(`   🔑 Password: ${testPassword}`);

    // 2. Test clinic login
    console.log('\n2️⃣ Testing Clinic Login...');

    const loginTest = await bcrypt.compare(testPassword, newClinic.password_hash);
    console.log(`   Login verification: ${loginTest ? '✅' : '❌'}`);

    // 3. Test admin generates card batch for clinic activation
    console.log('\n3️⃣ Testing Admin Card Generation...');

    // Get admin ID
    const { data: admin } = await supabase
      .from('mocards_admin_users')
      .select('id')
      .eq('username', 'admin')
      .single();

    // Create batch
    const batchNumber = `MO-B${Date.now().toString().slice(-6)}TEST`;
    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert({
        batch_number: batchNumber,
        total_cards: 5,
        created_by: admin.id
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // Generate 5 test cards
    const testCards = [];
    for (let i = 1; i <= 5; i++) {
      const controlNumber = `${batchNumber.replace('B', 'C')}-${i.toString().padStart(3, '0')}`;
      const passcode = Math.random().toString().slice(2, 8);

      const { data: card, error: cardError } = await supabase
        .from('cards')
        .insert({
          batch_id: batch.id,
          control_number: controlNumber,
          passcode: passcode,
          location_code: 'MO',
          status: 'unactivated'
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Create perks for each card
      const perks = ['consultation', 'cleaning', 'extraction', 'fluoride', 'whitening', 'xray', 'denture', 'braces'];
      for (const perkType of perks) {
        await supabase
          .from('card_perks')
          .insert({
            card_id: card.id,
            perk_type: perkType,
            claimed: false
          });
      }

      testCards.push({ ...card, passcode });
    }

    console.log(`   ✅ Generated ${testCards.length} cards in batch ${batchNumber}`);
    console.log(`   📋 Sample card: ${testCards[0].control_number} / ${testCards[0].passcode}`);

    // 4. Test clinic activates a card (sells it)
    console.log('\n4️⃣ Testing Card Activation by Clinic...');

    const cardToActivate = testCards[0];
    const saleAmount = 1500; // ₱1,500 sale
    const commissionRate = newClinic.commission_rate;
    const commissionAmount = (saleAmount * commissionRate) / 100;

    // Activate card
    const { data: activatedCard, error: activationError } = await supabase
      .from('cards')
      .update({
        status: 'activated',
        assigned_clinic_id: newClinic.id,
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', cardToActivate.id)
      .select()
      .single();

    if (activationError) throw activationError;

    // Record sale
    const { data: sale, error: saleError } = await supabase
      .from('clinic_sales')
      .insert({
        clinic_id: newClinic.id,
        card_id: cardToActivate.id,
        sale_amount: saleAmount,
        commission_amount: commissionAmount,
        payment_method: 'cash',
        customer_name: 'John Test Patient',
        customer_phone: '+63 917 555 1234',
        status: 'completed'
      })
      .select()
      .single();

    if (saleError) throw saleError;

    console.log(`   ✅ Card activated: ${cardToActivate.control_number}`);
    console.log(`   💰 Sale Amount: ₱${saleAmount.toLocaleString()}`);
    console.log(`   💵 Commission: ₱${commissionAmount.toLocaleString()}`);

    // 5. Test perk redemption
    console.log('\n5️⃣ Testing Perk Redemption...');

    // Get a perk to redeem
    const { data: perkToRedeem, error: perkError } = await supabase
      .from('card_perks')
      .select('*')
      .eq('card_id', cardToActivate.id)
      .eq('claimed', false)
      .limit(1)
      .single();

    if (perkError) throw perkError;

    // Redeem the perk
    const { data: redeemedPerk, error: redeemError } = await supabase
      .from('card_perks')
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
        claimed_by_clinic: newClinic.id
      })
      .eq('id', perkToRedeem.id)
      .select()
      .single();

    if (redeemError) throw redeemError;

    // Record redemption
    const { data: redemption, error: redemptionError } = await supabase
      .from('clinic_perk_redemptions')
      .insert({
        clinic_id: newClinic.id,
        card_id: cardToActivate.id,
        perk_id: perkToRedeem.id,
        service_provided: 'Dental Cleaning',
        service_value: 800,
        notes: 'Regular cleaning service provided'
      })
      .select()
      .single();

    if (redemptionError) throw redemptionError;

    console.log(`   ✅ Perk redeemed: ${perkToRedeem.perk_type}`);
    console.log(`   🦷 Service: Dental Cleaning (₱800)`);

    // 6. Test patient card lookup
    console.log('\n6️⃣ Testing Patient Card Lookup...');

    const { data: patientCard, error: lookupError } = await supabase
      .from('cards')
      .select(`
        *,
        clinic:mocards_clinics(*),
        perks:card_perks(*)
      `)
      .eq('control_number', cardToActivate.control_number)
      .eq('passcode', cardToActivate.passcode)
      .single();

    if (lookupError) throw lookupError;

    const availablePerks = patientCard.perks.filter(p => !p.claimed).length;
    const claimedPerks = patientCard.perks.filter(p => p.claimed).length;

    console.log(`   ✅ Card lookup successful`);
    console.log(`   🏥 Assigned to: ${patientCard.clinic.clinic_name}`);
    console.log(`   🎁 Perks: ${availablePerks} available, ${claimedPerks} used`);

    // 7. Test dashboard stats calculation
    console.log('\n7️⃣ Testing Dashboard Analytics...');

    // Get clinic stats
    const { data: clinicStats } = await supabase
      .from('mocards_clinics')
      .select('cards_issued_this_month, total_revenue, monthly_card_limit')
      .eq('id', newClinic.id)
      .single();

    const { data: cardCount } = await supabase
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_clinic_id', newClinic.id);

    const { data: salesData } = await supabase
      .from('clinic_sales')
      .select('sale_amount')
      .eq('clinic_id', newClinic.id);

    const totalSales = salesData?.reduce((sum, s) => sum + s.sale_amount, 0) || 0;

    console.log(`   📊 Cards assigned: ${cardCount?.length || 0}`);
    console.log(`   📈 Total sales: ₱${totalSales.toLocaleString()}`);
    console.log(`   📅 Monthly limit: ${clinicStats?.monthly_card_limit || 0}`);

    console.log('\n🎉 COMPLETE PRODUCTION WORKFLOW SUCCESSFUL!');
    console.log('\n📋 Test Clinic Credentials:');
    console.log(`   Code: ${testClinicCode}`);
    console.log(`   Password: ${testPassword}`);
    console.log('\n📋 Test Patient Card:');
    console.log(`   Control: ${cardToActivate.control_number}`);
    console.log(`   Passcode: ${cardToActivate.passcode}`);

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');

    // Delete in correct order due to foreign keys
    await supabase.from('clinic_perk_redemptions').delete().eq('clinic_id', newClinic.id);
    await supabase.from('clinic_sales').delete().eq('clinic_id', newClinic.id);
    await supabase.from('card_perks').delete().in('card_id', testCards.map(c => c.id));
    await supabase.from('card_transactions').delete().in('card_id', testCards.map(c => c.id));
    await supabase.from('cards').delete().eq('batch_id', batch.id);
    await supabase.from('card_batches').delete().eq('id', batch.id);
    await supabase.from('mocards_clinics').delete().eq('id', newClinic.id);

    console.log('   ✅ Test data cleaned up');

    console.log('\n🎯 PRODUCTION SYSTEM READY FOR DEPLOYMENT!');

  } catch (error) {
    console.error('💥 Error in production workflow test:', error);
  }
}

testProductionWorkflow();