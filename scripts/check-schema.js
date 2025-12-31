#!/usr/bin/env node

/**
 * Check actual database schema to fix test issues
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking actual database schema...\n');

  const tables = ['cards', 'clinics', 'appointments', 'perks', 'perk_redemptions'];

  for (const table of tables) {
    console.log(`📋 ${table.toUpperCase()} TABLE:`);
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`   ✅ Columns: ${columns.join(', ')}`);
      } else {
        console.log(`   ⚪ No data, trying to insert test record to see columns...`);

        // Try a minimal insert to see what columns are expected
        const { error: insertError } = await supabase.from(table).insert({});
        if (insertError) {
          console.log(`   📝 Insert error reveals schema: ${insertError.message}`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Table access error: ${err.message}`);
    }
    console.log('');
  }
}

checkSchema();