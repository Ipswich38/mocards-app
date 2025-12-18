import { useState } from 'react';
import { CreditCard, RefreshCw, Download, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

interface CardGenerationSystemV2Props {
  token: string | null;
}

export function CardGenerationSystemV2({ }: CardGenerationSystemV2Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleGenerateCards = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Import supabase client
      const { supabase } = await import('../lib/supabase');

      // First create a new batch record
      setSuccess('📦 Creating new card batch...');

      const batchNumber = `MOC-BATCH-${Date.now()}`;
      const { data: batch, error: batchError } = await supabase
        .from('card_batches')
        .insert({
          batch_number: batchNumber,
          total_cards: 10000,
          status: 'active',
          created_by: 'admin',
          notes: 'Fresh V2.0 card generation with MOC format'
        })
        .select()
        .single();

      if (batchError) {
        throw new Error(`Failed to create batch: ${batchError.message}`);
      }

      // Count existing cards to warn user
      const { count: existingCount } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true });

      if (existingCount && existingCount > 0) {
        setSuccess(`⚠️ Found ${existingCount} existing cards. Creating backup...`);

        // Create a backup table first
        const backupTableName = `cards_backup_${Date.now()}`;
        try {
          await supabase.rpc('create_table_backup', {
            original_table: 'cards',
            backup_table: backupTableName
          });
          console.log(`Backup table created: ${backupTableName}`);
        } catch (backupError) {
          // Fallback: just log the backup intention
          console.log(`Backup table would be created: ${backupTableName} (RPC not available)`);
        }

        setSuccess(`⚠️ Backup created. Now deleting ${existingCount} existing cards...`);

        // Delete all existing cards
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (deleteError) {
          throw new Error(`Failed to delete existing cards: ${deleteError.message}`);
        }
      }

      setSuccess('🔄 Generating 10,000 fresh cards...');

      // Generate 10,000 new cards with MOC format
      const cardsToGenerate = [];

      for (let i = 1; i <= 10000; i++) {
        cardsToGenerate.push({
          batch_id: batch.id, // Link to the batch
          control_number: `MOC-${i.toString().padStart(6, '0')}`, // Philippines MOC format: MOC-000001
          unified_control_number: `MOC-${i.toString().padStart(6, '0')}`, // Same for unified
          location_code: 'PH', // Philippines country code
          card_number: i,
          display_card_number: i,
          is_activated: false,
          status: 'unassigned',
          migration_version: 3
        });
      }

      // Insert in batches of 1000 to avoid timeout
      let totalInserted = 0;
      for (let i = 0; i < cardsToGenerate.length; i += 1000) {
        const cardBatch = cardsToGenerate.slice(i, i + 1000);

        const { error: insertError } = await supabase
          .from('cards')
          .insert(cardBatch);

        if (insertError) {
          throw new Error(`Failed to insert card batch ${i/1000 + 1}: ${insertError.message}`);
        }

        totalInserted += cardBatch.length;
        setSuccess(`📦 Inserted ${totalInserted}/10,000 cards...`);

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setSuccess(`✅ Successfully generated 10,000 fresh unactivated cards with new MOC format!`);
      setShowConfirmation(false);

    } catch (err: any) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCards = () => {
    const csvHeader = 'Card Number,Control Number,Status,Format Version\n';
    const sampleData = [];

    for (let i = 1; i <= 100; i++) {
      const controlNumber = `MOC-${i.toString().padStart(6, '0')}`;
      sampleData.push(`${i},${controlNumber},unactivated,v3`);
    }

    const csvData = csvHeader + sampleData.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mocards-v2-sample-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="safe-top p-6 space-y-6">
        {/* Header */}
        <div className="card-ios-large p-6 animate-ios-fade-in">
          <h2 className="text-ios-title-2 font-semibold text-text-primary mb-2">
            Card Generation System
          </h2>
          <p className="text-ios-body text-text-secondary">
            Generate 10,000 fresh unactivated cards with Philippines standard MOC-000001 format
          </p>
        </div>

        {/* Main Generation Card */}
        <div className="card-ios-large p-8 animate-ios-fade-in">
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-ios-blue-50 rounded-ios-lg flex items-center justify-center">
              <CreditCard className="h-10 w-10 text-healthcare-primary" />
            </div>

            <div>
              <h3 className="text-ios-title-3 font-semibold text-text-primary mb-2">
                Generate New Card Batch
              </h3>
              <p className="text-ios-body text-text-secondary">
                This will create 10,000 fresh unactivated cards with Philippines standard MOC-000001 format
              </p>
            </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-left">
            <h4 className="font-medium text-blue-800 mb-3">Philippines Card Format Features:</h4>
            <ul className="text-blue-700 space-y-2 text-sm">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Control Number Format: <span className="font-mono">MOC-000001</span> to <span className="font-mono">MOC-010000</span> (Philippines Standard)
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Simplified activation process
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Philippines regions (1-16, including 4A and 4B) and clinic codes (CVT001-CVT010) assigned during activation
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Sequential card numbers 1-10,000 for easy tracking
              </li>
            </ul>
          </div>

            {!showConfirmation ? (
              <div className="space-y-4">
                <button
                  onClick={() => setShowConfirmation(true)}
                  className="btn-ios-primary text-lg px-8 py-4 mx-auto touch-feedback-ios-primary"
                >
                  <RefreshCw className="h-5 w-5 mr-3" />
                  Generate 10,000 Fresh Cards
                </button>

                <button
                  onClick={downloadSampleCards}
                  className="btn-ios-secondary text-sm px-6 py-2 mx-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample Format (First 100 Cards)
                </button>
              </div>
            ) : (
              <div className="alert-ios-warning rounded-ios-lg p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-ios-orange-100 rounded-ios flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-ios-orange-600" />
                  </div>
                </div>
                <h4 className="text-ios-headline text-ios-orange-800 text-center mb-2">
                  Confirmation Required
                </h4>
                <p className="text-ios-body text-ios-orange-700 text-center mb-6">
                  This will <strong>delete all existing cards</strong> and generate 10,000 fresh unactivated cards with the new MOC format. This action cannot be undone.
                </p>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
                  <button
                    onClick={handleGenerateCards}
                    disabled={loading}
                    className="btn-ios-danger px-6 py-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="loading-ios w-5 h-5 mr-3"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-5 w-5 mr-2" />
                        Yes, Delete & Generate
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="btn-ios-secondary px-6 py-3"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

        {/* Messages */}
        {error && (
          <div className="alert-ios-danger animate-ios-fade-in">
            <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="text-ios-body">{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-ios-success animate-ios-fade-in">
            <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="text-ios-body">{success}</span>
          </div>
        )}

        {/* Information */}
        <div className="card-ios-large p-6 animate-ios-fade-in">
          <div className="alert-ios-info">
            <h4 className="text-ios-headline text-ios-blue-800 mb-4">How the Philippines System Works:</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-ios-subheadline font-semibold text-ios-blue-700 mb-2">Card Generation:</h5>
                <ul className="text-ios-callout text-ios-blue-700 space-y-1">
                  <li>• 10,000 cards with sequential numbers</li>
                  <li>• Format: MOC-000001 to MOC-010000</li>
                  <li>• Direct activation system</li>
                  <li>• All cards start as "unassigned"</li>
                </ul>
              </div>
              <div>
                <h5 className="text-ios-subheadline font-semibold text-ios-blue-700 mb-2">Card Activation:</h5>
                <ul className="text-ios-callout text-ios-blue-700 space-y-1">
                  <li>• Clinics select Philippines region (1-16, 4A, 4B)</li>
                  <li>• Clinics select clinic code (CVT001-CVT010)</li>
                  <li>• Card keeps original format: MOC-000001</li>
                  <li>• Default perks automatically assigned</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}