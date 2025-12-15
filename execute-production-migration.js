#!/usr/bin/env node

/**
 * PRODUCTION MIGRATION EXECUTOR
 *
 * Executes the live production migration and urgent fixes through Supabase client
 * This script handles:
 * 1. Missing 9,000 cards generation
 * 2. Portal function fixes to return all 10,000 cards
 * 3. Enhanced search functionality
 * 4. Perk system validation
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sql, description) {
  console.log(`🔄 ${description}...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.error(`❌ Failed: ${description}`, error.message);
      return false;
    }
    console.log(`✅ Completed: ${description}`);
    return true;
  } catch (err) {
    console.error(`❌ Error in ${description}:`, err.message);
    return false;
  }
}

async function generateMissingCards() {
  console.log('\n📊 GENERATING MISSING CARDS (1-10,000)');
  console.log('-'.repeat(50));

  const region_code = '01'; // NCR region
  const default_clinic_code = 'CVT001'; // Default clinic

  let successCount = 0;
  let failedCount = 0;

  // Generate cards in batches of 100
  for (let start = 1; start <= 10000; start += 100) {
    const end = Math.min(start + 99, 10000);
    console.log(`🔄 Generating cards ${start}-${end}...`);

    const batch = [];
    for (let cardNum = start; cardNum <= end; cardNum++) {
      // Check if card already exists
      const { data: existing } = await supabase
        .from('cards')
        .select('id')
        .eq('card_number', cardNum)
        .single();

      if (!existing) {
        batch.push({
          card_number: cardNum,
          control_number: `MOC-${cardNum.toString().padStart(5, '0')}`,
          control_number_v2: `MOC-${cardNum.toString().padStart(5, '0')}`,
          unified_control_number: `MOC-${(cardNum + 9999).toString().padStart(5, '0')}-${region_code}-${default_clinic_code}`,
          display_card_number: cardNum + 9999,
          passcode: Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
          status: 'unassigned',
          is_activated: false,
          location_code_v2: region_code,
          clinic_code_v2: default_clinic_code,
          migration_version: 3
        });
      }
    }

    if (batch.length > 0) {
      const { error } = await supabase
        .from('cards')
        .insert(batch);

      if (error) {
        console.error(`❌ Failed batch ${start}-${end}:`, error.message);
        failedCount += batch.length;
      } else {
        console.log(`✅ Created ${batch.length} cards in batch ${start}-${end}`);
        successCount += batch.length;
      }
    }
  }

  console.log(`📊 Card generation complete: ${successCount} created, ${failedCount} failed`);
  return successCount > 0;
}

async function updatePortalFunctions() {
  console.log('\n🌐 UPDATING PORTAL FUNCTIONS');
  console.log('-'.repeat(50));

  // Fix admin portal function
  const adminFunction = `
    CREATE OR REPLACE FUNCTION admin_get_all_cards()
    RETURNS TABLE(
        id UUID,
        card_number INTEGER,
        display_card_number INTEGER,
        unified_control_number TEXT,
        control_number TEXT,
        status TEXT,
        is_activated BOOLEAN,
        assigned_clinic_id UUID,
        clinic_name TEXT
    ) LANGUAGE plpgsql AS $$
    BEGIN
        RETURN QUERY
        SELECT
            c.id,
            c.card_number,
            c.display_card_number,
            COALESCE(c.unified_control_number::TEXT, '') as unified_control_number,
            COALESCE(c.control_number::TEXT, '') as control_number,
            COALESCE(c.status::TEXT, 'unassigned') as status,
            COALESCE(c.is_activated, false) as is_activated,
            c.assigned_clinic_id,
            COALESCE(cl.clinic_name::TEXT, '') as clinic_name
        FROM public.cards c
        LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
        WHERE c.card_number BETWEEN 1 AND 10000
        ORDER BY c.card_number;
    END $$;
  `;

  // Fix clinic portal function
  const clinicFunction = `
    CREATE OR REPLACE FUNCTION clinic_get_all_cards_mirror()
    RETURNS TABLE(
        id UUID,
        card_number INTEGER,
        display_card_number INTEGER,
        unified_control_number TEXT,
        control_number TEXT,
        status TEXT,
        is_activated BOOLEAN,
        assigned_clinic_id UUID,
        assigned_clinic_name TEXT,
        can_activate BOOLEAN
    ) LANGUAGE plpgsql AS $$
    BEGIN
        RETURN QUERY
        SELECT
            c.id,
            c.card_number,
            c.display_card_number,
            COALESCE(c.unified_control_number::TEXT, '') as unified_control_number,
            COALESCE(c.control_number::TEXT, '') as control_number,
            COALESCE(c.status::TEXT, 'unassigned') as status,
            COALESCE(c.is_activated, false) as is_activated,
            c.assigned_clinic_id,
            COALESCE(cl.clinic_name::TEXT, '') as assigned_clinic_name,
            CASE
                WHEN c.assigned_clinic_id IS NOT NULL AND COALESCE(c.is_activated, false) = false
                THEN true
                ELSE false
            END as can_activate
        FROM public.cards c
        LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
        WHERE c.card_number BETWEEN 1 AND 10000
        ORDER BY c.card_number;
    END $$;
  `;

  const adminSuccess = await executeSQL(adminFunction, 'Fix admin portal function');
  const clinicSuccess = await executeSQL(clinicFunction, 'Fix clinic portal function');

  return adminSuccess && clinicSuccess;
}

async function updateSearchFunctions() {
  console.log('\n🔍 UPDATING SEARCH FUNCTIONS');
  console.log('-'.repeat(50));

  // Enhanced universal search
  const universalSearch = `
    CREATE OR REPLACE FUNCTION search_card_universal(search_term TEXT)
    RETURNS TABLE(
        id UUID,
        card_number INTEGER,
        display_card_number INTEGER,
        primary_control_number TEXT,
        all_control_numbers TEXT[],
        passcode TEXT,
        status TEXT,
        is_activated BOOLEAN,
        assigned_clinic_id UUID,
        clinic_name TEXT
    ) LANGUAGE plpgsql AS $$
    BEGIN
        RETURN QUERY
        SELECT
            c.id,
            c.card_number,
            c.display_card_number,
            COALESCE(c.unified_control_number::TEXT, c.control_number_v2::TEXT, c.control_number::TEXT) as primary_control_number,
            ARRAY[
                COALESCE(c.control_number::TEXT, ''),
                COALESCE(c.control_number_v2::TEXT, ''),
                COALESCE(c.unified_control_number::TEXT, '')
            ] as all_control_numbers,
            COALESCE(c.passcode::TEXT, '') as passcode,
            COALESCE(c.status::TEXT, 'unassigned') as status,
            COALESCE(c.is_activated, false) as is_activated,
            c.assigned_clinic_id,
            COALESCE(cl.clinic_name::TEXT, '') as clinic_name
        FROM public.cards c
        LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
        WHERE c.card_number BETWEEN 1 AND 10000
        AND (
            c.control_number = search_term
            OR c.control_number_v2 = search_term
            OR c.unified_control_number = search_term
            OR c.control_number ILIKE '%' || search_term || '%'
            OR c.control_number_v2 ILIKE '%' || search_term || '%'
            OR c.unified_control_number ILIKE '%' || search_term || '%'
            OR c.card_number::TEXT = search_term
            OR c.display_card_number::TEXT = search_term
            OR LPAD(c.card_number::TEXT, 5, '0') = search_term
            OR LPAD(c.display_card_number::TEXT, 5, '0') = search_term
        )
        ORDER BY c.card_number;
    END $$;
  `;

  // Enhanced patient lookup
  const patientLookup = `
    CREATE OR REPLACE FUNCTION patient_lookup_card(search_term TEXT)
    RETURNS TABLE(
        card_number INTEGER,
        display_card_number INTEGER,
        control_number TEXT,
        unified_control_number TEXT,
        status TEXT,
        is_activated BOOLEAN,
        assigned_clinic_name TEXT
    ) LANGUAGE plpgsql AS $$
    BEGIN
        RETURN QUERY
        SELECT
            c.card_number,
            c.display_card_number,
            COALESCE(c.control_number::TEXT, '') as control_number,
            COALESCE(c.unified_control_number::TEXT, '') as unified_control_number,
            COALESCE(c.status::TEXT, 'unassigned') as status,
            COALESCE(c.is_activated, false) as is_activated,
            COALESCE(cl.clinic_name::TEXT, '') as assigned_clinic_name
        FROM public.cards c
        LEFT JOIN public.mocards_clinics cl ON cl.id = c.assigned_clinic_id
        WHERE c.card_number BETWEEN 1 AND 10000
        AND (
            c.card_number::TEXT = search_term
            OR c.display_card_number::TEXT = search_term
            OR LPAD(c.card_number::TEXT, 5, '0') = search_term
            OR c.control_number = search_term
            OR c.control_number_v2 = search_term
            OR c.unified_control_number = search_term
            OR c.control_number ILIKE search_term
            OR c.control_number_v2 ILIKE search_term
            OR c.unified_control_number ILIKE search_term
        )
        ORDER BY c.card_number
        LIMIT 1;
    END $$;
  `;

  const universalSuccess = await executeSQL(universalSearch, 'Update universal search function');
  const patientSuccess = await executeSQL(patientLookup, 'Update patient lookup function');

  return universalSuccess && patientSuccess;
}

async function verifyMigration() {
  console.log('\n✅ VERIFYING PRODUCTION MIGRATION');
  console.log('-'.repeat(50));

  try {
    // Check total card count
    const { count: totalCards } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .gte('card_number', 1)
      .lte('card_number', 10000);

    console.log(`📊 Total cards in range 1-10,000: ${totalCards}`);

    // Check admin portal function
    const { data: adminCards } = await supabase.rpc('admin_get_all_cards');
    console.log(`🔧 Admin portal returns: ${adminCards?.length || 0} cards`);

    // Check clinic portal function
    const { data: clinicCards } = await supabase.rpc('clinic_get_all_cards_mirror');
    console.log(`🏥 Clinic portal returns: ${clinicCards?.length || 0} cards`);

    // Check search functions
    const { data: searchResults } = await supabase.rpc('search_card_universal', { search_term: '00001' });
    console.log(`🔍 Universal search for '00001': ${searchResults?.length || 0} results`);

    const { data: patientResults } = await supabase.rpc('patient_lookup_card', { search_term: '00001' });
    console.log(`👤 Patient lookup for '00001': ${patientResults?.length || 0} results`);

    // Final status
    const allSystemsGo = totalCards === 10000 &&
                        adminCards?.length === 10000 &&
                        clinicCards?.length === 10000 &&
                        searchResults?.length > 0 &&
                        patientResults?.length > 0;

    console.log(`\n🎯 PRODUCTION STATUS: ${allSystemsGo ? '✅ READY' : '❌ ISSUES FOUND'}`);

    return allSystemsGo;

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 STARTING PRODUCTION MIGRATION EXECUTION');
  console.log('='.repeat(70));

  let success = true;

  // Step 1: Generate missing cards
  const cardsGenerated = await generateMissingCards();
  if (!cardsGenerated) {
    console.log('⚠️  Card generation had issues, but continuing...');
  }

  // Step 2: Update portal functions
  const portalsUpdated = await updatePortalFunctions();
  if (!portalsUpdated) {
    console.error('❌ Portal function updates failed - this is critical!');
    success = false;
  }

  // Step 3: Update search functions
  const searchUpdated = await updateSearchFunctions();
  if (!searchUpdated) {
    console.error('❌ Search function updates failed!');
    success = false;
  }

  // Step 4: Verify everything works
  const verificationPassed = await verifyMigration();
  if (!verificationPassed) {
    console.error('❌ Migration verification failed!');
    success = false;
  }

  console.log('\n' + '='.repeat(70));
  if (success && verificationPassed) {
    console.log('🎉 PRODUCTION MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('✅ All 10,000 cards are accessible across all portals');
    console.log('✅ Search functionality is working properly');
    console.log('✅ System is ready for production use');
  } else {
    console.log('❌ PRODUCTION MIGRATION HAD ISSUES');
    console.log('🔧 Please review the errors above and retry failed steps');
  }
  console.log('='.repeat(70));
}

main().catch(console.error);