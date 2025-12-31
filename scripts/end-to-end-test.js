#!/usr/bin/env node

/**
 * MOCARDS CLOUD - End-to-End Testing Script
 * Comprehensive testing to ensure 100% business functionality
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class E2ETester {
  constructor() {
    this.testResults = [];
    this.testData = {
      testClinic: null,
      testCards: [],
      testAppointments: []
    };
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 Testing: ${name}...`);
    const startTime = Date.now();

    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.testResults.push({ name, status: 'PASS', duration });
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({ name, status: 'FAIL', duration, error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      throw error;
    }
  }

  async testDatabaseConnectivity() {
    const { data, error } = await supabase
      .from('perks')
      .select('id')
      .limit(1);

    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      throw new Error('Database returned invalid data structure');
    }
  }

  async testClinicCreation() {
    const clinic = {
      name: 'Test Clinic E2E',
      username: `testclinic${Date.now()}`,
      region: '4A',
      plan: 'starter',
      code: `TEST${Date.now()}`,
      area_code: 'TEST',
      password_hash: 'test_password_hash_' + Date.now(),
      subscription_status: 'active',
      max_cards_allowed: 500,
      is_active: true,
      cards_generated_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('clinics')
      .insert(clinic)
      .select()
      .single();

    if (error) {
      throw new Error(`Clinic creation failed: ${error.message}`);
    }

    this.testData.testClinic = data;
    console.log(`   📋 Created test clinic: ${data.name} (${data.code})`);
  }

  async testCardGeneration() {
    if (!this.testData.testClinic) {
      throw new Error('Test clinic not available');
    }

    const cards = [];
    for (let i = 1; i <= 3; i++) {
      const card = {
        control_number: `TEST-${Date.now()}-${i}`,
        full_name: 'Test Patient ' + i,
        status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('cards')
        .insert(card)
        .select()
        .single();

      if (error) {
        throw new Error(`Card generation failed: ${error.message}`);
      }

      cards.push(data);
    }

    this.testData.testCards = cards;
    console.log(`   📋 Generated ${cards.length} test cards`);
  }

  async testCardLookup() {
    if (this.testData.testCards.length === 0) {
      throw new Error('No test cards available');
    }

    const testCard = this.testData.testCards[0];

    // Test exact lookup
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('control_number', testCard.control_number)
      .single();

    if (error) {
      throw new Error(`Card lookup failed: ${error.message}`);
    }

    if (data.control_number !== testCard.control_number) {
      throw new Error('Card lookup returned incorrect card');
    }

    console.log(`   📋 Successfully looked up card: ${data.control_number}`);
  }

  async testAppointmentBooking() {
    if (!this.testData.testClinic || this.testData.testCards.length === 0) {
      throw new Error('Test clinic or cards not available');
    }

    const appointment = {
      control_number: this.testData.testCards[0].control_number,
      clinic_id: this.testData.testClinic.id,
      patient_name: 'Test Patient E2E',
      patient_email: 'test@example.com',
      patient_phone: '09123456789',
      date: '2025-01-15',
      time: '10:00',
      service: 'Consultation',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();

    if (error) {
      throw new Error(`Appointment booking failed: ${error.message}`);
    }

    this.testData.testAppointments.push(data);
    console.log(`   📋 Booked test appointment: ${data.patient_name}`);
  }

  async testPerkRedemption() {
    if (!this.testData.testClinic || this.testData.testCards.length === 0) {
      throw new Error('Test clinic or cards not available');
    }

    const redemption = {
      card_control_number: this.testData.testCards[0].control_number,
      perk_id: 'test_perk_id',
      perk_name: 'Test Perk Redemption',
      clinic_id: this.testData.testClinic.id,
      claimant_name: 'Test Patient E2E',
      handled_by: 'Test Staff',
      service_type: 'Dental Cleaning',
      used_at: new Date().toISOString(),
      perk_value: 500
    };

    const { data, error } = await supabase
      .from('perk_redemptions')
      .insert(redemption)
      .select()
      .single();

    if (error) {
      throw new Error(`Perk redemption failed: ${error.message}`);
    }

    console.log(`   📋 Redeemed test perk: ${data.perk_name}`);
  }

  async testDataRetrieval() {
    // Test retrieving all data types
    const tests = [
      { table: 'cards', description: 'cards' },
      { table: 'clinics', description: 'clinics' },
      { table: 'appointments', description: 'appointments' },
      { table: 'perks', description: 'perks' },
      { table: 'perk_redemptions', description: 'perk redemptions' }
    ];

    for (const test of tests) {
      const { data, error } = await supabase
        .from(test.table)
        .select('*')
        .limit(10);

      if (error) {
        throw new Error(`Failed to retrieve ${test.description}: ${error.message}`);
      }

      console.log(`   📋 Retrieved ${data.length} ${test.description}`);
    }
  }

  async testPerformance() {
    const performanceTests = [
      {
        name: 'Card Search Performance',
        test: async () => {
          const start = Date.now();
          await supabase.from('cards').select('*').limit(100);
          return Date.now() - start;
        },
        threshold: 2000
      },
      {
        name: 'Clinic Data Retrieval',
        test: async () => {
          const start = Date.now();
          await supabase.from('clinics').select('*');
          return Date.now() - start;
        },
        threshold: 1500
      },
      {
        name: 'Appointment Query',
        test: async () => {
          const start = Date.now();
          await supabase.from('appointments').select('*').limit(50);
          return Date.now() - start;
        },
        threshold: 1500
      }
    ];

    for (const perfTest of performanceTests) {
      const duration = await perfTest.test();
      console.log(`   📋 ${perfTest.name}: ${duration}ms`);

      if (duration > perfTest.threshold) {
        console.warn(`   ⚠️ Performance warning: ${perfTest.name} took ${duration}ms (threshold: ${perfTest.threshold}ms)`);
      }
    }
  }

  async cleanupTestData() {
    console.log('\n🧹 Cleaning up test data...');

    // Delete test appointments
    if (this.testData.testAppointments.length > 0) {
      const appointmentIds = this.testData.testAppointments.map(a => a.id);
      await supabase.from('appointments').delete().in('id', appointmentIds);
      console.log(`   ✅ Deleted ${appointmentIds.length} test appointments`);
    }

    // Delete test perk redemptions
    const { data: redemptions } = await supabase
      .from('perk_redemptions')
      .select('id')
      .like('perk_name', '%Test Perk%');

    if (redemptions && redemptions.length > 0) {
      const redemptionIds = redemptions.map(r => r.id);
      await supabase.from('perk_redemptions').delete().in('id', redemptionIds);
      console.log(`   ✅ Deleted ${redemptionIds.length} test perk redemptions`);
    }

    // Delete test cards
    if (this.testData.testCards.length > 0) {
      const cardIds = this.testData.testCards.map(c => c.id);
      await supabase.from('cards').delete().in('id', cardIds);
      console.log(`   ✅ Deleted ${cardIds.length} test cards`);
    }

    // Delete test clinic
    if (this.testData.testClinic) {
      await supabase.from('clinics').delete().eq('id', this.testData.testClinic.id);
      console.log(`   ✅ Deleted test clinic: ${this.testData.testClinic.name}`);
    }
  }

  generateReport() {
    const passed = this.testResults.filter(r => r.status === 'PASS');
    const failed = this.testResults.filter(r => r.status === 'FAIL');
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n' + '='.repeat(60));
    console.log('📊 END-TO-END TEST REPORT');
    console.log('='.repeat(60));
    console.log(`✅ Tests Passed: ${passed.length}`);
    console.log(`❌ Tests Failed: ${failed.length}`);
    console.log(`⏱️ Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${Math.round((passed.length / this.testResults.length) * 100)}%`);

    if (failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failed.forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
    }

    const status = failed.length === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED';
    const icon = failed.length === 0 ? '🎉' : '🚨';

    console.log(`\n${icon} ${status} - BUSINESS READINESS: ${failed.length === 0 ? '100%' : 'NEEDS ATTENTION'}`);
    console.log('='.repeat(60));
  }

  async runAllTests() {
    console.log('🚀 MOCARDS CLOUD - END-TO-END BUSINESS TESTING');
    console.log('Testing complete business workflow for production readiness...\n');

    try {
      await this.runTest('Database Connectivity', () => this.testDatabaseConnectivity());
      await this.runTest('Clinic Creation', () => this.testClinicCreation());
      await this.runTest('Card Generation', () => this.testCardGeneration());
      await this.runTest('Card Lookup', () => this.testCardLookup());
      await this.runTest('Appointment Booking', () => this.testAppointmentBooking());
      await this.runTest('Perk Redemption', () => this.testPerkRedemption());
      await this.runTest('Data Retrieval', () => this.testDataRetrieval());
      await this.runTest('Performance Testing', () => this.testPerformance());

    } catch (error) {
      console.error(`\n🚨 Critical test failure: ${error.message}`);
    } finally {
      await this.cleanupTestData();
      this.generateReport();
    }
  }
}

// Run the tests
const tester = new E2ETester();
tester.runAllTests();