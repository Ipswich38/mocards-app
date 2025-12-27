#!/usr/bin/env node

/**
 * 🚀 QUICK DATABASE RESET
 * Simple script to reset database via direct Supabase queries
 */

console.log('🚀 MOCARDS QUICK RESET');
console.log('======================\n');

console.log('📋 RESET INSTRUCTIONS:');
console.log('');
console.log('Since you have Supabase access, please run these SQL commands');
console.log('in your Supabase dashboard SQL editor:');
console.log('');
console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql/');
console.log('');
console.log('💻 SQL COMMANDS TO RUN:');
console.log('=======================');
console.log('');

const resetSQL = `-- MOCARDS DATABASE RESET
-- Run this in Supabase SQL Editor

-- 1. Clear all data (preserves table structure)
DELETE FROM perk_redemptions;
DELETE FROM appointments;
DELETE FROM cards;
DELETE FROM clinics;
DELETE FROM perks;

-- 2. Restore default perks
INSERT INTO perks (type, name, description, value, is_active, valid_for, requires_approval) VALUES
('dental_cleaning', 'Free Dental Cleaning', 'Professional dental cleaning and polishing service', 1500, true, 365, false),
('consultation', 'Free Consultation', 'Comprehensive dental examination and consultation', 800, true, 365, false),
('xray', 'Free X-Ray', 'Digital dental X-ray imaging service', 600, true, 365, false),
('fluoride_treatment', 'Fluoride Treatment', 'Professional fluoride application for cavity prevention', 400, true, 365, false),
('oral_health_education', 'Oral Health Education', 'Professional guidance on oral hygiene and dental care', 300, true, 365, false);

-- 3. Verify reset
SELECT
  (SELECT COUNT(*) FROM cards) as cards_count,
  (SELECT COUNT(*) FROM clinics) as clinics_count,
  (SELECT COUNT(*) FROM appointments) as appointments_count,
  (SELECT COUNT(*) FROM perk_redemptions) as redemptions_count,
  (SELECT COUNT(*) FROM perks) as perks_count;`;

console.log(resetSQL);
console.log('');
console.log('📊 EXPECTED RESULTS AFTER RESET:');
console.log('================================');
console.log('• cards_count: 0');
console.log('• clinics_count: 0');
console.log('• appointments_count: 0');
console.log('• redemptions_count: 0');
console.log('• perks_count: 5');
console.log('');
console.log('✅ After running these commands, your database will be completely fresh!');
console.log('🎯 Your client can then create a new admin account and start using the system.');

// Also save the SQL to a file for easy access
const fs = require('fs');
const sqlFilePath = './database-reset.sql';

fs.writeFileSync(sqlFilePath, resetSQL);
console.log(`\n💾 SQL commands also saved to: ${sqlFilePath}`);
console.log('   You can copy-paste from this file into Supabase SQL editor.');

console.log('\n🚀 QUICK RESET INSTRUCTIONS COMPLETE!');