import { useState, useEffect } from 'react';
import { CreditCard, Zap, RefreshCw, CheckCircle, X, Settings, MapPin, Building, Award } from 'lucide-react';

interface GenerationProgress {
  isGenerating: boolean;
  progress: number;
  total: number;
  message: string;
  completed: boolean;
}

interface GenerationForm {
  quantity: number;
  region: string;
  areaCode: string;
  customAreaCode: string;
  clinicId: string;
  perksTotal: number;
  customPerkName: string;
  useCustomPerk: boolean;
}

interface Clinic {
  id: number;
  name: string;
  code: string;
  region: string;
}

interface Perk {
  id: string;
  name: string;
  description: string;
  value: number;
  isActive: boolean;
}

const PHILIPPINES_REGIONS = [
  { code: '01', name: 'Ilocos Region (Region 1)' },
  { code: '02', name: 'Cagayan Valley (Region 2)' },
  { code: '03', name: 'Central Luzon (Region 3)' },
  { code: '4A', name: 'Calabarzon (Region 4A)' },
  { code: '4B', name: 'Mimaropa (Region 4B)' },
  { code: '05', name: 'Bicol Region (Region 5)' },
  { code: '06', name: 'Western Visayas (Region 6)' },
  { code: '07', name: 'Central Visayas (Region 7)' },
  { code: '08', name: 'Eastern Visayas (Region 8)' },
  { code: '09', name: 'Zamboanga Peninsula (Region 9)' },
  { code: '10', name: 'Northern Mindanao (Region 10)' },
  { code: '11', name: 'Davao Region (Region 11)' },
  { code: '12', name: 'SOCCSKSARGEN (Region 12)' },
  { code: '13', name: 'Caraga (Region 13)' },
  { code: 'NCR', name: 'National Capital Region (NCR)' },
  { code: 'CAR', name: 'Cordillera Administrative Region (CAR)' },
  { code: 'BARMM', name: 'Bangsamoro Autonomous Region in Muslim Mindanao' }
];

const AREA_CODES = [
  'CVT001', 'CVT002', 'CVT003', 'CVT004', 'CVT005',
  'BTG001', 'BTG002', 'BTG003', 'BTG004', 'BTG005',
  'LAG001', 'LAG002', 'LAG003', 'LAG004', 'LAG005',
  'NCR001', 'NCR002', 'NCR003', 'NCR004', 'NCR005',
  'Custom'
];

interface CardGeneratorAppProps {
  onSuccess?: () => Promise<void>;
}

