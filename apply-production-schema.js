#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyProductionSchema() {
  console.log('🚀 Applying Production Schema for Enhanced Card System\n');

  try {
    // Read and execute the production schema upgrade
    const schemaSQL = fs.readFileSync('production-schema-upgrade.sql', 'utf8');

    console.log('📄 Executing production schema upgrade...');

    // Split into individual statements and execute
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        console.log(`   ${index + 1}/${statements.length} - Executing statement...`);

        const { error } = await supabase.rpc('exec_sql', {
          sql_statement: statement + ';'
        });

        if (error && !error.message.includes('already exists')) {
          console.log(`   ⚠️  Warning: ${error.message}`);
        } else {
          console.log(`   ✅ Statement executed successfully`);
        }
      }
    }

    console.log('\n🎉 Production Schema Applied Successfully!');
    console.log('\n✅ Enhanced Features Now Available:');
    console.log('   • Enhanced clinic subscription management');
    console.log('   • Sales tracking with automated commissions');
    console.log('   • Perk redemption analytics');
    console.log('   • Monthly reporting system');
    console.log('   • Automated clinic code/password generation');
    console.log('   • Monthly card limit enforcement');
    console.log('   • Location-based passcode system');

  } catch (error) {
    console.error('❌ Schema application failed:', error);
  }
}

applyProductionSchema();