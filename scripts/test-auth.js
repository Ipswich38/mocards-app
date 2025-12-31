#!/usr/bin/env node

// Import the exact same logic from enterprise-auth.ts
class BrowserCrypt {
  static async hashPassword(password, salt = 'MOCARDS_ENTERPRISE_SALT_2024') {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `$2a$12$${hashHex.substring(0, 53)}`;
  }

  static async compare(password, hash) {
    try {
      const newHash = await this.hashPassword(password);
      return newHash === hash;
    } catch (error) {
      console.error('Password comparison failed:', error);
      return false;
    }
  }
}

async function testAuth() {
  console.log('🔐 Testing Admin Authentication...\n');

  const adminHash = '$2a$12$cefb21ee78311f538e1b6f4619f265d43012b73324796e6f8c6c3';
  const clinicHash = '$2a$12$ef27cb1e09f82222058cd4595e01475482fdcca03d502136fa1cf';

  console.log('Testing admin/admin123...');
  const adminResult = await BrowserCrypt.compare('admin123', adminHash);
  console.log('Result:', adminResult ? '✅ SUCCESS' : '❌ FAILED');

  console.log('\nTesting clinic/clinic123...');
  const clinicResult = await BrowserCrypt.compare('clinic123', clinicHash);
  console.log('Result:', clinicResult ? '✅ SUCCESS' : '❌ FAILED');

  console.log('\n' + '='.repeat(50));
  console.log('FINAL CREDENTIALS FOR YOUR CLIENT:');
  console.log('='.repeat(50));
  console.log('🔑 Admin Portal Login:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('');
  console.log('🏥 Clinic Portal Login:');
  console.log('   Username: clinic');
  console.log('   Password: clinic123');
  console.log('='.repeat(50));
}

testAuth();