#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompleteFlow() {
  console.log('🔍 Testing complete MOCARDS flow...\n');

  try {
    // 1. Test Admin Login
    console.log('1️⃣ Testing Admin Login...');
    const { data: admin, error: adminError } = await supabase
      .from('mocards_admin_users')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (adminError) {
      console.error('❌ Admin not found:', adminError);
      return;
    }

    const adminPasswordValid = await bcrypt.compare('admin123', admin.password_hash);
    console.log(`   Admin login: ${adminPasswordValid ? '✅' : '❌'}`);

    // 2. Test Clinic Login
    console.log('\n2️⃣ Testing Clinic Login...');
    const { data: clinic, error: clinicError } = await supabase
      .from('mocards_clinics')
      .select('*')
      .eq('clinic_code', 'DEMO001')
      .single();

    if (clinicError) {
      console.error('❌ Clinic not found:', clinicError);
      return;
    }

    const clinicPasswordValid = await bcrypt.compare('demo123', clinic.password_hash);
    console.log(`   Clinic login: ${clinicPasswordValid ? '✅' : '❌'}`);

    // 3. Test Card Lookup
    console.log('\n3️⃣ Testing Card Lookup...');
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        *,
        clinic:mocards_clinics(*),
        perks:card_perks(*)
      `)
      .eq('control_number', 'MO-C000001-001')
      .eq('passcode', '123456')
      .single();

    if (cardError) {
      console.error('❌ Card lookup failed:', cardError);
    } else {
      console.log(`   Card lookup: ✅`);
      console.log(`   Card status: ${card.status}`);
      console.log(`   Clinic: ${card.clinic?.clinic_name}`);
      console.log(`   Perks: ${card.perks?.length} total (${card.perks?.filter(p => p.claimed).length} claimed)`);
    }

    // 4. Test Card Generation Components
    console.log('\n4️⃣ Testing Card Generation...');

    // Generate a batch number like the app does
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    const testBatchNumber = `MO-B${timestamp}${random}`;

    const batchData = {
      batch_number: testBatchNumber,
      total_cards: 3,
      created_by: admin.id
    };

    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert(batchData)
      .select()
      .single();

    if (batchError) {
      console.error('❌ Batch creation failed:', batchError);
    } else {
      console.log(`   Batch creation: ✅ (${batch.batch_number})`);

      // Generate test cards
      const testCards = [];
      for (let i = 1; i <= 3; i++) {
        const controlNumber = `${testBatchNumber.replace('B', 'C')}-${i.toString().padStart(3, '0')}`;
        const passcode = Math.random().toString().slice(2, 8);

        const cardData = {
          batch_id: batch.id,
          control_number: controlNumber,
          passcode: passcode,
          location_code: 'MO',
          status: 'unactivated'
        };

        const { data: newCard, error: cardCreateError } = await supabase
          .from('cards')
          .insert(cardData)
          .select()
          .single();

        if (cardCreateError) {
          console.error(`❌ Card ${i} creation failed:`, cardCreateError);
        } else {
          testCards.push(newCard);
          console.log(`   Card ${i}: ✅ ${newCard.control_number} / ${newCard.passcode}`);
        }
      }

      // Cleanup test data
      console.log('\n🧹 Cleaning up test data...');
      for (const testCard of testCards) {
        await supabase.from('cards').delete().eq('id', testCard.id);
      }
      await supabase.from('card_batches').delete().eq('id', batch.id);
      console.log('   Cleanup complete');
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Ready to test at http://localhost:5174/');
    console.log('🔑 Admin: admin / admin123');
    console.log('🏥 Clinic: DEMO001 / demo123');
    console.log('💳 Card: MO-C000001-001 / 123456');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testCompleteFlow();