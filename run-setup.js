#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSetup() {
  console.log('🚀 Setting up MOCARDS database schema...');

  try {
    // Read the isolated setup SQL
    const setupSQL = fs.readFileSync('./mocards-isolated-setup.sql', 'utf8');

    console.log('📋 Running MOCARDS isolated setup script...');

    // Create the schema and tables
    const { error: setupError } = await supabase.rpc('exec_sql', {
      sql: setupSQL
    });

    if (setupError) {
      console.error('❌ Setup error:', setupError);

      // If exec_sql doesn't exist, try running parts separately
      if (setupError.message?.includes('exec_sql')) {
        console.log('🔄 Trying alternative setup method...');

        const createSchema = `CREATE SCHEMA IF NOT EXISTS mocards;`;
        const { error: schemaError } = await supabase.rpc('custom_sql', { sql: createSchema });

        if (schemaError) {
          console.error('❌ Could not create schema:', schemaError);
          console.log('\n📝 Manual setup required. Please run the following in Supabase SQL Editor:');
          console.log('1. Go to your Supabase project dashboard');
          console.log('2. Navigate to SQL Editor');
          console.log('3. Copy and paste the contents of mocards-isolated-setup.sql');
          console.log('4. Run the script');
          return;
        }
      } else {
        return;
      }
    }

    console.log('✅ Database setup completed');

    // Now update demo credentials with proper bcrypt hashes
    console.log('🔐 Updating demo credentials with bcrypt...');

    const demoPassword = await bcrypt.hash('demo123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // Update demo clinic
    const { error: clinicError } = await supabase
      .from('mocards.clinics')
      .update({ password_hash: demoPassword })
      .eq('clinic_code', 'DEMO001');

    if (clinicError) {
      console.log('❌ Could not update clinic password:', clinicError.message);
    } else {
      console.log('✅ Updated demo clinic password');
    }

    // Update admin user
    const { error: adminError } = await supabase
      .from('mocards.admin_users')
      .update({ password_hash: adminPassword })
      .eq('username', 'admin');

    if (adminError) {
      console.log('❌ Could not update admin password:', adminError.message);
    } else {
      console.log('✅ Updated admin password');
    }

    console.log('\n🎉 MOCARDS setup complete!');
    console.log('📋 Demo login credentials:');
    console.log('   Clinic Login: DEMO001 / demo123');
    console.log('   Admin Login: admin / admin123');
    console.log('\n🌐 Visit http://localhost:5173 to test');

  } catch (error) {
    console.error('💥 Unexpected error:', error);

    console.log('\n📝 If automated setup fails, run manually:');
    console.log('1. Open Supabase SQL Editor');
    console.log('2. Run: mocards-isolated-setup.sql');
    console.log('3. Then run this script again');
  }
}

runSetup();