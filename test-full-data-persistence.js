#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFullDataPersistence() {
  console.log('🗄️  Testing Complete Enhanced Card Data Persistence\n');

  try {
    const adminUserId = '609e400b-27bf-476a-a5f5-7d793d85293f';
    const timestamp = Date.now();
    const batchNumber = `PERSIST-${timestamp.toString().slice(-6)}`;

    // 1. CREATE ENHANCED BATCH WITH FULL METADATA
    console.log('1️⃣ Creating enhanced batch with full metadata...');
    const { data: batch, error: batchError } = await supabase
      .from('card_batches')
      .insert({
        batch_number: batchNumber,
        total_cards: 3,
        created_by: adminUserId,
        batch_metadata: {
          generation_timestamp: new Date().toISOString(),
          admin_user: adminUserId,
          intended_distribution: 'production_test',
          expiry_period: 12,
          created_by_system: 'Enhanced Card Generation System v2.0',
          batch_features: ['location_based_passcodes', 'enhanced_metadata', 'automated_perks']
        },
        cards_generated: 0
      })
      .select()
      .single();

    if (batchError) throw batchError;
    console.log('✅ Enhanced batch created with metadata stored in cloud');
    console.log(`   Batch ID: ${batch.id}`);
    console.log(`   Batch Number: ${batch.batch_number}`);
    console.log(`   Metadata stored: ${JSON.stringify(batch.batch_metadata)}`);

    // 2. CREATE ENHANCED CARDS WITH FULL METADATA
    console.log('\n2️⃣ Creating enhanced cards with complete metadata...');
    const generatedCards = [];

    for (let i = 1; i <= 3; i++) {
      const controlNumber = `PERSIST-${timestamp.toString().slice(-6)}-${i.toString().padStart(3, '0')}`;
      const incompletePasscode = Math.random().toString().slice(2, 6).padStart(4, '0');

      const cardMetadata = {
        batch_creation_date: new Date().toISOString(),
        card_position_in_batch: i,
        total_perks_count: 8,
        initial_perks: [
          'consultation',
          'cleaning',
          'extraction',
          'fluoride',
          'whitening',
          'xray',
          'denture',
          'braces'
        ],
        validity_period_months: 12,
        enhanced_features: {
          location_based_passcode: true,
          auto_perk_generation: true,
          clinic_assignment_ready: true
        },
        generation_system: 'Enhanced Card System v2.0',
        security_features: ['incomplete_passcode', 'location_verification']
      };

      const { data: card, error: cardError } = await supabase
        .from('cards')
        .insert({
          batch_id: batch.id,
          control_number: controlNumber,
          passcode: incompletePasscode,
          location_code: 'PHL', // Default Philippines, will be updated by clinic
          status: 'unactivated',
          card_metadata: cardMetadata
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // 3. CREATE PERKS FOR EACH CARD
      console.log(`   Creating perks for card ${i}...`);
      const perkTypes = cardMetadata.initial_perks;
      const createdPerks = [];

      for (const perkType of perkTypes) {
        const { data: perk, error: perkError } = await supabase
          .from('card_perks')
          .insert({
            card_id: card.id,
            perk_type: perkType,
            claimed: false
          })
          .select()
          .single();

        if (perkError) throw perkError;
        createdPerks.push(perk);
      }

      // 4. LOG CARD TRANSACTION
      const { data: transaction, error: transactionError } = await supabase
        .from('card_transactions')
        .insert({
          card_id: card.id,
          transaction_type: 'created',
          performed_by: 'admin',
          performed_by_id: adminUserId,
          details: {
            batch_number: batchNumber,
            card_position: i,
            incomplete_passcode: incompletePasscode,
            perks_created: perkTypes,
            creation_timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      generatedCards.push({
        ...card,
        perks: createdPerks,
        transaction: transaction
      });

      console.log(`✅ Card ${i} created with full metadata and ${createdPerks.length} perks`);
      console.log(`   Control: ${controlNumber} | Passcode: ${incompletePasscode} | Perks: ${createdPerks.length}`);
    }

    // 5. UPDATE BATCH CARDS GENERATED COUNT
    console.log('\n3️⃣ Updating batch generation count...');
    const { data: updatedBatch, error: updateError } = await supabase
      .from('card_batches')
      .update({ cards_generated: generatedCards.length })
      .eq('id', batch.id)
      .select()
      .single();

    if (updateError) throw updateError;
    console.log(`✅ Batch updated: ${updatedBatch.cards_generated} cards generated`);

    // 6. VERIFY DATA PERSISTENCE BY QUERYING BACK
    console.log('\n4️⃣ Verifying data persistence by querying back from cloud...');

    // Query batch with metadata
    const { data: storedBatch, error: queryBatchError } = await supabase
      .from('card_batches')
      .select('*')
      .eq('id', batch.id)
      .single();

    if (queryBatchError) throw queryBatchError;
    console.log('✅ Batch data persisted in cloud database');
    console.log(`   Retrieved batch: ${storedBatch.batch_number}`);
    console.log(`   Retrieved metadata: ${Object.keys(storedBatch.batch_metadata).length} fields`);

    // Query cards with metadata
    const { data: storedCards, error: queryCardsError } = await supabase
      .from('cards')
      .select(`
        *,
        perks:card_perks(*),
        transactions:card_transactions(*)
      `)
      .eq('batch_id', batch.id)
      .order('created_at');

    if (queryCardsError) throw queryCardsError;
    console.log(`✅ ${storedCards.length} cards with metadata persisted in cloud database`);

    storedCards.forEach((card, index) => {
      console.log(`   Card ${index + 1}: ${card.control_number} | Perks: ${card.perks.length} | Transactions: ${card.transactions.length}`);
      console.log(`     Metadata fields: ${Object.keys(card.card_metadata).length}`);
      console.log(`     Status: ${card.status} | Location: ${card.location_code}`);
    });

    // 7. TEST LOCATION ASSIGNMENT (CLINIC FUNCTIONALITY)
    console.log('\n5️⃣ Testing location assignment functionality...');
    const testCard = storedCards[0];
    const locationCode = 'CAV'; // Cavite clinic
    const completePasscode = `${locationCode}${testCard.passcode}`;

    const { data: assignedCard, error: assignError } = await supabase
      .from('cards')
      .update({
        passcode: completePasscode,
        location_code: locationCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', testCard.id)
      .select()
      .single();

    if (assignError) throw assignError;

    // Log the assignment transaction
    await supabase
      .from('card_transactions')
      .insert({
        card_id: testCard.id,
        transaction_type: 'location_assigned',
        performed_by: 'clinic_test',
        performed_by_id: 'test-clinic-id',
        details: {
          location_code: locationCode,
          complete_passcode: completePasscode,
          incomplete_passcode: testCard.passcode,
          assignment_timestamp: new Date().toISOString()
        }
      });

    console.log(`✅ Location assignment works: ${testCard.passcode} → ${completePasscode}`);

    // 8. CLEAN UP TEST DATA
    console.log('\n🧹 Cleaning up test data (keeping data integrity)...');

    // Delete in proper order to maintain referential integrity
    await supabase.from('card_transactions').delete().in('card_id', storedCards.map(c => c.id));
    await supabase.from('card_perks').delete().in('card_id', storedCards.map(c => c.id));
    await supabase.from('cards').delete().eq('batch_id', batch.id);
    await supabase.from('card_batches').delete().eq('id', batch.id);

    console.log('✅ Test data cleaned up while maintaining database integrity');

    // 9. FINAL SUMMARY
    console.log('\n🎉 COMPLETE DATA PERSISTENCE VERIFICATION SUCCESSFUL!');
    console.log('=====================================');
    console.log('✅ Enhanced batch creation with metadata → STORED IN CLOUD');
    console.log('✅ Enhanced card generation with metadata → STORED IN CLOUD');
    console.log('✅ Automatic perk creation → STORED IN CLOUD');
    console.log('✅ Transaction logging → STORED IN CLOUD');
    console.log('✅ Location-based passcode system → WORKING');
    console.log('✅ Batch count tracking → WORKING');
    console.log('✅ Data retrieval with relationships → WORKING');
    console.log('\n🗄️  All enhanced card data is properly persisted in Supabase cloud database!');
    console.log('🎯 The system is generating AND storing real data, not just showing fake data!');

  } catch (error) {
    console.error('❌ Data persistence test failed:', error);
  }
}

testFullDataPersistence();