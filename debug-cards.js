#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugCards() {
  console.log('🔍 Debugging card issues...\n');

  try {
    // Check all cards in database
    console.log('📋 All cards in database:');
    const { data: allCards, error: cardsError } = await supabase
      .from('cards')
      .select('*');

    if (cardsError) {
      console.error('❌ Error fetching cards:', cardsError);
      return;
    }

    console.log(`Found ${allCards?.length || 0} cards:`);
    allCards?.forEach(card => {
      console.log(`  Control: ${card.control_number}, Passcode: ${card.passcode}, Status: ${card.status}`);
    });

    // Test specific card lookup
    console.log('\n🔍 Testing demo card lookup...');
    const { data: demoCard, error: demoError } = await supabase
      .from('cards')
      .select(`
        *,
        clinic:mocards_clinics(*),
        perks:card_perks(*)
      `)
      .eq('control_number', 'MO-C000001-001')
      .single();

    if (demoError) {
      console.error('❌ Demo card lookup failed:', demoError);
    } else {
      console.log('✅ Demo card found:', {
        control_number: demoCard.control_number,
        passcode: demoCard.passcode,
        status: demoCard.status,
        clinic: demoCard.clinic?.clinic_name,
        perks_count: demoCard.perks?.length
      });
    }

    // Test passcode validation
    console.log('\n🔍 Testing passcode validation...');
    const { data: passcodeCard, error: passcodeError } = await supabase
      .from('cards')
      .select('*')
      .eq('control_number', 'MO-C000001-001')
      .eq('passcode', '123456')
      .single();

    if (passcodeError) {
      console.error('❌ Passcode validation failed:', passcodeError);
    } else {
      console.log('✅ Passcode validation passed');
    }

    // Check card batches (needed for card generation)
    console.log('\n📦 Card batches in database:');
    const { data: batches, error: batchError } = await supabase
      .from('card_batches')
      .select('*');

    if (batchError) {
      console.error('❌ Error fetching batches:', batchError);
    } else {
      console.log(`Found ${batches?.length || 0} batches:`);
      batches?.forEach(batch => {
        console.log(`  Batch: ${batch.batch_number}, Cards: ${batch.total_cards}`);
      });
    }

    // Check admin users (needed for card generation)
    console.log('\n👤 Admin users in database:');
    const { data: admins, error: adminError } = await supabase
      .from('mocards_admin_users')
      .select('id, username, role');

    if (adminError) {
      console.error('❌ Error fetching admins:', adminError);
    } else {
      console.log(`Found ${admins?.length || 0} admins:`);
      admins?.forEach(admin => {
        console.log(`  User: ${admin.username}, Role: ${admin.role}, ID: ${admin.id}`);
      });
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugCards();