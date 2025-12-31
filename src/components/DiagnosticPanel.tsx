import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useErrorHandler } from './ErrorBoundary';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export function DiagnosticPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const { clearErrors, getErrors } = useErrorHandler();

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: Database Connection
    try {
      const { error } = await supabase.from('information_schema.tables').select('table_name').limit(1);
      diagnosticResults.push({
        test: 'Database Connection',
        status: error ? 'fail' : 'pass',
        message: error ? `Connection failed: ${error.message}` : 'Database connection successful'
      });
    } catch (e) {
      diagnosticResults.push({
        test: 'Database Connection',
        status: 'fail',
        message: `Connection error: ${e instanceof Error ? e.message : 'Unknown error'}`
      });
    }

    // Test 2: Clinics Table
    try {
      const { data, error } = await supabase.from('clinics').select('count').limit(1);
      diagnosticResults.push({
        test: 'Clinics Table',
        status: error ? 'fail' : 'pass',
        message: error ? `Clinics table error: ${error.message}` : `Clinics table accessible`,
        details: data
      });
    } catch (e) {
      diagnosticResults.push({
        test: 'Clinics Table',
        status: 'fail',
        message: `Clinics table error: ${e instanceof Error ? e.message : 'Unknown error'}`
      });
    }

    // Test 3: Cards Table
    try {
      const { data, error } = await supabase.from('cards').select('count').limit(1);
      diagnosticResults.push({
        test: 'Cards Table',
        status: error ? 'fail' : 'pass',
        message: error ? `Cards table error: ${error.message}` : `Cards table accessible`,
        details: data
      });
    } catch (e) {
      diagnosticResults.push({
        test: 'Cards Table',
        status: 'fail',
        message: `Cards table error: ${e instanceof Error ? e.message : 'Unknown error'}`
      });
    }

    // Test 4: Card Generation Function
    try {
      const { data, error } = await supabase.rpc('generate_card_control_number');
      diagnosticResults.push({
        test: 'Card Generation',
        status: error ? 'fail' : 'pass',
        message: error ? `Card generation failed: ${error.message}` : `Card generation working: ${data}`,
        details: data
      });
    } catch (e) {
      diagnosticResults.push({
        test: 'Card Generation',
        status: 'fail',
        message: `Card generation error: ${e instanceof Error ? e.message : 'Unknown error'}`
      });
    }

    // Test 5: Clinic Creation Test
    try {
      const testClinicData = {
        name: 'Diagnostic Test Clinic',
        username: 'diag_test_' + Date.now(),
        region: 'TEST',
        plan: 'starter',
        code: 'DIAG' + Date.now(),
        area_code: 'TEST-01',
        address: 'Test Address',
        email: 'test@diagnostic.com',
        contact_number: '+63-123-456-7890',
        password_hash: '$2a$12$testdiagnostichash123456789012345678901234567890',
        subscription_status: 'active',
        max_cards_allowed: 10,
        is_active: true
      };

      const { data, error } = await supabase.from('clinics').insert(testClinicData).select().single();

      if (error) {
        diagnosticResults.push({
          test: 'Clinic Creation',
          status: 'fail',
          message: `Clinic creation failed: ${error.message}`,
          details: error
        });
      } else {
        // Clean up test clinic
        await supabase.from('clinics').delete().eq('id', data.id);
        diagnosticResults.push({
          test: 'Clinic Creation',
          status: 'pass',
          message: 'Clinic creation working (test clinic created and deleted)',
          details: data
        });
      }
    } catch (e) {
      diagnosticResults.push({
        test: 'Clinic Creation',
        status: 'fail',
        message: `Clinic creation error: ${e instanceof Error ? e.message : 'Unknown error'}`
      });
    }

    // Test 6: Card Creation Test
    try {
      // First get a clinic to associate with
      const { data: clinicData } = await supabase.from('clinics').select('id').limit(1).single();

      if (clinicData) {
        const testCardData = {
          full_name: 'Diagnostic Test User',
          birth_date: '1990-01-01',
          clinic_id: clinicData.id,
          batch_id: 'DIAG_TEST_' + Date.now(),
          status: 'unactivated',
          card_type: 'standard'
        };

        const { data: cardData, error } = await supabase.from('cards').insert(testCardData).select().single();

        if (error) {
          diagnosticResults.push({
            test: 'Card Creation',
            status: 'fail',
            message: `Card creation failed: ${error.message}`,
            details: error
          });
        } else {
          // Clean up test card
          await supabase.from('cards').delete().eq('id', cardData.id);
          diagnosticResults.push({
            test: 'Card Creation',
            status: 'pass',
            message: `Card creation working: ${cardData.control_number}`,
            details: cardData
          });
        }
      } else {
        diagnosticResults.push({
          test: 'Card Creation',
          status: 'warning',
          message: 'No clinics available for card creation test'
        });
      }
    } catch (e) {
      diagnosticResults.push({
        test: 'Card Creation',
        status: 'fail',
        message: `Card creation error: ${e instanceof Error ? e.message : 'Unknown error'}`
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50';
      case 'fail': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      default: return '❓';
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
      {/* Diagnostic Trigger Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-50 transition-colors"
        title="Open Diagnostics"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </button>

      {/* Diagnostic Panel */}
      {isVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">System Diagnostics</h2>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={runDiagnostics}
                  disabled={isRunning}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  {isRunning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>Run Diagnostics</span>
                    </>
                  )}
                </button>

                <button
                  onClick={clearErrors}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                >
                  Clear Error Log
                </button>
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Diagnostic Results</h3>
                  <div className="grid gap-4">
                    {results.map((result, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}>
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">{getStatusIcon(result.status)}</span>
                          <div className="flex-1">
                            <div className="font-medium">{result.test}</div>
                            <div className="text-sm mt-1">{result.message}</div>
                            {result.details && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm font-medium">Details</summary>
                                <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                                  {JSON.stringify(result.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Log */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Errors</h3>
                <div className="max-h-60 overflow-auto">
                  {getErrors().length === 0 ? (
                    <p className="text-gray-500 text-sm">No errors logged</p>
                  ) : (
                    <div className="space-y-2">
                      {getErrors().map((error: any, index: number) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                          <div className="font-medium text-red-800">{error.message}</div>
                          <div className="text-red-600 text-xs mt-1">{error.timestamp}</div>
                          {error.stack && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-red-700 text-xs">Stack Trace</summary>
                              <pre className="mt-1 text-xs text-red-600 bg-white p-2 rounded border overflow-auto">
                                {error.stack}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}