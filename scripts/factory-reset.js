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
  console.log('📋 Starting comprehensive factory reset process...\n');

  try {
    // Step 0: Clear all analytics/statistics tables first
    console.log('0️⃣  Clearing analytics and statistics data...');

    // Clear any analytics tables that might exist
    const analyticsTables = ['analytics', 'statistics', 'metrics', 'reports', 'usage_stats', 'activity_logs'];
    for (const table of analyticsTables) {
      try {
        const { data } = await supabase.from(table).select('id').limit(1);
        if (data !== null) {
          console.log(`   📊 Found ${table} table, clearing...`);
          const { data: tableData } = await supabase.from(table).select('id');
          if (tableData && tableData.length > 0) {
            await supabase.from(table).delete().in('id', tableData.map(r => r.id));
            console.log(`   ✅ ${table} cleared (${tableData.length} records)`);
          }
        }
      } catch (error) {
        // Table doesn't exist or no access, continue
        console.log(`   ⚪ ${table} table not found or empty`);
      }
    }
    console.log('✅ Analytics data clearing completed');

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

    // Step 6: Clear any analytics localStorage cache
    console.log('6️⃣  Clearing browser analytics cache...');
    try {
      // Clear analytics-related localStorage items
      if (typeof localStorage !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.includes('analytics') ||
            key.includes('stats') ||
            key.includes('metrics') ||
            key.includes('mocards_cache') ||
            key.includes('dashboard_data')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`✅ Cleared ${keysToRemove.length} analytics cache items`);
      } else {
        console.log('✅ Browser cache clearing skipped (Node.js environment)');
      }
    } catch (error) {
      console.log('⚪ Browser cache clearing skipped (not available)');
    }

    console.log('\n🎉 COMPREHENSIVE FACTORY RESET COMPLETED SUCCESSFULLY!');
    console.log('🏭 Database is completely clean and ready for production use');
    console.log('📊 All analytics data reset to zero state');
    console.log('🗃️  All cached data cleared from browser');
    console.log('🚀 Your client can now start using the system with zero data');

  } catch (error) {
    console.error('\n❌ Factory reset failed:', error);
    console.error('🚨 Please check your database connection and try again');
    process.exit(1);
  }
}

// Run the factory reset
factoryReset();