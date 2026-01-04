import { useState } from 'react';
import { CreditCard, Zap, Settings, Hash, CheckCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { toastSuccess, toastError, toastWarning } from '../lib/toast';

interface GeneratedCard {
  id: string;
  controlNumber: string;
  status: 'generated' | 'ready';
}

interface GenerationResult {
  success: boolean;
  count: number;
  cards: GeneratedCard[];
  batchId: string;
}

export function PureCardGenerator() {
  const [quantity, setQuantity] = useState(1);
  const [prefix, setPrefix] = useState('MOC');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);

  const { addToast } = useToast();

  const generateControlNumber = (index: number): string => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sequenceNumber = (index + 1).toString().padStart(4, '0');
    return `${prefix}-${timestamp}-${sequenceNumber}-${randomSuffix}`;
  };

  const generateCards = async () => {
    if (quantity < 1 || quantity > 10000) {
      addToast(toastWarning('Invalid Quantity', 'Please enter a quantity between 1 and 10000'));
      return;
    }

    setIsGenerating(true);
    setLastResult(null);

    try {
      // Simulate generation process
      const batchId = `BATCH_${Date.now()}`;
      const cards: GeneratedCard[] = [];

      for (let i = 0; i < quantity; i++) {
        const controlNumber = generateControlNumber(i);
        cards.push({
          id: `card_${Date.now()}_${i}`,
          controlNumber,
          status: 'generated'
        });

        // Add a small delay for larger batches to show progress
        if (i > 0 && i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Simulate database save
      await new Promise(resolve => setTimeout(resolve, 500));

      const result: GenerationResult = {
        success: true,
        count: quantity,
        cards,
        batchId
      };

      setLastResult(result);
      addToast(toastSuccess('Cards Generated', `Successfully generated ${quantity} card(s)`));

    } catch (error) {
      console.error('Generation failed:', error);
      addToast(toastError('Generation Failed', 'Failed to generate cards'));
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadBatch = () => {
    if (!lastResult) return;

    const csvContent = [
      'Card ID,Control Number,Status,Generated At',
      ...lastResult.cards.map(card =>
        `${card.id},${card.controlNumber},${card.status},${new Date().toISOString()}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mocards_batch_${lastResult.batchId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    addToast(toastSuccess('Download Started', 'Card batch exported successfully'));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard className="h-10 w-10 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Card Generator</h1>
        <p className="text-gray-600 text-lg">Generate unique MOC card control numbers and manage card batches</p>
      </div>

      {/* Generation Form */}
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Settings className="h-6 w-6 mr-3 text-purple-600" />
          Generation Settings
        </h2>

        <div className="space-y-6">
          {/* Quantity Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quantity
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[1, 10, 100, 1000].map((qty) => (
                <button
                  key={qty}
                  onClick={() => setQuantity(qty)}
                  className={`p-3 rounded-xl border-2 font-medium transition-all ${
                    quantity === qty
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-purple-300 text-gray-700'
                  }`}
                >
                  {qty} Card{qty > 1 ? 's' : ''}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="10000"
              placeholder="Custom quantity (1-10000)"
              value={[1, 10, 100, 1000].includes(quantity) ? '' : quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Prefix Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Control Number Prefix
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {['MOC', 'CARD', 'MCN'].map((pfx) => (
                <button
                  key={pfx}
                  onClick={() => setPrefix(pfx)}
                  className={`p-3 rounded-xl border-2 font-medium transition-all ${
                    prefix === pfx
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-purple-300 text-gray-700'
                  }`}
                >
                  {pfx}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Custom prefix"
              value={['MOC', 'CARD', 'MCN'].includes(prefix) ? '' : prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase() || 'MOC')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-xl">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Hash className="h-4 w-4 mr-2 text-purple-600" />
              Control Number Preview
            </h4>
            <p className="font-mono text-lg text-purple-700">
              {prefix}-{Date.now()}-0001-ABC123
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Format: {prefix}-TIMESTAMP-SEQUENCE-RANDOM
            </p>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateCards}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3 inline-block"></div>
                Generating {quantity} cards...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-3 inline-block" />
                Generate {quantity} Card{quantity > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generation Results */}
      {lastResult && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <CheckCircle className="h-6 w-6 mr-2" />
                  Generation Complete
                </h2>
                <p className="text-green-100">Successfully generated {lastResult.count} cards</p>
              </div>
              <button
                onClick={downloadBatch}
                className="bg-white text-green-600 px-4 py-2 rounded-xl font-semibold hover:bg-gray-100 transition-all"
              >
                Download CSV
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{lastResult.count}</p>
                <p className="text-sm text-gray-600">Cards Generated</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{lastResult.cards.length}</p>
                <p className="text-sm text-gray-600">Ready to Use</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-mono text-purple-600">{lastResult.batchId}</p>
                <p className="text-sm text-gray-600">Batch ID</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto">
              <h4 className="font-medium text-gray-900 mb-3">Generated Cards Preview</h4>
              <div className="space-y-2">
                {lastResult.cards.slice(0, 10).map((card) => (
                  <div key={card.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span className="font-mono text-sm">{card.controlNumber}</span>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      {card.status}
                    </span>
                  </div>
                ))}
                {lastResult.cards.length > 10 && (
                  <div className="text-center py-2 text-gray-500 text-sm">
                    ... and {lastResult.cards.length - 10} more cards
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}