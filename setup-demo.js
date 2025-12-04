#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupMocards() {
  console.log('🚀 Setting up MOCARDS database...');

  try {
    // First, let's check if we need to run the database setup
    const { data: existingCards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .limit(1);

    const { data: existingAdmins, error: adminsError } = await supabase
      .from('admin_users')
      .select('*')
      .limit(1);

    if (cardsError && cardsError.code === 'PGRST204') {
      console.log('📋 MOCARDS tables not found. Setting up database...');

      // Read and execute the setup script
      const setupQuery = `
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Create tables if they don't exist
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS card_batches (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          batch_number VARCHAR(20) UNIQUE NOT NULL,
          total_cards INTEGER NOT NULL,
          created_by UUID REFERENCES admin_users(id),
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS cards (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          batch_id UUID REFERENCES card_batches(id),
          control_number VARCHAR(20) UNIQUE NOT NULL,
          passcode VARCHAR(6) NOT NULL,
          location_code VARCHAR(10) DEFAULT 'MO',
          status VARCHAR(20) DEFAULT 'unactivated',
          assigned_clinic_id UUID,
          activated_at TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS card_perks (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
          perk_type VARCHAR(50) NOT NULL,
          claimed BOOLEAN DEFAULT false,
          claimed_at TIMESTAMP,
          claimed_by_clinic VARCHAR(20),
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS card_transactions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          card_id UUID REFERENCES cards(id),
          transaction_type VARCHAR(50) NOT NULL,
          performed_by VARCHAR(50) NOT NULL,
          performed_by_id UUID,
          details JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      console.log('🔧 Creating MOCARDS tables...');
      const { error: setupError } = await supabase.rpc('exec_sql', { sql: setupQuery });

      if (setupError) {
        console.error('❌ Setup error:', setupError);
        return;
      }

      console.log('✅ MOCARDS tables created');
    } else {
      console.log('✅ MOCARDS tables already exist');
    }

    // Generate bcrypt hashes
    const demoPassword = await bcrypt.hash('demo123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // Check if we need to set up admin user
    if (adminsError && adminsError.code === 'PGRST204') {
      console.log('👤 Creating admin user...');

      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          username: 'admin',
          password_hash: adminPassword,
          role: 'superadmin'
        });

      if (adminError) {
        console.log('❌ Error creating admin:', adminError);
      } else {
        console.log('✅ Admin user created');
      }
    }

    // Check the existing clinics table
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('*')
      .limit(5);

    if (!clinicsError) {
      console.log('🏥 Found existing clinics table');

      // Check if we can add our demo clinic fields
      const demoClinic = clinics?.find(c => c.slug === 'demo001' || c.name?.includes('Demo'));

      if (!demoClinic) {
        console.log('🏥 Adding demo clinic data...');

        const { error: insertError } = await supabase
          .from('clinics')
          .insert({
            name: 'Demo Dental Clinic',
            slug: 'demo001',
            email: 'demo@clinic.com',
            phone: '555-0123',
            address: '123 Demo Street',
            city: 'Demo City',
            status: 'active',
            onboarding_completed: true
          });

        if (insertError) {
          console.log('❌ Error creating demo clinic:', insertError);
        } else {
          console.log('✅ Demo clinic created');
        }
      }
    }

    console.log('\n🎉 Setup complete! You can now test with:');
    console.log('   Admin Login: admin / admin123');
    console.log('   Demo Clinic: Check the clinics table for demo clinic');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

setupMocards();