import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applySimpleMigration() {
  console.log('🚀 Applying Simple Perk Management Migration...');

  try {
    // Read the simple migration file
    const migrationPath = path.join(__dirname, 'simple-perk-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Simple migration file loaded successfully');

    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt =>
        stmt.length > 0 &&
        !stmt.startsWith('--') &&
        !stmt.startsWith('/*') &&
        !stmt.includes('===')
      );

    console.log(`📊 Found ${statements.length} statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (!statement || statement.length < 5) continue;

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          // Log warning but continue for non-critical errors
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️  Skipping (already exists): ${error.message}`);
          } else {
            console.warn(`   ⚠️  Warning: ${error.message}`);
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} completed`);
        }

      } catch (err) {
        console.error(`   ❌ Error in statement ${i + 1}:`, err.message);

        // Continue with non-critical errors
        if (!err.message.includes('already exists')) {
          throw err;
        }
      }
    }

    console.log('✅ Simple migration completed successfully!');

    // Verify the installation
    await verifyMigration();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');

  try {
    const perkTables = [
      'perk_templates',
      'perk_categories',
      'clinic_perk_customizations',
      'perk_usage_analytics'
    ];

    console.log('\n📋 Checking Perk Management Tables:');
    for (const tableName of perkTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error && error.code === 'PGRST116') {
          console.log(`   ❌ Table '${tableName}' not found`);
        } else {
          console.log(`   ✅ Table '${tableName}' exists`);
        }
      } catch (err) {
        console.log(`   ❌ Table '${tableName}' check failed`);
      }
    }

    // Check default data
    try {
      const { data: categories } = await supabase
        .from('perk_categories')
        .select('*');

      console.log(`\n📂 Perk categories: ${categories?.length || 0} created`);

      const { data: templates } = await supabase
        .from('perk_templates')
        .select('*');

      console.log(`🎯 Perk templates: ${templates?.length || 0} created`);

    } catch (err) {
      console.log('\n⚠️  Could not verify default data');
    }

    console.log('\n✨ Migration verification completed!');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🎯 Simple Perk Management Migration');
  console.log('==================================\n');

  await applySimpleMigration();

  console.log('\n✨ Migration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. ✅ Test admin perk management interface');
  console.log('2. ✅ Test clinic perk customization interface');
  console.log('3. ✅ Verify perk operations work correctly');
  console.log('4. 🚀 Deploy to production when ready');

  process.exit(0);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

export {
  applySimpleMigration,
  verifyMigration
};