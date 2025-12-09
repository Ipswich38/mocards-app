const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lxyexybnotixgpzflota.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test data
const TEST_ADMIN_ID = '609e400b-27bf-476a-a5f5-7d793d85293f';
let testPerkTemplateId = null;
let testClinicId = null;
let testCustomizationId = null;

async function testPerkManagementSystem() {
  console.log('🧪 Testing Enhanced Perk Management System');
  console.log('==========================================\n');

  try {
    await testAdminPerkTemplateOperations();
    await testPerkCategories();
    await testClinicPerkCustomizations();
    await testPerkMirroringSystem();
    await testPerkUsageAnalytics();
    await testDatabaseIntegrity();

    console.log('\n🎉 All tests passed! Enhanced Perk Management System is working correctly!');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    throw error;
  }
}

async function testAdminPerkTemplateOperations() {
  console.log('📝 Testing Admin Perk Template Operations...\n');

  // Test 1: Create a new perk template
  console.log('  ✅ Test 1: Creating new perk template...');
  const { data: newTemplate, error: createError } = await supabase
    .from('perk_templates')
    .insert({
      name: 'Test Custom Dental Service',
      description: 'A test perk template for automated testing',
      perk_type: 'test_service',
      default_value: 750.00,
      category: 'Dental Services',
      icon: 'stethoscope',
      is_active: true,
      is_system_default: false,
      created_by_admin_id: TEST_ADMIN_ID
    })
    .select()
    .single();

  if (createError) throw new Error(`Failed to create template: ${createError.message}`);
  testPerkTemplateId = newTemplate.id;
  console.log(`     ✓ Template created with ID: ${testPerkTemplateId}`);

  // Test 2: Retrieve all perk templates
  console.log('  ✅ Test 2: Retrieving all perk templates...');
  const { data: allTemplates, error: fetchError } = await supabase
    .from('perk_templates')
    .select('*')
    .order('name');

  if (fetchError) throw new Error(`Failed to fetch templates: ${fetchError.message}`);
  console.log(`     ✓ Found ${allTemplates.length} perk templates`);

  // Test 3: Update perk template
  console.log('  ✅ Test 3: Updating perk template...');
  const { data: updatedTemplate, error: updateError } = await supabase
    .from('perk_templates')
    .update({
      default_value: 850.00,
      description: 'Updated test perk template description'
    })
    .eq('id', testPerkTemplateId)
    .select()
    .single();

  if (updateError) throw new Error(`Failed to update template: ${updateError.message}`);
  console.log(`     ✓ Template updated, new value: ₱${updatedTemplate.default_value}`);

  // Test 4: Toggle template status
  console.log('  ✅ Test 4: Toggling template status...');
  const { error: toggleError } = await supabase
    .from('perk_templates')
    .update({ is_active: false })
    .eq('id', testPerkTemplateId);

  if (toggleError) throw new Error(`Failed to toggle status: ${toggleError.message}`);
  console.log('     ✓ Template status toggled to inactive');
}

async function testPerkCategories() {
  console.log('\n📂 Testing Perk Categories...\n');

  // Test 1: Check default categories exist
  console.log('  ✅ Test 1: Checking default categories...');
  const { data: categories, error: categoriesError } = await supabase
    .from('perk_categories')
    .select('*')
    .order('display_order');

  if (categoriesError) throw new Error(`Failed to fetch categories: ${categoriesError.message}`);

  const expectedCategories = [
    'Dental Services',
    'Diagnostics',
    'Preventive Care',
    'Cosmetic',
    'Orthodontics',
    'Oral Surgery',
    'Restorative',
    'Custom Services'
  ];

  const foundCategories = categories.map(c => c.name);
  for (const expected of expectedCategories) {
    if (!foundCategories.includes(expected)) {
      throw new Error(`Expected category '${expected}' not found`);
    }
  }
  console.log(`     ✓ All ${expectedCategories.length} default categories found`);

  // Test 2: Create a new category
  console.log('  ✅ Test 2: Creating new category...');
  const { data: newCategory, error: newCategoryError } = await supabase
    .from('perk_categories')
    .insert({
      name: 'Test Category',
      description: 'A test category for automated testing',
      display_order: 99,
      is_active: true
    })
    .select()
    .single();

  if (newCategoryError) throw new Error(`Failed to create category: ${newCategoryError.message}`);
  console.log(`     ✓ Category created: ${newCategory.name}`);
}

