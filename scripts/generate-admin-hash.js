#!/usr/bin/env node

/**
 * Generate correct hash for admin123 password
 */

// Simple bcrypt-like implementation for browser compatibility
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

async function generateAdminHash() {
  console.log('🔐 Generating hash for admin123 password...\n');

  const password = 'admin123';
  const hash = await BrowserCrypt.hashPassword(password);

  console.log('Password:', password);
  console.log('Generated hash:', hash);

  // Test the hash
  const isValid = await BrowserCrypt.compare(password, hash);
  console.log('Hash validation:', isValid ? '✅ VALID' : '❌ INVALID');

  if (isValid) {
    console.log('\n✅ SUCCESS! Use this hash in enterprise-auth.ts:');
    console.log(`admin: '${hash}',`);
  }
}

generateAdminHash();