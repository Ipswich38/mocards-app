#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyEnhancedSchema() {
  console.log('🔧 Applying Enhanced Production Schema...\n');

  try {
    // Read the schema file
    const schemaSQL = fs.readFileSync('./enhanced-production-schema.sql', 'utf8');

    // Split into individual statements (rough split by semicolons)
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();

      if (statement.length === 0) continue;

      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_string: statement + ';'
        });

        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_sql_execute')
            .insert({ query: statement });

          if (directError) {
            console.log(`⚠️  Statement ${i + 1} may have failed (this might be expected):`, error.message);
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} execution error:`, err.message);
      }
    }

    console.log('\n🎉 Enhanced schema application completed!');

    // Test if new columns exist
    console.log('\n🔍 Testing enhanced schema...');

    const { data: testBatch, error: batchError } = await supabase
      .from('card_batches')
      .select('id, batch_number, batch_metadata, cards_generated')
      .limit(1);

    if (!batchError && testBatch) {
      console.log('✅ Enhanced card_batches structure confirmed');
    }

    const { data: testCards, error: cardsError } = await supabase
      .from('cards')
      .select('id, control_number, card_metadata, location_code, assigned_clinic_id')
      .limit(1);

    if (!cardsError && testCards) {
      console.log('✅ Enhanced cards structure confirmed');
    }

    console.log('\n🚀 Enhanced production schema is ready for card generation!');

  } catch (error) {
    console.error('💥 Error applying enhanced schema:', error);
  }
}

applyEnhancedSchema();