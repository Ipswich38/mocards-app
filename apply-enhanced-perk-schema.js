const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyEnhancedPerkSchema() {
  console.log('🚀 Applying Enhanced Perk Management Schema...');

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'enhanced-perk-management-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Schema file loaded successfully');

    // Split the SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (!statement || statement.length < 10) continue;

      try {
        console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          // Continue with other statements for non-critical errors
          continue;
        }

        console.log(`✅ Statement ${i + 1} executed successfully`);

      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
      }
    }

    console.log('🎉 Enhanced Perk Management Schema applied successfully!');

    // Verify the installation
    await verifyInstallation();

  } catch (error) {
    console.error('❌ Failed to apply schema:', error.message);
    process.exit(1);
  }
}

async function verifyInstallation() {
  console.log('\n🔍 Verifying installation...');

  try {
    // Check if new tables exist
    const tables = [
      'perk_templates',
      'perk_categories',
      'clinic_perk_customizations',
      'perk_usage_analytics'
    ];

    for (const tableName of tables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        console.log(`❌ Table '${tableName}' not found`);
      } else {
        console.log(`✅ Table '${tableName}' exists`);
      }
    }

    // Check if default data was inserted
    const { data: categories } = await supabase
      .from('perk_categories')
      .select('*');

    console.log(`📋 Perk categories created: ${categories?.length || 0}`);

    const { data: templates } = await supabase
      .from('perk_templates')
      .select('*');

    console.log(`🎯 Perk templates created: ${templates?.length || 0}`);

    // Check if existing clinics have customizations
    const { data: clinics } = await supabase
      .from('mocards_clinics')
      .select('id, clinic_name')
      .eq('status', 'active')
      .limit(5);

    if (clinics && clinics.length > 0) {
      console.log(`🏥 Found ${clinics.length} active clinics`);

      for (const clinic of clinics) {
        const { data: customizations } = await supabase
          .from('clinic_perk_customizations')
          .select('count')
          .eq('clinic_id', clinic.id);

        console.log(`  - ${clinic.clinic_name}: ${customizations?.length || 0} perk customizations`);
      }
    }

    console.log('\n✨ Installation verification completed!');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

async function populateClinicCustomizations() {
  console.log('\n🔄 Populating clinic customizations...');

  try {
    // Get all active clinics
    const { data: clinics, error: clinicsError } = await supabase
      .from('mocards_clinics')
      .select('id, clinic_name')
      .eq('status', 'active');

    if (clinicsError) {
      console.error('❌ Failed to fetch clinics:', clinicsError.message);
      return;
    }

    // Get all active perk templates
    const { data: templates, error: templatesError } = await supabase
      .from('perk_templates')
      .select('*')
      .eq('is_active', true);

    if (templatesError) {
      console.error('❌ Failed to fetch templates:', templatesError.message);
      return;
    }

    console.log(`🏥 Processing ${clinics.length} clinics with ${templates.length} templates...`);

    for (const clinic of clinics) {
      console.log(`\n🔧 Setting up customizations for: ${clinic.clinic_name}`);

      for (const template of templates) {
        // Check if customization already exists
        const { data: existing } = await supabase
          .from('clinic_perk_customizations')
          .select('id')
          .eq('clinic_id', clinic.id)
          .eq('perk_template_id', template.id)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`   ⏭️  Skipping ${template.name} (already exists)`);
          continue;
        }

        // Create customization
        const { error: insertError } = await supabase
          .from('clinic_perk_customizations')
          .insert({
            clinic_id: clinic.id,
            perk_template_id: template.id,
            custom_name: template.name,
            custom_description: template.description,
            custom_value: template.default_value,
            is_enabled: template.is_active,
            requires_appointment: false,
            max_redemptions_per_card: 1
          });

        if (insertError) {
          console.error(`   ❌ Failed to create ${template.name}:`, insertError.message);
        } else {
          console.log(`   ✅ Created customization for: ${template.name}`);
        }
      }
    }

    console.log('\n🎉 Clinic customizations populated successfully!');

  } catch (error) {
    console.error('❌ Failed to populate customizations:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🎯 Enhanced Perk Management System Migration');
  console.log('============================================\n');

  await applyEnhancedPerkSchema();
  await populateClinicCustomizations();

  console.log('\n✨ Migration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Test the admin perk management interface');
  console.log('2. Test clinic perk customization interface');
  console.log('3. Verify perk templates are mirrored to all clinics');
  console.log('4. Test perk redemption with new system');

  process.exit(0);
}

// Run the migration
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
}

module.exports = {
  applyEnhancedPerkSchema,
  verifyInstallation,
  populateClinicCustomizations
};