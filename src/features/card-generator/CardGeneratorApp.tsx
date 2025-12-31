import { useState } from 'react';
import { CreditCard, Zap, RefreshCw, CheckCircle, X } from 'lucide-react';

interface GenerationProgress {
  isGenerating: boolean;
  progress: number;
  total: number;
  message: string;
  completed: boolean;
}

export function CardGeneratorApp() {
  const [showGenerator, setShowGenerator] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [customQuantity, setCustomQuantity] = useState('');
  const [progress, setProgress] = useState<GenerationProgress>({
    isGenerating: false,
    progress: 0,
    total: 0,
    message: '',
    completed: false
  });

  const generateCards = async (count: number) => {
    setProgress({
      isGenerating: true,
      progress: 0,
      total: count,
      message: `Preparing to generate ${count} cards...`,
      completed: false
    });

    try {
      const { supabase } = await import('../../lib/supabase');

      // Get next available control number
      setProgress(prev => ({ ...prev, message: 'Finding next available card number...' }));
      const { data: lastCard } = await supabase
        .from('cards')
        .select('control_number')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextId = 1;
      if (lastCard && lastCard.length > 0) {
        const match = lastCard[0].control_number?.match(/MOC(\d+)/);
        if (match) {
          nextId = parseInt(match[1]) + 1;
        }
      }

      setProgress(prev => ({
        ...prev,
        message: `Starting from card MOC${String(nextId).padStart(8, '0')}...`
      }));

      // Generate card data
      const cardsToInsert = [];
      for (let i = 0; i < count; i++) {
        const cardId = nextId + i;
        cardsToInsert.push({
          control_number: `MOC${String(cardId).padStart(8, '0')}`,
          full_name: '',
          birth_date: '1990-01-01',
          address: '',
          contact_number: '',
          emergency_contact: '',
          clinic_id: null,
          status: 'inactive',
          perks_total: 10,
          perks_used: 0,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: '2025-12-31',
          qr_code_data: `MOC${String(cardId).padStart(8, '0')}`,
          metadata: { generated_at: new Date().toISOString() }
        });
      }

      // Insert in batches for large quantities
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < cardsToInsert.length; i += batchSize) {
        const batch = cardsToInsert.slice(i, i + batchSize);
        const batchEnd = Math.min(i + batchSize, count);

        setProgress(prev => ({
          ...prev,
          progress: inserted,
          message: `Generating cards ${inserted + 1}-${batchEnd}...`
        }));

        const { error } = await supabase
          .from('cards')
          .insert(batch);

        if (error) {
          throw new Error(`Failed to insert batch: ${error.message}`);
        }

        inserted += batch.length;

        // Small delay for large batches
        if (count > 100) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setProgress({
        isGenerating: false,
        progress: count,
        total: count,
        message: `Successfully generated ${count} cards!`,
        completed: true
      });

      // Auto-close success message after 3 seconds
      setTimeout(() => {
        setProgress(prev => ({ ...prev, completed: false }));
        setShowGenerator(false);
      }, 3000);

    } catch (error: any) {
      setProgress({
        isGenerating: false,
        progress: 0,
        total: 0,
        message: `Error: ${error.message}`,
        completed: false
      });
    }
  };

  const handleGenerate = () => {
    const finalQuantity = quantity === 0 && customQuantity ?
      parseInt(customQuantity) : quantity;

    if (finalQuantity > 0 && finalQuantity <= 10000) {
      generateCards(finalQuantity);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main CTA Button */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white text-center">
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <CreditCard className="h-10 w-10 text-white" />
          </div>

          <div>
            <h2 className="text-3xl font-bold mb-2">Card Generator Pro</h2>
            <p className="text-blue-100 text-lg">
              Generate unlimited MOC cards with real-time progress tracking
            </p>
          </div>

          <button
            onClick={() => setShowGenerator(true)}
            className="bg-white text-blue-600 rounded-2xl px-8 py-4 font-bold text-lg hover:bg-gray-50 transition-all transform hover:scale-105 shadow-xl"
          >
            <Zap className="h-6 w-6 mr-3 inline" />
            Generate Cards Now
          </button>
        </div>
      </div>

      {/* Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            {!progress.isGenerating && !progress.completed ? (
              // Generation Form
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Generate Cards</h3>
                  <button
                    onClick={() => setShowGenerator(false)}
                    className="text-gray-400 hover:text-gray-600 rounded-full p-2"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Quantity
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[1, 500, 1000].map((qty) => (
                        <button
                          key={qty}
                          onClick={() => {
                            setQuantity(qty);
                            setCustomQuantity('');
                          }}
                          className={`p-4 rounded-xl border-2 font-medium transition-all ${
                            quantity === qty
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          {qty} Card{qty > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>

                    <div>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        placeholder="Custom quantity (1-10000)"
                        value={customQuantity}
                        onChange={(e) => {
                          setCustomQuantity(e.target.value);
                          setQuantity(0);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Card Format:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Control Number: MOC00000001, MOC00000002...</li>
                      <li>• Status: Inactive (ready for activation)</li>
                      <li>• Perks: 10 per card (default)</li>
                      <li>• Expires: December 31, 2025</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!quantity && !customQuantity}
                    className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Generate {quantity || customQuantity || 0} Cards
                  </button>
                </div>
              </div>
            ) : progress.completed ? (
              // Success State
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
                <p className="text-gray-600 mb-4">{progress.message}</p>
                <div className="text-sm text-gray-500">
                  Closing automatically in 3 seconds...
                </div>
              </div>
            ) : (
              // Progress State
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">Generating Cards</h3>
                <p className="text-gray-600 mb-6">{progress.message}</p>

                <div className="space-y-3">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${(progress.progress / progress.total) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{progress.progress} generated</span>
                    <span>{progress.total} total</span>
                  </div>

                  <div className="text-lg font-semibold text-blue-600">
                    {Math.round((progress.progress / progress.total) * 100)}% Complete
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}