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
      // First delete all existing cards
      setSuccess('🗄️ Deleting existing cards...');

      // Import supabase client to delete all cards
      const { supabase } = await import('../lib/supabase');

      // Delete all existing cards
      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a dummy condition)

      if (deleteError) {
        throw new Error(`Failed to delete existing cards: ${deleteError.message}`);
      }

      setSuccess('🔄 Generating 10,000 fresh cards...');

      // Generate 10,000 new cards with MOC format
      const cardsToGenerate = [];

      for (let i = 1; i <= 10000; i++) {
        cardsToGenerate.push({
          control_number: `LEGACY-${i.toString().padStart(5, '0')}`, // Legacy format for backward compatibility
          control_number_v2: `MOC-__-____-${i.toString().padStart(5, '0')}`, // New MOC format
          card_number: i,
          is_activated: false,
          status: 'unactivated',
          migration_version: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      // Insert in batches of 1000 to avoid timeout
      let totalInserted = 0;
      for (let i = 0; i < cardsToGenerate.length; i += 1000) {
        const batch = cardsToGenerate.slice(i, i + 1000);

        const { error: insertError } = await supabase
          .from('cards')
          .insert(batch);

        if (insertError) {
          throw new Error(`Failed to insert card batch ${i/1000 + 1}: ${insertError.message}`);
        }

        totalInserted += batch.length;
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
      const controlNumber = `MOC-__-____-${i.toString().padStart(5, '0')}`;
      sampleData.push(`${i},${controlNumber},unactivated,v2`);
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
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="card card-hover p-6">
        <h2 className="text-3xl font-bold mb-2 text-gray-900">MOC Card Generation System V2.0</h2>
        <p className="text-gray-600 text-lg">
          Generate 10,000 fresh unactivated cards with new control number format
        </p>
      </div>

      {/* Main Generation Card */}
      <div className="card card-hover p-8">
        <div className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <CreditCard className="h-10 w-10 text-blue-600" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Generate New Card Batch</h3>
            <p className="text-gray-600 text-lg">
              This will create 10,000 fresh unactivated cards with the new MOC format
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
            <h4 className="font-medium text-blue-800 mb-3">New Card Format Features:</h4>
            <ul className="text-blue-700 space-y-2 text-sm">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Control Number Format: <span className="font-mono">MOC-__-____-00001</span> to <span className="font-mono">MOC-__-____-10000</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                No passcode required (removed for V2.0)
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Location and clinic codes assigned during activation
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
                className="btn btn-primary px-8 py-4 text-lg font-bold flex items-center justify-center"
              >
                <RefreshCw className="h-6 w-6 mr-3" />
                Generate 10,000 Fresh Cards
              </button>

              <button
                onClick={downloadSampleCards}
                className="btn btn-outline px-6 py-2 text-sm flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Sample Format (First 100 Cards)
              </button>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
              <h4 className="font-bold text-yellow-800 mb-2">⚠️ Confirmation Required</h4>
              <p className="text-yellow-700 mb-6">
                This will <strong>delete all existing cards</strong> and generate 10,000 fresh unactivated cards with the new MOC format. This action cannot be undone.
              </p>

              <div className="flex space-x-4 justify-center">
                <button
                  onClick={handleGenerateCards}
                  disabled={loading}
                  className="btn bg-red-600 hover:bg-red-700 text-white px-6 py-3 flex items-center disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
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
                  className="btn btn-secondary px-6 py-3"
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <span className="text-lg">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg flex items-center">
          <CheckCircle className="h-6 w-6 mr-3" />
          <span className="text-lg">{success}</span>
        </div>
      )}

      {/* Information */}
      <div className="card p-6">
        <div className="border border-blue-200 p-6 rounded-lg bg-blue-50">
          <h4 className="text-lg font-medium text-blue-700 mb-4">How the New System Works:</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-blue-800 mb-2">Card Generation:</h5>
              <ul className="text-blue-700 space-y-1 text-sm">
                <li>• 10,000 cards with sequential numbers</li>
                <li>• Format: MOC-__-____-XXXXX</li>
                <li>• No passcode required</li>
                <li>• All cards start as "unactivated"</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-blue-800 mb-2">Card Activation:</h5>
              <ul className="text-blue-700 space-y-1 text-sm">
                <li>• Clinics manually enter location code (01-16)</li>
                <li>• Clinics select clinic code by region</li>
                <li>• Final format: MOC-01-1234-00001</li>
                <li>• Default perks automatically assigned</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}