#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxyexybnotixgpzflota.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eWV4eWJub3RpeGdwemZsb3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIwNzA4MiwiZXhwIjoyMDc1NzgzMDgyfQ.-qr77Y5d35feSbY9RnEXHRAPC6vqh5Ba4iyWBbi5yW8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBackup() {
  console.log('🔄 Creating backup of all cards...\n');

  try {
    // Get current card count
    const { count: cardCount } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true });

    if (!cardCount || cardCount === 0) {
      console.log('ℹ️  No cards found to backup.');
      return;
    }

    console.log(`📊 Found ${cardCount} cards to backup`);

    // Fetch all cards
    const { data: cards, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch cards: ${fetchError.message}`);
    }

    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // Create JSON backup
    const backupData = {
      backup_timestamp: new Date().toISOString(),
      card_count: cardCount,
      cards: cards
    };

    // Write to file
    const fs = await import('fs/promises');
    const filename = `cards-backup-${timestamp}.json`;

    await fs.writeFile(filename, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup created successfully!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Cards backed up: ${cardCount}`);
    console.log(`💾 File size: ${(JSON.stringify(backupData).length / 1024).toFixed(2)} KB`);

    // Also create a CSV backup for easier viewing
    const csvHeaders = 'ID,Control Number,Passcode,Location Code,Status,Card Number,Batch ID,Clinic ID,Created At\n';
    const csvRows = cards.map(card => [
      card.id || '',
      card.control_number || '',
      card.passcode || '',
      card.location_code || '',
      card.status || '',
      card.card_number || '',
      card.batch_id || '',
      card.clinic_id || '',
      card.created_at || ''
    ].join(','));

    const csvContent = csvHeaders + csvRows.join('\n');
    const csvFilename = `cards-backup-${timestamp}.csv`;

    await fs.writeFile(csvFilename, csvContent);

    console.log(`📄 CSV backup also created: ${csvFilename}`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

// Check if this is being run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  createBackup();
}

export { createBackup };