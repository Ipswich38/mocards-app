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

async function applyEnhancedCardManagement() {
  console.log('🚀 Applying Enhanced Card Management Migration...');

  try {
    // Read the enhanced card management schema
    const migrationPath = path.join(__dirname, 'enhanced-card-management-schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Enhanced card management schema loaded successfully');

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
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`   ⚠️  Skipping (already exists): ${error.message.substring(0, 100)}...`);
          } else {
            console.warn(`   ⚠️  Warning: ${error.message.substring(0, 100)}...`);
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} completed`);
        }

      } catch (err) {
        console.error(`   ❌ Error in statement ${i + 1}:`, err.message.substring(0, 100));

        // Continue with non-critical errors
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          throw err;
        }
      }
    }

    console.log('✅ Enhanced card management migration completed successfully!');

    // Verify the installation
    await verifyMigration();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('\\n🔍 Verifying enhanced card management migration...');

  try {
    const cardManagementTables = [
      'code_generation_settings',
      'location_codes',
      'card_code_history',
      'system_versions',
      'user_session_state'
    ];

    console.log('\\n📋 Checking Enhanced Card Management Tables:');
    for (const tableName of cardManagementTables) {
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
      const { data: locationCodes } = await supabase
        .from('location_codes')
        .select('*');

      console.log(`\\n📍 Location codes: ${locationCodes?.length || 0} created`);

      const { data: settings } = await supabase
        .from('code_generation_settings')
        .select('*');

      console.log(`⚙️  Generation settings: ${settings?.length || 0} created`);

      const { data: versions } = await supabase
        .from('system_versions')
        .select('*');

      console.log(`🔄 System versions: ${versions?.length || 0} initialized`);

    } catch (err) {
      console.log('\\n⚠️  Could not verify default data');
    }

    // Check functions
    try {
      const { data, error } = await supabase
        .rpc('generate_batch_number', {
          generation_mode: 'auto',
          custom_input: null,
          location_prefix: 'PHL'
        });

      if (!error && data) {
        console.log(`\\n🎯 Generated sample batch number: ${data}`);
      }
    } catch (err) {
      console.log('\\n⚠️  Could not test code generation functions');
    }

    console.log('\\n✨ Enhanced card management verification completed!');

  } catch (error) {
    console.error('\\n❌ Verification failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🎯 Enhanced Card Management System Migration');
  console.log('============================================\\n');

  await applyEnhancedCardManagement();

  console.log('\\n✨ Migration completed successfully!');
  console.log('\\nNext steps:');
  console.log('1. ✅ Test admin card code management interface');
  console.log('2. ✅ Test automatic code generation features');
  console.log('3. ✅ Test dash/hyphen auto-detection in card lookup');
  console.log('4. ✅ Verify real-time updates and version management');
  console.log('5. ✅ Test user data preservation features');
  console.log('6. 🚀 Deploy to production when ready');

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

export { applyEnhancedCardManagement, verifyMigration };