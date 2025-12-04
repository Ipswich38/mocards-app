#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database structure...');

  try {
    // Check if mocards schema exists
    const { data: schemas, error: schemaError } = await supabase
      .rpc('check_schemas');

    if (schemaError) {
      console.log('📋 Trying direct table access...');

      // Try accessing tables directly
      const tables = ['clinics', 'mocards.clinics', 'admin_users', 'mocards.admin_users'];

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);

          if (!error) {
            console.log(`✅ Found table: ${table}`);
            if (data) {
              console.log(`   Columns: ${Object.keys(data[0] || {}).join(', ')}`);
            }
          } else {
            console.log(`❌ Table ${table}: ${error.message}`);
          }
        } catch (e) {
          console.log(`❌ Table ${table}: ${e.message}`);
        }
      }
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkDatabase();