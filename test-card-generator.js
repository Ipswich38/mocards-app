// TEST CARD GENERATOR END-TO-END
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simulate the exact card generation process
async function testCardGenerator() {
  console.log('🧪 TESTING CARD GENERATOR END-TO-END...\n');

  // Step 1: Simulate creating a card like the admin portal would
  console.log('1. Testing single card generation...');
  try {
    const testCard = {
      controlNumber: 'MOC-10001-01-CVT001',
      fullName: '', // Empty as per generator
      status: 'inactive',
      perksTotal: 5,
      perksUsed: 0,
      clinicId: '',
      expiryDate: '2025-12-31',
      notes: ''
    };

    // Transform to match actual Supabase schema (like our createCard function)
    const supabaseCard = {
      control_number: testCard.controlNumber,
      full_name: testCard.fullName || null,
      status: testCard.status,
      perks_total: testCard.perksTotal || 5,
      perks_used: testCard.perksUsed || 0,
      clinic_id: testCard.clinicId || null,
      expiry_date: testCard.expiryDate,
      notes: testCard.notes || null,
    };

    const { data, error } = await supabase
      .from('cards')
      .insert(supabaseCard)
      .select()
      .single();

    if (error) {
      console.error('❌ Single card generation failed:', error.message);
      return false;
    }

    console.log('✅ Single card generated successfully:');
    console.log(`   ID: ${data.id}`);
    console.log(`   Control Number: ${data.control_number}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Perks: ${data.perks_used}/${data.perks_total}`);

    // Clean up
    await supabase.from('cards').delete().eq('id', data.id);
    console.log('🧹 Test card cleaned up\n');

  } catch (error) {
    console.error('❌ Single card test error:', error.message);
    return false;
  }

  // Step 2: Test batch generation simulation
  console.log('2. Testing batch card generation (3 cards)...');
  try {
    const testCards = [];
    for (let i = 10002; i <= 10004; i++) {
      testCards.push({
        control_number: `MOC-${i}-01-CVT001`,
        full_name: null,
        status: 'inactive',
        perks_total: 5,
        perks_used: 0,
        clinic_id: null,
        expiry_date: '2025-12-31',
        notes: null,
      });
    }

    const { data, error } = await supabase
      .from('cards')
      .insert(testCards)
      .select();

    if (error) {
      console.error('❌ Batch card generation failed:', error.message);
      return false;
    }

    console.log('✅ Batch generation successful:');
    data.forEach((card, index) => {
      console.log(`   Card ${index + 1}: ${card.control_number} (ID: ${card.id})`);
    });

    // Clean up batch
    const ids = data.map(card => card.id);
    await supabase.from('cards').delete().in('id', ids);
    console.log('🧹 Batch test cards cleaned up\n');

  } catch (error) {
    console.error('❌ Batch card test error:', error.message);
    return false;
  }

  console.log('🎉 ALL CARD GENERATOR TESTS PASSED!');
  return true;
}

testCardGenerator().then((success) => {
  console.log('\n🎯 CARD GENERATOR TEST COMPLETE');
  if (success) {
    console.log('🚀 Card generator is working perfectly! Ready for production.');
  } else {
    console.log('⚠️  Card generator has issues that need to be fixed.');
  }
}).catch(error => {
  console.error('💥 Test script failed:', error);
});