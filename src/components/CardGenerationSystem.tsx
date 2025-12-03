import { useState } from 'react';
import { dbOperations, cardUtils, CardBatch, Card } from '../lib/supabase';

interface CardGenerationSystemProps {
  adminUserId: string;
}

export function CardGenerationSystem({ adminUserId }: CardGenerationSystemProps) {
  const [generating, setGenerating] = useState(false);
  const [cardCount, setCardCount] = useState(10);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ batch: CardBatch; cards: Card[] } | null>(null);

  const handleGenerateCards = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setSuccess(null);

    try {
      // Generate batch
      const batchNumber = cardUtils.generateBatchNumber();
      const batch = await dbOperations.createCardBatch({
        batch_number: batchNumber,
        total_cards: cardCount,
        created_by: adminUserId
      });

      // Generate cards for this batch
      const generatedCards: Card[] = [];

      for (let i = 1; i <= cardCount; i++) {
        const controlNumber = cardUtils.generateControlNumber(batchNumber, i);
        const passcode = cardUtils.generatePasscode();

        const cardData = {
          batch_id: batch.id,
          control_number: controlNumber,
          passcode: passcode,
          location_code: 'MO',
          status: 'unactivated' as const
        };

        const card = await dbOperations.createCard(cardData);
        generatedCards.push(card);

        // Log transaction
        await dbOperations.logTransaction({
          card_id: card.id,
          transaction_type: 'created',
          performed_by: 'admin',
          performed_by_id: adminUserId,
          details: { batch_number: batchNumber, card_index: i }
        });
      }

      setSuccess({ batch, cards: generatedCards });
    } catch (err) {
      console.error('Error generating cards:', err);
      setError('Failed to generate cards. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadCardsCSV = () => {
    if (!success) return;

    const csvHeader = 'Control Number,Passcode,Batch Number,Status\n';
    const csvData = success.cards.map(card =>
      `${card.control_number},${card.passcode},${success.batch.batch_number},${card.status}`
    ).join('\n');

    const blob = new Blob([csvHeader + csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mocards-${success.batch.batch_number}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Generate New Card Batch</h3>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm mb-6 border border-green-100">
          <div className="font-medium mb-2">✅ Successfully generated {success.cards.length} cards!</div>
          <div className="text-xs text-green-700 mb-3">
            Batch Number: <span className="font-mono">{success.batch.batch_number}</span>
          </div>
          <button
            onClick={downloadCardsCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
          >
            Download CSV
          </button>
        </div>
      )}

      <form onSubmit={handleGenerateCards} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Cards to Generate
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={cardCount}
            onChange={(e) => setCardCount(parseInt(e.target.value))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-gray-900 transition-colors"
            disabled={generating}
          />
        </div>

        <button
          type="submit"
          disabled={generating || cardCount < 1}
          className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
        >
          {generating ? 'Generating Cards...' : `Generate ${cardCount} Cards`}
        </button>
      </form>

      {success && (
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Generated Cards Preview</h4>
          <div className="max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {success.cards.slice(0, 10).map((card) => (
                <div key={card.id} className="bg-white p-3 rounded-lg border">
                  <div className="font-mono text-gray-900">{card.control_number}</div>
                  <div className="font-mono text-gray-500">{card.passcode}</div>
                </div>
              ))}
              {success.cards.length > 10 && (
                <div className="col-span-2 text-center text-gray-500 py-2">
                  ... and {success.cards.length - 10} more cards
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}