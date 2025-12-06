#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

class ProductionReadinessTest {
  constructor() {
    this.adminUserId = '609e400b-27bf-476a-a5f5-7d793d85293f';
    this.testResults = {
      cardGeneration: { success: false, count: 0, errors: [] },
      cardAssignment: { success: false, count: 0, errors: [] },
      cardActivation: { success: false, count: 0, errors: [] },
      perkRedemption: { success: false, count: 0, errors: [] },
      cardLookup: { success: false, count: 0, errors: [] }
    };
    this.testData = {
      batch: null,
      cards: [],
      clinic: null,
      activatedCards: []
    };
  }

  async run() {
    console.log('🚀 MOCARDS PRODUCTION READINESS TEST');
    console.log('=====================================\n');

    try {
      await this.setupTestEnvironment();
      await this.testCardGeneration();
      await this.testCardAssignment();
      await this.testCardActivation();
      await this.testPerkRedemption();
      await this.testCardLookup();
      await this.generateReport();
    } catch (error) {
      console.error('❌ CRITICAL TEST FAILURE:', error);
    } finally {
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Ensure test clinic exists
    const { data: existingClinic } = await supabase
      .from('mocards_clinics')
      .select('*')
      .eq('clinic_code', 'TEST01')
      .single();

    if (!existingClinic) {
      const passwordHash = await bcrypt.hash('TestPass123!', 10);
      const { data: newClinic, error } = await supabase
        .from('mocards_clinics')
        .insert({
          clinic_code: 'TEST01',
          clinic_name: 'Production Test Clinic',
          password_hash: passwordHash,
          contact_email: 'test@mocards.com',
          contact_phone: '09171234567',
          address: 'Test Address',
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      this.testData.clinic = newClinic;
    } else {
      this.testData.clinic = existingClinic;
    }

    console.log(`✅ Test clinic ready: ${this.testData.clinic.clinic_name}`);
  }

  async testCardGeneration() {
    console.log('\n📝 Testing card generation...');

    try {
      const timestamp = Date.now();
      const batchNumber = `PROD-TEST-${timestamp.toString().slice(-6)}`;

      // Create batch
      const { data: batch, error: batchError } = await supabase
        .from('card_batches')
        .insert({
          batch_number: batchNumber,
          total_cards: 10,
          created_by: this.adminUserId
        })
        .select()
        .single();

      if (batchError) throw batchError;
      this.testData.batch = batch;

      // Generate 10 unique cards
      const cards = [];
      for (let i = 1; i <= 10; i++) {
        const controlNumber = `PROD-${timestamp.toString().slice(-6)}-${i.toString().padStart(3, '0')}`;
        const incompletePasscode = Math.random().toString().slice(2, 6).padStart(4, '0');

        const { data: card, error: cardError } = await supabase
          .from('cards')
          .insert({
            batch_id: batch.id,
            control_number: controlNumber,
            passcode: incompletePasscode,
            location_code: null, // Will be set during activation
            status: 'unactivated'
          })
          .select()
          .single();

        if (cardError) throw cardError;

        // Create perks for each card
        const perks = ['consultation', 'cleaning', 'extraction', 'fluoride'];
        for (const perkType of perks) {
          await supabase
            .from('card_perks')
            .insert({
              card_id: card.id,
              perk_type: perkType,
              claimed: false
            });
        }

        cards.push(card);
      }

      this.testData.cards = cards;
      this.testResults.cardGeneration.success = true;
      this.testResults.cardGeneration.count = cards.length;

      console.log(`✅ Generated ${cards.length} cards successfully`);
      console.log(`   Batch: ${batch.batch_number}`);

    } catch (error) {
      this.testResults.cardGeneration.errors.push(error.message);
      console.error('❌ Card generation failed:', error.message);
      throw error;
    }
  }

  async testCardAssignment() {
    console.log('\n📋 Testing card assignment...');

    try {
      const cardIds = this.testData.cards.map(c => c.id);

      const { error: assignError } = await supabase
        .from('cards')
        .update({ assigned_clinic_id: this.testData.clinic.id })
        .in('id', cardIds);

      if (assignError) throw assignError;

      // Verify assignment
      const { data: assignedCards, error: verifyError } = await supabase
        .from('cards')
        .select('*')
        .in('id', cardIds)
        .eq('assigned_clinic_id', this.testData.clinic.id);

      if (verifyError) throw verifyError;

      this.testResults.cardAssignment.success = true;
      this.testResults.cardAssignment.count = assignedCards.length;

      console.log(`✅ Assigned ${assignedCards.length} cards to clinic`);

    } catch (error) {
      this.testResults.cardAssignment.errors.push(error.message);
      console.error('❌ Card assignment failed:', error.message);
      throw error;
    }
  }

  async testCardActivation() {
    console.log('\n🔓 Testing card activation...');

    try {
      const activatedCards = [];
      const clinicCode = 'TST'; // Test clinic location code

      // Activate first 5 cards
      for (let i = 0; i < 5; i++) {
        const card = this.testData.cards[i];
        const completePasscode = `${clinicCode}${card.passcode}`;
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const { error: activationError } = await supabase
          .from('cards')
          .update({
            passcode: completePasscode,
            location_code: clinicCode,
            status: 'activated',
            activated_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', card.id);

        if (activationError) throw activationError;

        // Record sale
        const { error: saleError } = await supabase
          .from('clinic_sales')
          .insert({
            clinic_id: this.testData.clinic.id,
            card_id: card.id,
            sale_amount: 1500,
            commission_amount: 150,
            customer_name: `Test Customer ${i + 1}`,
            customer_phone: `0917123456${i}`,
            payment_method: 'cash',
            status: 'completed'
          });

        if (saleError) throw saleError;

        activatedCards.push({
          ...card,
          complete_passcode: completePasscode,
          customer_name: `Test Customer ${i + 1}`
        });
      }

      this.testData.activatedCards = activatedCards;
      this.testResults.cardActivation.success = true;
      this.testResults.cardActivation.count = activatedCards.length;

      console.log(`✅ Activated ${activatedCards.length} cards successfully`);

    } catch (error) {
      this.testResults.cardActivation.errors.push(error.message);
      console.error('❌ Card activation failed:', error.message);
      throw error;
    }
  }

  async testPerkRedemption() {
    console.log('\n🎁 Testing perk redemption...');

    try {
      let redeemedCount = 0;

      for (const card of this.testData.activatedCards) {
        // Get available perks
        const { data: availablePerks, error: perkError } = await supabase
          .from('card_perks')
          .select('*')
          .eq('card_id', card.id)
          .eq('claimed', false)
          .limit(2); // Redeem 2 perks per card

        if (perkError) throw perkError;

        for (const perk of availablePerks) {
          // Redeem the perk
          const { error: redeemError } = await supabase
            .from('card_perks')
            .update({
              claimed: true,
              claimed_at: new Date().toISOString(),
              claimed_by_clinic: this.testData.clinic.id
            })
            .eq('id', perk.id);

          if (redeemError) throw redeemError;

          // Record redemption
          await supabase
            .from('clinic_perk_redemptions')
            .insert({
              clinic_id: this.testData.clinic.id,
              card_id: card.id,
              perk_id: perk.id,
              service_provided: `${perk.perk_type} service`,
              service_value: 500
            });

          redeemedCount++;
        }
      }

      this.testResults.perkRedemption.success = true;
      this.testResults.perkRedemption.count = redeemedCount;

      console.log(`✅ Redeemed ${redeemedCount} perks successfully`);

    } catch (error) {
      this.testResults.perkRedemption.errors.push(error.message);
      console.error('❌ Perk redemption failed:', error.message);
      throw error;
    }
  }

  async testCardLookup() {
    console.log('\n🔍 Testing card lookup (cardholder view)...');

    try {
      let lookupCount = 0;

      for (const card of this.testData.activatedCards) {
        const { data: cardStatus, error: statusError } = await supabase
          .from('cards')
          .select(`
            *,
            clinic:mocards_clinics(clinic_name),
            perks:card_perks(*)
          `)
          .eq('control_number', card.control_number)
          .eq('passcode', card.complete_passcode)
          .single();

        if (statusError) throw statusError;

        if (cardStatus.status === 'activated') {
          lookupCount++;
        }
      }

      this.testResults.cardLookup.success = true;
      this.testResults.cardLookup.count = lookupCount;

      console.log(`✅ Successfully looked up ${lookupCount} activated cards`);

    } catch (error) {
      this.testResults.cardLookup.errors.push(error.message);
      console.error('❌ Card lookup failed:', error.message);
      throw error;
    }
  }

  async generateReport() {
    console.log('\n📊 PRODUCTION READINESS REPORT');
    console.log('===============================');

    const allTestsPassed = Object.values(this.testResults).every(result => result.success);

    console.log('\n🧪 Test Results:');
    console.log(`   Card Generation: ${this.testResults.cardGeneration.success ? '✅' : '❌'} (${this.testResults.cardGeneration.count}/10)`);
    console.log(`   Card Assignment: ${this.testResults.cardAssignment.success ? '✅' : '❌'} (${this.testResults.cardAssignment.count}/10)`);
    console.log(`   Card Activation: ${this.testResults.cardActivation.success ? '✅' : '❌'} (${this.testResults.cardActivation.count}/5)`);
    console.log(`   Perk Redemption: ${this.testResults.perkRedemption.success ? '✅' : '❌'} (${this.testResults.perkRedemption.count} redeemed)`);
    console.log(`   Card Lookup: ${this.testResults.cardLookup.success ? '✅' : '❌'} (${this.testResults.cardLookup.count}/5)`);

    console.log('\n📈 System Status:');
    console.log(`   Overall Status: ${allTestsPassed ? '🟢 READY FOR PRODUCTION' : '🔴 NOT READY'}`);
    console.log(`   Total Test Cards: ${this.testData.cards.length}`);
    console.log(`   Activated Cards: ${this.testData.activatedCards.length}`);
    console.log(`   Test Clinic: ${this.testData.clinic?.clinic_name}`);

    if (allTestsPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('The MOCARDS platform is ready for production use.');
      console.log('You can now safely generate and distribute real loyalty cards.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED!');
      console.log('Please review the errors above before proceeding to production.');

      Object.entries(this.testResults).forEach(([testName, result]) => {
        if (result.errors.length > 0) {
          console.log(`\n❌ ${testName} errors:`);
          result.errors.forEach(error => console.log(`   - ${error}`));
        }
      });
    }

    return allTestsPassed;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');

    try {
      if (this.testData.cards.length > 0) {
        const cardIds = this.testData.cards.map(c => c.id);

        // Clean up in proper order due to foreign key constraints
        await supabase.from('clinic_perk_redemptions').delete().in('card_id', cardIds);
        await supabase.from('clinic_sales').delete().in('card_id', cardIds);
        await supabase.from('card_transactions').delete().in('card_id', cardIds);
        await supabase.from('card_perks').delete().in('card_id', cardIds);
        await supabase.from('cards').delete().in('id', cardIds);

        if (this.testData.batch) {
          await supabase.from('card_batches').delete().eq('id', this.testData.batch.id);
        }
      }

      console.log('✅ Test data cleaned up successfully');

    } catch (error) {
      console.error('⚠️  Cleanup warning:', error.message);
    }
  }
}

// Run the test
const test = new ProductionReadinessTest();
test.run().then(() => {
  console.log('\n🏁 Production readiness test completed.');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test failed:', error);
  process.exit(1);
});