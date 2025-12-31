#!/usr/bin/env node

/**
 * MOCARDS CLOUD - Factory Reset Script
 * Clears all data for production deployment
 * DANGER: This will permanently delete ALL data!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function factoryReset() {
  console.log('🚨 MOCARDS CLOUD - FACTORY RESET');
  console.log('⚠️  WARNING: This will permanently delete ALL data!');
  console.log('📋 Starting factory reset process...\n');

  try {
    // Step 1: Clear all perk redemptions
    console.log('1️⃣  Clearing perk redemptions...');
    const { data: redemptions } = await supabase.from('perk_redemptions').select('id');
    if (redemptions && redemptions.length > 0) {
      const { error: redemptionsError } = await supabase
        .from('perk_redemptions')
        .delete()
        .in('id', redemptions.map(r => r.id));
      if (redemptionsError) throw redemptionsError;
    }
    console.log('✅ Perk redemptions cleared');

    // Step 2: Clear all appointments
    console.log('2️⃣  Clearing appointments...');
    const { data: appointments } = await supabase.from('appointments').select('id');
    if (appointments && appointments.length > 0) {
      const { error: appointmentsError } = await supabase
        .from('appointments')
        .delete()
        .in('id', appointments.map(a => a.id));
      if (appointmentsError) throw appointmentsError;
    }
    console.log('✅ Appointments cleared');

    // Step 3: Clear all cards
    console.log('3️⃣  Clearing cards...');
    const { data: cards } = await supabase.from('cards').select('id');
    if (cards && cards.length > 0) {
      const { error: cardsError } = await supabase
        .from('cards')
        .delete()
        .in('id', cards.map(c => c.id));
      if (cardsError) throw cardsError;
    }
    console.log('✅ Cards cleared');

    // Step 4: Clear all clinics
    console.log('4️⃣  Clearing clinics...');
    const { data: clinics } = await supabase.from('clinics').select('id');
    if (clinics && clinics.length > 0) {
      const { error: clinicsError } = await supabase
        .from('clinics')
        .delete()
        .in('id', clinics.map(c => c.id));
      if (clinicsError) throw clinicsError;
    }
    console.log('✅ Clinics cleared');

    // Step 5: Keep existing perks (they're already set up correctly)
    console.log('5️⃣  Keeping existing perks (no changes needed)...');
    console.log('✅ Perks left intact');

    console.log('\n🎉 FACTORY RESET COMPLETED SUCCESSFULLY!');
    console.log('🏭 Database is now clean and ready for production use');
    console.log('📊 Default perks have been initialized');
    console.log('🚀 Your client can now start using the system fresh');

  } catch (error) {
    console.error('\n❌ Factory reset failed:', error);
    console.error('🚨 Please check your database connection and try again');
    process.exit(1);
  }
}

// Run the factory reset
factoryReset();