export function CardGeneratorApp({ onSuccess }: CardGeneratorAppProps) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [form, setForm] = useState<GenerationForm>({
    quantity: 1,
    region: '',
    areaCode: '',
    customAreaCode: '',
    clinicId: '',
    perksTotal: 10,
    customPerkName: '',
    useCustomPerk: false
  });
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [progress, setProgress] = useState<GenerationProgress>({
    isGenerating: false,
    progress: 0,
    total: 0,
    message: '',
    completed: false
  });

  // Test database connection and load data
  const testConnectionAndLoadData = async () => {
    try {
      setConnectionStatus('checking');
      const { supabase } = await import('../../lib/supabase');

      // Test basic connection
      const { error: testError } = await supabase
        .from('cards')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('❌ Database connection test failed:', testError);
        setConnectionStatus('error');
        return;
      }

      console.log('✅ Database connection successful');
      setConnectionStatus('connected');

      // Load clinics from app_clinics schema
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name, code, region')
        .eq('is_active', true);

      if (clinicsError) {
        console.log('⚠️ Clinics data not available:', clinicsError);
      } else if (clinicsData) {
        setClinics(clinicsData);
        console.log('✅ Loaded', clinicsData.length, 'clinics');
      }

      // Set default perks
      setPerks([
        { id: '1', name: 'Free Dental Cleaning', description: 'Complete professional dental cleaning', value: 1500, isActive: true },
        { id: '2', name: 'Free Consultation', description: 'General dental consultation', value: 800, isActive: true },
        { id: '3', name: 'Dental X-Ray', description: 'Digital dental x-ray', value: 1200, isActive: true },
        { id: '4', name: '20% Treatment Discount', description: '20% off any treatment', value: 20, isActive: true },
        { id: '5', name: 'Free Fluoride Treatment', description: 'Fluoride application', value: 600, isActive: true },
      ]);

    } catch (error) {
      console.error('💥 Connection and data loading failed:', error);
      setConnectionStatus('error');
    }
  };

  // Load data on mount
  useEffect(() => {
    testConnectionAndLoadData();
  }, []);

  const generateCards = async () => {
    // Basic validation - only require region
    if (!form.region) {
      console.log('Validation failed: No region selected');
      return;
    }

    if (form.areaCode === 'Custom' && !form.customAreaCode?.trim()) {
      console.log('Validation failed: Custom area code required but not provided');
      return;
    }

    if (form.useCustomPerk && !form.customPerkName?.trim()) {
      console.log('Validation failed: Custom perk name required but not provided');
      return;
    }

    console.log('✅ Validation passed, starting enterprise card generation...');

    const count = form.quantity;
    const finalAreaCode = form.areaCode === 'Custom' ? form.customAreaCode : form.areaCode;
    const clinicId = form.clinicId ? parseInt(form.clinicId) : null;

    setProgress({
      isGenerating: true,
      progress: 0,
      total: count,
      message: `🚀 Initializing enterprise card generation...`,
      completed: false
    });

    try {
      const { supabase } = await import('../../lib/supabase');

      // Create custom batch ID with metadata
      const batchId = `BATCH_${form.region}_${Date.now()}`;

      setProgress(prev => ({
        ...prev,
        message: `🏭 Using enterprise bulk generation function...`
      }));

      // Method 1: Use the enterprise bulk_generate_cards function
      console.log('🔧 Attempting enterprise bulk generation...');

      const { data: bulkResult, error: bulkError } = await supabase
        .rpc('bulk_generate_cards', {
          p_quantity: count,
          p_clinic_id: clinicId,
          p_batch_name: batchId
        });

      if (bulkError) {
        console.log('❌ Enterprise function failed, falling back to manual generation:', bulkError);

        // Method 2: Fallback to manual generation with simplified data
        setProgress(prev => ({
          ...prev,
          message: `🔄 Using fallback generation method...`
        }));

        const cardsToInsert = [];
        for (let i = 0; i < count; i++) {
          cardsToInsert.push({
            clinic_id: clinicId,
            perks_total: form.perksTotal,
            batch_id: batchId,
            metadata: {
              generated_at: new Date().toISOString(),
              region: form.region,
              area_code: finalAreaCode || 'GENERAL',
              clinic_id: clinicId,
              perks_configured: form.perksTotal,
              custom_perk: form.useCustomPerk ? form.customPerkName : null,
              generator_version: '2.2_fallback'
            }
          });
        }

        // Insert in smaller batches for better reliability
        const batchSize = 50;
        let inserted = 0;

        for (let i = 0; i < cardsToInsert.length; i += batchSize) {
          const batch = cardsToInsert.slice(i, i + batchSize);
          const batchEnd = Math.min(i + batchSize, count);

          setProgress(prev => ({
            ...prev,
            progress: inserted,
            message: `📝 Creating cards ${inserted + 1} to ${batchEnd}...`
          }));

          const { error } = await supabase
            .from('cards')
            .insert(batch);

          if (error) {
            throw new Error(`❌ Batch insertion failed: ${error.message}`);
          }

          inserted += batch.length;

          // Small delay for large batches
          if (count > 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          setProgress(prev => ({
            ...prev,
            progress: inserted,
            message: inserted === count ? '✅ Finalizing card generation...' : `📝 Creating cards ${inserted + 1} to ${Math.min(inserted + batchSize, count)}...`
          }));
        }

        console.log('✅ Manual generation completed successfully');
      } else {
        console.log('✅ Enterprise bulk generation successful:', bulkResult);

        // Simulate progress for user experience
        const progressSteps = Math.min(count, 10);
        for (let step = 0; step <= progressSteps; step++) {
          const progressValue = Math.floor((step / progressSteps) * count);
          setProgress(prev => ({
            ...prev,
            progress: progressValue,
            message: step === progressSteps
              ? '✅ Enterprise generation completed!'
              : `🏭 Enterprise generation: ${Math.round((step / progressSteps) * 100)}%`
          }));

          if (step < progressSteps) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }

      console.log(`🎯 Generation complete! Batch ID: ${batchId}`);

      // Verify generation success
      console.log('🔍 Verifying card generation...');
      const { data: verificationData } = await supabase
        .from('cards')
        .select('id')
        .eq('batch_id', batchId);

      const actualGenerated = verificationData?.length || 0;
      console.log(`📊 Verification: Expected ${count}, Found ${actualGenerated} cards`);

      if (actualGenerated !== count) {
        console.warn(`⚠️ Generation mismatch! Expected: ${count}, Actual: ${actualGenerated}`);
      }

      // Refresh parent dashboard data
      if (onSuccess) {
        console.log('🔄 Refreshing dashboard data...');
        try {
          await onSuccess();
          console.log('✅ Dashboard data refreshed successfully');
        } catch (error) {
          console.error('❌ Failed to refresh dashboard data:', error);
        }
      }

      // Final success state with verification
      setProgress({
        isGenerating: false,
        progress: count,
        total: count,
        message: `🎉 Generated ${actualGenerated}/${count} cards • Batch: ${batchId} • Dashboard refreshed!`,
        completed: true
      });

      // Auto-close success message after 4 seconds
      setTimeout(() => {
        setProgress(prev => ({ ...prev, completed: false }));
        setShowGenerator(false);
      }, 4000);

    } catch (error: any) {
      console.error('💥 Card generation failed:', error);
      setProgress({
        isGenerating: false,
        progress: 0,
        total: 0,
        message: `❌ Generation failed: ${error.message}`,
        completed: false
      });

      // Auto-hide error after 5 seconds
      setTimeout(() => {
        setProgress(prev => ({ ...prev, message: '', completed: false }));
      }, 5000);
    }
  };

  const handleGenerate = () => {
    if (form.quantity > 0 && form.quantity <= 10000) {
      generateCards();
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
              Generate unlimited MOC cards with enterprise-grade reliability
            </p>
            <div className="mt-2 flex items-center justify-center space-x-2">
              {connectionStatus === 'checking' && (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-blue-100 text-sm">Testing database connection...</span>
                </>
              )}
              {connectionStatus === 'connected' && (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-green-100 text-sm">Database connected</span>
                </>
              )}
              {connectionStatus === 'error' && (
                <>
                  <X className="h-4 w-4" />
                  <span className="text-red-200 text-sm">Database connection failed</span>
                  <button
                    onClick={testConnectionAndLoadData}
                    className="text-white underline hover:text-blue-100 ml-2"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowGenerator(true)}
            disabled={connectionStatus !== 'connected'}
            className={`rounded-2xl px-8 py-4 font-bold text-lg transition-all transform shadow-xl ${
              connectionStatus === 'connected'
                ? 'bg-white text-blue-600 hover:bg-gray-50 hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Zap className="h-6 w-6 mr-3 inline" />
            Generate Cards Now
          </button>
        </div>
      </div>

      {/* Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  {/* Quantity Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <CreditCard className="h-4 w-4 inline mr-2" />
                      Select Quantity
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[1, 500, 1000].map((qty) => (
                        <button
                          key={qty}
                          onClick={() => setForm({ ...form, quantity: qty })}
                          className={`p-4 rounded-xl border-2 font-medium transition-all ${
                            form.quantity === qty
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
                        value={form.quantity === 1 || form.quantity === 500 || form.quantity === 1000 ? '' : form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Region Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="h-4 w-4 inline mr-2" />
                      Region *
                    </label>
                    <select
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Region</option>
                      {PHILIPPINES_REGIONS.map((region) => (
                        <option key={region.code} value={region.code}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Area Code Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Settings className="h-4 w-4 inline mr-2" />
                      Area Code *
                    </label>
                    <select
                      value={form.areaCode}
                      onChange={(e) => setForm({ ...form, areaCode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!form.region}
                    >
                      <option value="">Select Area Code</option>
                      {AREA_CODES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>

                    {form.areaCode === 'Custom' && (
                      <div className="mt-3">
                        <input
                          type="text"
                          placeholder="Enter custom area code (e.g., XYZ001)"
                          value={form.customAreaCode}
                          onChange={(e) => setForm({ ...form, customAreaCode: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Clinic Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="h-4 w-4 inline mr-2" />
                      Clinic Assignment (Optional)
                    </label>
                    <select
                      value={form.clinicId}
                      onChange={(e) => setForm({ ...form, clinicId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No specific clinic (general pool)</option>
                      {clinics.map((clinic) => (
                        <option key={clinic.id} value={clinic.id.toString()}>
                          {clinic.name} ({clinic.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Perks Configuration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Award className="h-4 w-4 inline mr-2" />
                      Perks per Card
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={form.perksTotal}
                        onChange={(e) => setForm({ ...form, perksTotal: parseInt(e.target.value) || 1 })}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">perks per card</span>
                    </div>

                    {/* Custom Perk Option */}
                    <div className="mt-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={form.useCustomPerk}
                          onChange={(e) => setForm({ ...form, useCustomPerk: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Add custom perk name</span>
                      </label>

                      {form.useCustomPerk && (
                        <div className="mt-3 space-y-2">
                          <select
                            value={form.customPerkName}
                            onChange={(e) => setForm({ ...form, customPerkName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select or type custom perk...</option>
                            <option value="Free Teeth Whitening">Free Teeth Whitening</option>
                            <option value="Free Orthodontic Consultation">Free Orthodontic Consultation</option>
                            <option value="Free Oral Surgery Consultation">Free Oral Surgery Consultation</option>
                            <option value="Free Periodontal Treatment">Free Periodontal Treatment</option>
                            <option value="Free Dental Implant Consultation">Free Dental Implant Consultation</option>
                            <option value="Free Wisdom Tooth Extraction">Free Wisdom Tooth Extraction</option>
                            <option value="Free Root Canal Treatment">Free Root Canal Treatment</option>
                            <option value="Free Dental Crown">Free Dental Crown</option>
                            <option value="Free Denture Consultation">Free Denture Consultation</option>
                            <option value="Custom">Custom (type your own)</option>
                          </select>

                          {form.customPerkName === 'Custom' && (
                            <input
                              type="text"
                              placeholder="Enter custom perk name..."
                              value=""
                              onChange={(e) => setForm({ ...form, customPerkName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Available Perks Display */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {form.useCustomPerk && form.customPerkName ? 'Custom Perk + Default Perks:' : 'Available Default Perks:'}
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {form.useCustomPerk && form.customPerkName && form.customPerkName !== 'Custom' && (
                          <div className="text-blue-600 font-medium">• {form.customPerkName} (Custom)</div>
                        )}
                        {perks.slice(0, 3).map(perk => (
                          <div key={perk.id}>• {perk.name} (₱{perk.value})</div>
                        ))}
                        {perks.length > 3 && <div>• And {perks.length - 3} more...</div>}
                      </div>
                    </div>
                  </div>

                  {/* Card Format Preview */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Card Configuration:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Control Number: MOC00000001, MOC00000002...</li>
                      <li>• Region: {form.region ? PHILIPPINES_REGIONS.find(r => r.code === form.region)?.name : 'Not selected'}</li>
                      <li>• Area Code: {form.areaCode === 'Custom' ? form.customAreaCode || 'Custom (not set)' : form.areaCode || 'GENERAL'}</li>
                      <li>• Clinic: {form.clinicId ? clinics.find(c => c.id.toString() === form.clinicId)?.name : 'General pool'}</li>
                      <li>• Perks: {form.perksTotal} per card{form.useCustomPerk && form.customPerkName ? ` + ${form.customPerkName}` : ''}</li>
                      <li>• Status: Inactive (ready for activation)</li>
                      <li>• Expires: December 31, 2025</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!form.region || (form.areaCode === 'Custom' && !form.customAreaCode) || (form.useCustomPerk && !form.customPerkName.trim())}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl py-4 font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    Generate {form.quantity} Card{form.quantity > 1 ? 's' : ''} 🚀
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