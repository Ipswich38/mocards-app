import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function populateDefaultData() {
  console.log('🚀 Populating default perk data...');

  try {
    // Insert default categories
    console.log('📂 Creating perk categories...');
    const { data: categories, error: catError } = await supabase
      .from('perk_categories')
      .insert([
        { name: 'Dental Services', description: 'General dental care services', display_order: 1 },
        { name: 'Diagnostics', description: 'X-rays, examinations and diagnostic procedures', display_order: 2 },
        { name: 'Preventive Care', description: 'Cleanings, fluoride treatments and preventive services', display_order: 3 },
        { name: 'Cosmetic', description: 'Teeth whitening, veneers and cosmetic procedures', display_order: 4 },
        { name: 'Orthodontics', description: 'Braces, aligners and orthodontic treatments', display_order: 5 },
        { name: 'Oral Surgery', description: 'Extractions, implants and surgical procedures', display_order: 6 },
        { name: 'Restorative', description: 'Fillings, crowns, bridges and restorative work', display_order: 7 },
        { name: 'Custom Services', description: 'Clinic-specific custom services', display_order: 8 }
      ])
      .select();

    if (catError) {
      console.warn('⚠️  Categories warning:', catError.message);
    } else {
      console.log(`✅ Created ${categories?.length || 0} categories`);
    }

    // Insert default perk templates
    console.log('🎯 Creating perk templates...');
    const { data: templates, error: tempError } = await supabase
      .from('perk_templates')
      .insert([
        {
          name: 'Dental Consultation',
          description: 'Comprehensive dental examination and consultation',
          perk_type: 'consultation',
          default_value: 500.00,
          category: 'Dental Services',
          icon: 'stethoscope',
          is_system_default: true
        },
        {
          name: 'Dental Cleaning',
          description: 'Professional dental cleaning and polishing',
          perk_type: 'cleaning',
          default_value: 800.00,
          category: 'Preventive Care',
          icon: 'sparkles',
          is_system_default: true
        },
        {
          name: 'Tooth Extraction',
          description: 'Simple tooth extraction procedure',
          perk_type: 'extraction',
          default_value: 1500.00,
          category: 'Oral Surgery',
          icon: 'scissors',
          is_system_default: true
        },
        {
          name: 'Fluoride Treatment',
          description: 'Fluoride application for cavity prevention',
          perk_type: 'fluoride',
          default_value: 300.00,
          category: 'Preventive Care',
          icon: 'shield',
          is_system_default: true
        },
        {
          name: 'Teeth Whitening',
          description: 'Professional teeth whitening treatment',
          perk_type: 'whitening',
          default_value: 2500.00,
          category: 'Cosmetic',
          icon: 'sun',
          is_system_default: true
        },
        {
          name: 'Dental X-Ray',
          description: 'Digital dental radiograph',
          perk_type: 'xray',
          default_value: 1000.00,
          category: 'Diagnostics',
          icon: 'camera',
          is_system_default: true
        },
        {
          name: 'Denture Service',
          description: 'Partial or complete denture fitting',
          perk_type: 'denture',
          default_value: 3000.00,
          category: 'Restorative',
          icon: 'smile',
          is_system_default: true
        },
        {
          name: 'Braces Consultation',
          description: 'Orthodontic consultation and treatment planning',
          perk_type: 'braces',
          default_value: 5000.00,
          category: 'Orthodontics',
          icon: 'grid',
          is_system_default: true
        },
        {
          name: 'Dental Filling',
          description: 'Composite or amalgam dental filling',
          perk_type: 'filling',
          default_value: 1200.00,
          category: 'Restorative',
          icon: 'disc',
          is_system_default: true
        },
        {
          name: 'Root Canal Treatment',
          description: 'Endodontic root canal therapy',
          perk_type: 'root_canal',
          default_value: 4000.00,
          category: 'Restorative',
          icon: 'activity',
          is_system_default: true
        }
      ])
      .select();

    if (tempError) {
      console.warn('⚠️  Templates warning:', tempError.message);
    } else {
      console.log(`✅ Created ${templates?.length || 0} templates`);
    }

    console.log('\n✨ Default data population completed!');

    // Verify the data
    await verifyData();

  } catch (error) {
    console.error('❌ Failed to populate default data:', error.message);
    process.exit(1);
  }
}

async function verifyData() {
  console.log('\n🔍 Verifying populated data...');

  try {
    const { data: categories } = await supabase
      .from('perk_categories')
      .select('*');

    console.log(`📂 Perk categories: ${categories?.length || 0}`);

    const { data: templates } = await supabase
      .from('perk_templates')
      .select('*');

    console.log(`🎯 Perk templates: ${templates?.length || 0}`);

    if (templates && templates.length > 0) {
      console.log('\n📋 Available templates:');
      templates.forEach(template => {
        console.log(`   • ${template.name} (₱${template.default_value})`);
      });
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🎯 Default Perk Data Population');
  console.log('===============================\n');

  await populateDefaultData();
  process.exit(0);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { populateDefaultData, verifyData };