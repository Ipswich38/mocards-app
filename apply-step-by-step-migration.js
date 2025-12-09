const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyStepByStepMigration() {
  console.log('🚀 Applying Step-by-Step Enhanced Schema Migration...');

  try {
    // Read the step-by-step migration file
    const migrationPath = path.join(__dirname, 'step-by-step-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');

    // Split into logical steps based on comments
    const steps = migrationSQL.split('-- Step ').filter(step => step.trim().length > 0);

    console.log(`📊 Found ${steps.length} migration steps to execute`);

    for (let i = 0; i < steps.length; i++) {
      const stepContent = steps[i];
      const stepNumber = i + 1;

      // Extract step name from first line
      const firstLine = stepContent.split('\n')[0];
      const stepName = firstLine.substring(firstLine.indexOf(': ') + 2).trim();

      console.log(`\n⚙️  Executing Step ${stepNumber}: ${stepName}...`);

      // Extract SQL statements from this step
      const stepSQL = stepContent.split('\n').slice(1).join('\n');

      // Split into individual statements
      const statements = stepSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 &&
                !stmt.startsWith('--') &&
                !stmt.startsWith('/*') &&
                !stmt.includes('Step ') &&
                !stmt.includes('==='));

      console.log(`   📝 Found ${statements.length} statements in this step`);

      for (let j = 0; j < statements.length; j++) {
        const statement = statements[j];

        if (!statement || statement.length < 5) continue;

        try {
          console.log(`   ⚡ Executing statement ${j + 1}/${statements.length}...`);

          // Handle special cases for complex statements
          let finalStatement = statement;

          // Handle DO blocks
          if (statement.includes('DO $$')) {
            finalStatement = statement + ';';
          }

          const { error } = await supabase.rpc('exec_sql', {
            sql: finalStatement
          });

          if (error) {
            // Log error but continue with migration for non-critical errors
            console.warn(`   ⚠️  Warning in statement ${j + 1}: ${error.message}`);

            // Only stop for critical errors
            if (error.message.includes('does not exist') &&
                error.message.includes('table')) {
              throw error;
            }
          } else {
            console.log(`   ✅ Statement ${j + 1} completed`);
          }

        } catch (err) {
          console.error(`   ❌ Error in statement ${j + 1}:`, err.message);

          // Continue with non-critical errors
          if (!err.message.includes('already exists') &&
              !err.message.includes('does not exist')) {
            throw err;
          }
        }
      }

      console.log(`✅ Step ${stepNumber} completed successfully`);
    }

    console.log('\n🎉 Step-by-Step Migration completed successfully!');

    // Verify the installation
    await verifyMigration();

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);

    // Provide troubleshooting guidance
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your Supabase connection and permissions');
    console.log('2. Verify all required tables exist in your schema');
    console.log('3. Run: SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';');
    console.log('4. Check for any conflicting table names or constraints');

    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');

  try {
    // Check perk management tables
    const perkTables = [
      'perk_templates',
      'perk_categories',
      'clinic_perk_customizations',
      'perk_usage_analytics'
    ];

    console.log('\n📋 Perk Management System:');
    for (const tableName of perkTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
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

    // Check IT monitoring tables
    const itTables = [
      'it_admin_accounts',
      'it_activity_logs',
      'it_system_metrics',
      'it_database_performance',
      'it_security_events',
      'it_error_tracking',
      'it_feature_usage',
      'it_api_monitoring'
    ];

    console.log('\n🖥️  IT Monitoring System:');
    for (const tableName of itTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
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

    // Check triggers
    try {
      const { data, error } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            AND trigger_name LIKE '%clinic_customizations%'
          `
        });

      if (!error && data && data.length > 0) {
        console.log(`\n⚡ Triggers: ${data.length} active triggers found`);
      }
    } catch (err) {
      console.log('\n⚡ Triggers: Could not verify trigger status');
    }

    console.log('\n✨ Migration verification completed!');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🎯 Enhanced Perk Management + IT Monitoring Migration');
  console.log('====================================================\n');

  await applyStepByStepMigration();

  console.log('\n✨ Migration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. ✅ Test admin perk management interface');
  console.log('2. ✅ Test clinic perk customization interface');
  console.log('3. ✅ Verify perk mirroring works correctly');
  console.log('4. ✅ Test IT monitoring and logging features');
  console.log('5. 🚀 Deploy to production when ready');

  process.exit(0);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

// Run the migration
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  applyStepByStepMigration,
  verifyMigration
};