import { useState } from 'react';
import { enhancedCardSystem, type EnhancedCardData, type EnhancedCardBatch } from '../lib/enhanced-card-system';

interface AdminCardManagementProps {
  adminUserId: string;
}

export function AdminCardManagement({ adminUserId }: AdminCardManagementProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastBatch, setLastBatch] = useState<EnhancedCardBatch | null>(null);
  const [lastCards, setLastCards] = useState<EnhancedCardData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [batchCount, setBatchCount] = useState(10);
  const [distributionPlan, setDistributionPlan] = useState('general');

  const handleGenerateBatch = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await enhancedCardSystem.createEnhancedCardBatch(
        adminUserId,
        batchCount
      );

      setLastBatch(result.batch);
      setLastCards(result.cards);

      console.log('Generated batch:', result.batch);
      console.log('Generated cards:', result.cards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cards');
      console.error('Error generating batch:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Enhanced Card Generation System
        </h2>
        <p className="text-gray-600">
          Generate card batches with location-based passcode system
        </p>
      </div>

      {/* Generation Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Generate New Card Batch
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Cards
              </label>
              <select
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isGenerating}
              >
                <option value={10}>10 Cards</option>
                <option value={25}>25 Cards</option>
                <option value={50}>50 Cards</option>
                <option value={100}>100 Cards</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distribution Plan
              </label>
              <select
                value={distributionPlan}
                onChange={(e) => setDistributionPlan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isGenerating}
              >
                <option value="general">General Distribution</option>
                <option value="production_test">Production Testing</option>
                <option value="regional">Regional Distribution</option>
                <option value="clinic_specific">Clinic Specific</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateBatch}
            disabled={isGenerating}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating Cards...' : `Generate ${batchCount} Cards`}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Workflow Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          🎯 Enhanced Card System Workflow
        </h3>
        <div className="space-y-2 text-blue-800">
          <p><strong>Step 1:</strong> Admin generates batch with incomplete passcodes (4 digits only)</p>
          <p><strong>Step 2:</strong> Clinics receive cards and assign 3-character location codes</p>
          <p><strong>Step 3:</strong> Complete passcode is formed (e.g., CAV1234)</p>
          <p><strong>Step 4:</strong> Clinic can activate cards for customers</p>
          <p><strong>Step 5:</strong> Cards get 1-year validity from activation</p>
        </div>
      </div>

      {/* Last Generated Batch */}
      {lastBatch && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Latest Generated Batch
          </h3>

          {/* Batch Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Batch Number:</span>
                <p className="text-gray-900 font-mono">{lastBatch.batch_number}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Total Cards:</span>
                <p className="text-gray-900">{lastBatch.total_cards}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Cards Generated:</span>
                <p className="text-gray-900">{lastBatch.cards_generated || lastBatch.total_cards}</p>
              </div>
            </div>
          </div>

          {/* Cards Preview */}
          <h4 className="font-medium text-gray-900 mb-3">Generated Cards Preview</h4>

          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide pb-2 border-b">
              <div>Control Number</div>
              <div>Incomplete Passcode</div>
              <div>Complete Example</div>
              <div>Status</div>
            </div>

            {lastCards.slice(0, 5).map((card) => (
              <div key={card.id} className="grid grid-cols-4 gap-2 text-sm py-2 border-b border-gray-100">
                <div className="font-mono text-blue-600">{card.control_number}</div>
                <div className="font-mono text-orange-600">{card.incomplete_passcode}</div>
                <div className="font-mono text-green-600">CAV{card.incomplete_passcode}</div>
                <div className="capitalize text-gray-600">{card.status}</div>
              </div>
            ))}

            {lastCards.length > 5 && (
              <div className="text-sm text-gray-500 py-2">
                ... and {lastCards.length - 5} more cards
              </div>
            )}
          </div>

          {/* Card Metadata Preview */}
          {lastCards.length > 0 && lastCards[0].card_metadata && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Card Metadata</h5>
              <div className="text-sm text-gray-600">
                <p><strong>Perks per card:</strong> {lastCards[0].card_metadata.total_perks_count}</p>
                <p><strong>Validity period:</strong> {lastCards[0].card_metadata.validity_period_months} months</p>
                <p><strong>Creation date:</strong> {new Date(lastCards[0].card_metadata.batch_creation_date).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">
          📋 Next Steps for Clinics
        </h3>
        <div className="space-y-2 text-yellow-800 text-sm">
          <p>1. Distribute generated cards to partner clinics</p>
          <p>2. Clinics will assign 3-character location codes (e.g., CAV for Cavite)</p>
          <p>3. Complete passcodes will be formed automatically</p>
          <p>4. Clinics can then activate cards for their customers</p>
          <p>5. Each card comes with 8 pre-loaded perks ready for redemption</p>
        </div>
      </div>
    </div>
  );
}