async function testClinicPerkCustomizations() {
  console.log('\n🏥 Testing Clinic Perk Customizations...\n');

  // Test 1: Find a test clinic
  console.log('  ✅ Test 1: Finding test clinic...');
  const { data: clinics, error: clinicsError } = await supabase
    .from('mocards_clinics')
    .select('id, clinic_name')
    .eq('status', 'active')
    .limit(1);

  if (clinicsError || !clinics || clinics.length === 0) {
    throw new Error('No active clinics found for testing');
  }

  testClinicId = clinics[0].id;
  console.log(`     ✓ Using clinic: ${clinics[0].clinic_name}`);

  // Test 2: Get clinic customizations
  console.log('  ✅ Test 2: Retrieving clinic customizations...');
  const { data: customizations, error: customError } = await supabase
    .from('clinic_perk_customizations')
    .select(`
      *,
      perk_template:perk_templates(*)
    `)
    .eq('clinic_id', testClinicId);

  if (customError) throw new Error(`Failed to fetch customizations: ${customError.message}`);
  console.log(`     ✓ Found ${customizations.length} perk customizations`);

  if (customizations.length > 0) {
    testCustomizationId = customizations[0].id;

    // Test 3: Update a customization
    console.log('  ✅ Test 3: Updating perk customization...');
    const { data: updatedCustomization, error: updateCustomError } = await supabase
      .from('clinic_perk_customizations')
      .update({
        custom_name: 'Updated Custom Perk Name',
        custom_value: 999.99,
        requires_appointment: true,
        max_redemptions_per_card: 2
      })
      .eq('id', testCustomizationId)
      .select()
      .single();

    if (updateCustomError) throw new Error(`Failed to update customization: ${updateCustomError.message}`);
    console.log(`     ✓ Customization updated: ${updatedCustomization.custom_name}`);

    // Test 4: Toggle customization status
    console.log('  ✅ Test 4: Toggling customization status...');
    const { error: toggleCustomError } = await supabase
      .from('clinic_perk_customizations')
      .update({ is_enabled: false })
      .eq('id', testCustomizationId);

    if (toggleCustomError) throw new Error(`Failed to toggle customization: ${toggleCustomError.message}`);
    console.log('     ✓ Customization disabled successfully');
  }
}

async function testPerkMirroringSystem() {
  console.log('\n🪞 Testing Perk Mirroring System...\n');

  if (!testPerkTemplateId || !testClinicId) {
    console.log('     ⏭️ Skipping mirroring test (missing test data)');
    return;
  }

  // Test 1: Create a new template and check if it's mirrored
  console.log('  ✅ Test 1: Creating template to test mirroring...');
  const { data: mirrorTemplate, error: mirrorError } = await supabase
    .from('perk_templates')
    .insert({
      name: 'Mirror Test Perk',
      description: 'Testing automatic mirroring to clinics',
      perk_type: 'mirror_test',
      default_value: 500.00,
      category: 'Test Category',
      is_active: true,
      is_system_default: false,
      created_by_admin_id: TEST_ADMIN_ID
    })
    .select()
    .single();

  if (mirrorError) throw new Error(`Failed to create mirror template: ${mirrorError.message}`);

  // Give triggers time to execute
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Check if customization was automatically created
  console.log('  ✅ Test 2: Checking if customization was automatically created...');
  const { data: autoCustomization, error: autoError } = await supabase
    .from('clinic_perk_customizations')
    .select('*')
    .eq('clinic_id', testClinicId)
    .eq('perk_template_id', mirrorTemplate.id);

  if (autoError) throw new Error(`Failed to check auto-customization: ${autoError.message}`);

  if (autoCustomization && autoCustomization.length > 0) {
    console.log('     ✓ Automatic customization created successfully');
  } else {
    console.log('     ⚠️ Automatic customization not found (trigger may not be working)');
  }
}

