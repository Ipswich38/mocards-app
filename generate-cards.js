import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDcwODIsImV4cCI6MjA3NTc4MzA4Mn0.TSbnvPKWiDdEFbyOh38qj_L87LZ75p3FiOW05hzEBlM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to generate a random passcode
function generateRandomPasscode() {
  return Math.floor(Math.random() * 999999).toString().padStart(6, '0');
}

async function generateCards() {
  console.log('🚀 Starting generation of 10,000 MOC cards...');

  try {
    // First, check if V2 cards already exist
    const { count: existingCount } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('migration_version', 2);

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing V2 cards. Clearing them first...`);
      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .eq('migration_version', 2);

      if (deleteError) {
        console.error('❌ Error deleting existing V2 cards:', deleteError);
        return;
      }
      console.log('✅ Cleared existing V2 cards');
    }

    // Generate cards in batches of 500 to avoid memory issues
    const batchSize = 500;
    const totalCards = 10000;
    const batches = Math.ceil(totalCards / batchSize);

    console.log(`📦 Generating ${totalCards} cards in ${batches} batches of ${batchSize}...`);

    for (let batch = 0; batch < batches; batch++) {
      const startNum = (batch * batchSize) + 1;
      const endNum = Math.min(startNum + batchSize - 1, totalCards);
      const cardsInBatch = endNum - startNum + 1;

      console.log(`Processing batch ${batch + 1}/${batches}: Cards ${startNum} to ${endNum} (${cardsInBatch} cards)`);

      const cardsToInsert = [];
      for (let i = 0; i < cardsInBatch; i++) {
        const cardNumber = startNum + i;
        cardsToInsert.push({
          control_number: `MOC-XX-XX-${cardNumber.toString().padStart(5, '0')}`, // Original field for compatibility
          passcode: generateRandomPasscode(),
          location_code: 'XX', // Placeholder for original field
          control_number_v2: `MOC-XX-XX-${cardNumber.toString().padStart(5, '0')}`,
          card_number: cardNumber,
          location_code_v2: null,
          clinic_code_v2: null,
          is_activated: false,
          status: 'unassigned',
          migration_version: 2
        });
      }

      // Insert the batch
      const { data, error } = await supabase
        .from('cards')
        .insert(cardsToInsert);

      if (error) {
        console.error(`❌ Error inserting batch ${batch + 1}:`, error);
        return;
      }

      console.log(`✅ Successfully inserted batch ${batch + 1}/${batches}`);

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify the generation
    console.log('🔍 Verifying card generation...');
    const { count: verification, error: verifyError } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('migration_version', 2);

    if (verifyError) {
      console.error('❌ Error verifying cards:', verifyError);
      return;
    }

    // Get detailed stats
    const { data: stats, error: statsError } = await supabase
      .rpc('get_card_stats_v2');

    if (statsError) {
      console.error('⚠️  Could not fetch detailed stats:', statsError);
    }

    // Show sample cards
    const { data: sampleCards, error: sampleError } = await supabase
      .from('cards')
      .select('control_number_v2, card_number, status, is_activated, created_at')
      .eq('migration_version', 2)
      .order('card_number')
      .limit(10);

    if (sampleError) {
      console.error('⚠️  Could not fetch sample cards:', sampleError);
    } else {
      console.log('\n📋 Sample Generated Cards:');
      sampleCards.forEach(card => {
        console.log(`  • ${card.control_number_v2} | Card #${card.card_number} | Status: ${card.status} | Activated: ${card.is_activated}`);
      });
    }

    console.log(`\n✅ SUCCESS! Generated ${verification} MOC cards with format MOC-XX-XX-NNNNN`);
    console.log('📊 Summary:');
    console.log(`  • Total Cards: ${verification}`);
    console.log(`  • Format: MOC-XX-XX-00001 to MOC-XX-XX-${verification.toString().padStart(5, '0')}`);
    console.log(`  • Status: All cards are unactivated (unassigned)`);
    console.log(`  • Migration Version: 2`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('  • Cards can now be activated through the Card Activation module');
    console.log('  • Location codes (XX) will be assigned during activation');
    console.log('  • Clinic codes (XX) will be assigned during activation');
    console.log('  • Final format after activation: MOC-01-1234-00001');

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

// Run the generation
generateCards().then(() => {
  console.log('🏁 Card generation process completed');
}).catch(error => {
  console.error('💥 Unhandled error:', error);
});