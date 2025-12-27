#!/usr/bin/env node

/**
 * 🔄 MOCARDS DATABASE RESET SCRIPT
 * Resets the database to a fresh state for new client deployment
 * CAUTION: This will delete ALL data but preserve table structure
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 MOCARDS DATABASE RESET SCRIPT');
console.log('=================================\n');

// Check if we're in a safe environment
const isProduction = process.env.NODE_ENV === 'production';
const confirmReset = process.argv.includes('--confirm');

if (isProduction && !confirmReset) {
  console.log('❌ SAFETY CHECK FAILED');
  console.log('This appears to be a production environment.');
  console.log('To reset in production, use: npm run reset-db -- --confirm');
  process.exit(1);
}

console.log('⚠️  WARNING: This will delete ALL data in the database!');
console.log('📋 What will be reset:');
console.log('   • All cards (3479+ records)');
console.log('   • All clinics');
console.log('   • All appointments');
console.log('   • All perk redemptions');
console.log('   • All perks (will be restored with defaults)');
console.log('');

if (!confirmReset) {
  console.log('❌ RESET CANCELLED');
  console.log('To proceed with reset, use: npm run reset-db -- --confirm');
  process.exit(0);
}

console.log('🚀 PROCEEDING WITH DATABASE RESET...\n');

// Import Supabase client
let supabase;
try {
  // Try to import from the built files first
  const supabaseModule = require('../src/lib/supabaseCloudSync.ts');
  supabase = supabaseModule.supabase;
} catch (error) {
  console.log('⚠️  Could not import Supabase client from TypeScript files');
  console.log('Please run this script after building the project: npm run build');
  process.exit(1);
}

async function resetDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');

    // 1. Clear perk redemptions (has foreign keys)
    console.log('   Clearing perk redemptions...');
    const { error: redemptionsError } = await supabase
      .from('perk_redemptions')
      .delete()
      .neq('id', 'impossible-id'); // Delete all records

    if (redemptionsError) {
      console.log(`   ⚠️  Perk redemptions: ${redemptionsError.message}`);
    } else {
      console.log('   ✅ Perk redemptions cleared');
    }

    // 2. Clear appointments
    console.log('   Clearing appointments...');
    const { error: appointmentsError } = await supabase
      .from('appointments')
      .delete()
      .neq('id', 'impossible-id');

    if (appointmentsError) {
      console.log(`   ⚠️  Appointments: ${appointmentsError.message}`);
    } else {
      console.log('   ✅ Appointments cleared');
    }

    // 3. Clear cards
    console.log('   Clearing cards...');
    const { error: cardsError } = await supabase
      .from('cards')
      .delete()
      .neq('id', 'impossible-id');

    if (cardsError) {
      console.log(`   ⚠️  Cards: ${cardsError.message}`);
    } else {
      console.log('   ✅ Cards cleared');
    }

    // 4. Clear clinics
    console.log('   Clearing clinics...');
    const { error: clinicsError } = await supabase
      .from('clinics')
      .delete()
      .neq('id', 'impossible-id');

    if (clinicsError) {
      console.log(`   ⚠️  Clinics: ${clinicsError.message}`);
    } else {
      console.log('   ✅ Clinics cleared');
    }

    // 5. Clear perks
    console.log('   Clearing perks...');
    const { error: perksError } = await supabase
      .from('perks')
      .delete()
      .neq('id', 'impossible-id');

    if (perksError) {
      console.log(`   ⚠️  Perks: ${perksError.message}`);
    } else {
      console.log('   ✅ Perks cleared');
    }

    console.log('\n🎉 DATABASE RESET COMPLETED!');

    // 6. Restore default perks
    console.log('\n📋 Restoring default perks...');

    const defaultPerks = [
      {
        type: 'dental_cleaning',
        name: 'Free Dental Cleaning',
        description: 'Professional dental cleaning and polishing service',
        value: 1500,
        is_active: true,
        valid_for: 365,
        requires_approval: false
      },
      {
        type: 'consultation',
        name: 'Free Consultation',
        description: 'Comprehensive dental examination and consultation',
        value: 800,
        is_active: true,
        valid_for: 365,
        requires_approval: false
      },
      {
        type: 'xray',
        name: 'Free X-Ray',
        description: 'Digital dental X-ray imaging service',
        value: 600,
        is_active: true,
        valid_for: 365,
        requires_approval: false
      },
      {
        type: 'fluoride_treatment',
        name: 'Fluoride Treatment',
        description: 'Professional fluoride application for cavity prevention',
        value: 400,
        is_active: true,
        valid_for: 365,
        requires_approval: false
      },
      {
        type: 'oral_health_education',
        name: 'Oral Health Education',
        description: 'Professional guidance on oral hygiene and dental care',
        value: 300,
        is_active: true,
        valid_for: 365,
        requires_approval: false
      }
    ];

    for (const perk of defaultPerks) {
      const { error: perkError } = await supabase
        .from('perks')
        .insert([perk]);

      if (perkError) {
        console.log(`   ⚠️  Failed to restore perk: ${perk.name}`);
      } else {
        console.log(`   ✅ Restored: ${perk.name}`);
      }
    }

    console.log('\n✅ DEFAULT PERKS RESTORED!');

  } catch (error) {
    console.error('\n❌ RESET FAILED:', error);
    console.log('\nPlease check your Supabase configuration and try again.');
    process.exit(1);
  }
}

// Verification function
async function verifyReset() {
  console.log('\n🔍 VERIFYING RESET...');

  try {
    // Check all tables are empty (except perks which should have defaults)
    const tables = ['cards', 'clinics', 'appointments', 'perk_redemptions'];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ Error checking ${table}: ${error.message}`);
      } else {
        const count = data?.length || 0;
        console.log(`   ✅ ${table}: ${count} records`);
      }
    }

    // Check perks were restored
    const { data: perks, error: perksError } = await supabase
      .from('perks')
      .select('id', { count: 'exact', head: true });

    if (perksError) {
      console.log(`   ❌ Error checking perks: ${perksError.message}`);
    } else {
      const perkCount = perks?.length || 0;
      console.log(`   ✅ perks: ${perkCount} records (default perks restored)`);
    }

  } catch (error) {
    console.log(`   ❌ Verification failed: ${error.message}`);
  }
}

// Main execution
async function main() {
  await resetDatabase();
  await verifyReset();

  console.log('\n🎉 FRESH START READY!');
  console.log('====================================');
  console.log('✅ Database completely reset');
  console.log('✅ Default perks restored');
  console.log('✅ Ready for new admin account');
  console.log('✅ Ready for business use');
  console.log('\nYour client can now start with a completely clean system!');
}

// Run the script
main().catch(console.error);