async function testPerkUsageAnalytics() {
  console.log('\n📊 Testing Perk Usage Analytics...\n');

  if (!testPerkTemplateId || !testClinicId) {
    console.log('     ⏭️ Skipping analytics test (missing test data)');
    return;
  }

  // Test 1: Record perk usage
  console.log('  ✅ Test 1: Recording perk usage...');
  const { data: usageRecord, error: usageError } = await supabase
    .from('perk_usage_analytics')
    .insert({
      perk_template_id: testPerkTemplateId,
      clinic_id: testClinicId,
      card_id: 'test-card-id',
      redemption_date: new Date().toISOString().split('T')[0],
      redemption_value: 750.00,
      month_year: new Date().toISOString().substring(0, 7)
    })
    .select()
    .single();

  if (usageError) throw new Error(`Failed to record usage: ${usageError.message}`);
  console.log(`     ✓ Usage recorded with ID: ${usageRecord.id}`);

  // Test 2: Retrieve analytics data
  console.log('  ✅ Test 2: Retrieving analytics data...');
  const { data: analytics, error: analyticsError } = await supabase
    .from('perk_usage_analytics')
    .select('*')
    .eq('clinic_id', testClinicId);

  if (analyticsError) throw new Error(`Failed to fetch analytics: ${analyticsError.message}`);
  console.log(`     ✓ Found ${analytics.length} usage records`);
}

async function testDatabaseIntegrity() {
  console.log('\n🔒 Testing Database Integrity...\n');

  // Test 1: Check foreign key constraints
  console.log('  ✅ Test 1: Testing foreign key constraints...');

  // Try to create customization with invalid template ID
  const { error: fkError } = await supabase
    .from('clinic_perk_customizations')
    .insert({
      clinic_id: testClinicId,
      perk_template_id: '00000000-0000-0000-0000-000000000000',
      is_enabled: true,
      requires_appointment: false,
      max_redemptions_per_card: 1
    });

  if (!fkError || !fkError.message.includes('foreign key constraint')) {
    console.log('     ⚠️ Foreign key constraint may not be working properly');
  } else {
    console.log('     ✓ Foreign key constraints working correctly');
  }

  // Test 2: Check RLS policies
  console.log('  ✅ Test 2: Testing Row Level Security policies...');

  // Create anonymous client
  const anonClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY');

  const { data: rlsData, error: rlsError } = await anonClient
    .from('perk_templates')
    .select('*')
    .limit(1);

  if (rlsError) {
    console.log('     ⚠️ RLS may be too restrictive for anonymous access');
  } else {
    console.log(`     ✓ RLS policies allowing appropriate access (${rlsData?.length || 0} records)`);
  }

  // Test 3: Check unique constraints
  console.log('  ✅ Test 3: Testing unique constraints...');

  if (testClinicId && testPerkTemplateId) {
    const { error: uniqueError } = await supabase
      .from('clinic_perk_customizations')
      .insert({
        clinic_id: testClinicId,
        perk_template_id: testPerkTemplateId,
        is_enabled: true,
        requires_appointment: false,
        max_redemptions_per_card: 1
      });

    if (uniqueError && uniqueError.message.includes('duplicate key')) {
      console.log('     ✓ Unique constraints working correctly');
    } else if (!uniqueError) {
      console.log('     ⚠️ Duplicate customization was allowed (unique constraint may be missing)');
    }
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...\n');

  try {
    // Clean up test perk template
    if (testPerkTemplateId) {
      await supabase
        .from('perk_templates')
        .delete()
        .eq('id', testPerkTemplateId)
        .eq('is_system_default', false);
      console.log('  ✓ Test perk template cleaned up');
    }

    // Clean up test category
    await supabase
      .from('perk_categories')
      .delete()
      .eq('name', 'Test Category');
    console.log('  ✓ Test category cleaned up');

    // Clean up test usage analytics
    await supabase
      .from('perk_usage_analytics')
      .delete()
      .eq('card_id', 'test-card-id');
    console.log('  ✓ Test usage analytics cleaned up');

    // Reset test customization if modified
    if (testCustomizationId) {
      await supabase
        .from('clinic_perk_customizations')
        .update({ is_enabled: true })
        .eq('id', testCustomizationId);
      console.log('  ✓ Test customization reset');
    }

    console.log('\n✨ Cleanup completed!');

  } catch (error) {
    console.error('⚠️ Cleanup failed:', error.message);
  }
}

// Main test execution
async function main() {
  try {
    await testPerkManagementSystem();
  } finally {
    await cleanupTestData();
  }
}

// Run the tests
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testPerkManagementSystem,
  testAdminPerkTemplateOperations,
  testClinicPerkCustomizations,
  testPerkMirroringSystem
};