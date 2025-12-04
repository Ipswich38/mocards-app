#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDemoLogin() {
  console.log('🔧 Fixing demo login credentials...');

  try {
    // Generate bcrypt hash for 'demo123'
    const demoPassword = 'demo123';
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    console.log('📝 Generated bcrypt hash for demo password');

    // Check current demo clinic
    const { data: currentClinic, error: fetchError } = await supabase
      .from('clinics')
      .select('*')
      .eq('clinic_code', 'DEMO001')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching clinic:', fetchError);
      return;
    }

    if (currentClinic) {
      console.log('🏥 Found existing demo clinic, updating password...');

      // Update the password hash
      const { error: updateError } = await supabase
        .from('clinics')
        .update({ password_hash: hashedPassword })
        .eq('clinic_code', 'DEMO001');

      if (updateError) {
        console.error('❌ Error updating clinic password:', updateError);
        return;
      }

      console.log('✅ Updated demo clinic password successfully');
    } else {
      console.log('🏥 Creating demo clinic...');

      // Create demo clinic
      const { error: insertError } = await supabase
        .from('clinics')
        .insert({
          clinic_code: 'DEMO001',
          clinic_name: 'Demo Dental Clinic',
          password_hash: hashedPassword,
          contact_email: 'demo@clinic.com',
          address: '123 Demo Street, Demo City',
          status: 'active'
        });

      if (insertError) {
        console.error('❌ Error creating demo clinic:', insertError);
        return;
      }

      console.log('✅ Created demo clinic successfully');
    }

    // Now check/create admin user
    const adminPassword = 'admin123';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);

    const { data: currentAdmin, error: adminFetchError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (adminFetchError && adminFetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching admin:', adminFetchError);
      return;
    }

    if (currentAdmin) {
      console.log('👤 Found existing admin user, updating password...');

      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password_hash: adminHashedPassword })
        .eq('username', 'admin');

      if (updateError) {
        console.error('❌ Error updating admin password:', updateError);
        return;
      }

      console.log('✅ Updated admin password successfully');
    } else {
      console.log('👤 Creating admin user...');

      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({
          username: 'admin',
          password_hash: adminHashedPassword,
          role: 'superadmin'
        });

      if (insertError) {
        console.error('❌ Error creating admin user:', insertError);
        return;
      }

      console.log('✅ Created admin user successfully');
    }

    console.log('\n🎉 Demo login credentials are now fixed!');
    console.log('📋 Use these credentials to test:');
    console.log('   Clinic Login: DEMO001 / demo123');
    console.log('   Admin Login: admin / admin123');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

fixDemoLogin();