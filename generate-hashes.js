#!/usr/bin/env node

import bcrypt from 'bcryptjs';

async function generateHashes() {
  console.log('🔐 Generating correct bcrypt hashes...\n');

  try {
    // Generate hashes for all passwords
    const adminPassword = 'admin123';
    const demoPassword = 'demo123';

    console.log('Generating hashes (this takes a moment)...');

    const adminHash = await bcrypt.hash(adminPassword, 10);
    const demoHash = await bcrypt.hash(demoPassword, 10);

    console.log('✅ Hash generation complete!\n');

    console.log('📋 SQL UPDATE STATEMENTS:');
    console.log('Copy and run these in Supabase SQL Editor:\n');

    console.log('-- Update admin user password');
    console.log(`UPDATE public.mocards_admin_users SET password_hash = '${adminHash}' WHERE username = 'admin';`);
    console.log('\n-- Update demo clinic password');
    console.log(`UPDATE public.mocards_clinics SET password_hash = '${demoHash}' WHERE clinic_code = 'DEMO001';`);

    console.log('\n🔍 Testing hash verification:');
    const adminTest = await bcrypt.compare(adminPassword, adminHash);
    const demoTest = await bcrypt.compare(demoPassword, demoHash);

    console.log(`Admin hash valid: ${adminTest ? '✅' : '❌'}`);
    console.log(`Demo hash valid: ${demoTest ? '✅' : '❌'}`);

    if (adminTest && demoTest) {
      console.log('\n🎉 All hashes verified! Run the SQL updates above.');
    }

  } catch (error) {
    console.error('❌ Error generating hashes:', error);
  }
}

generateHashes();