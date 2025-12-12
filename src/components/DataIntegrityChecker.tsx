import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { streamlinedOps } from '../lib/streamlined-operations';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Search,
  Users,
  Loader2
} from 'lucide-react';

interface IntegrityReport {
  timestamp: string;
  totalCards: number;
  totalClinics: number;
  activeCards: number;
  v2Cards: number;
  cardsWithPerks: number;
  patientsCanLookup: boolean;
  clinicsCanLookup: boolean;
  dataConsistency: boolean;
  errors: string[];
  warnings: string[];
}

export function DataIntegrityChecker() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [testCard, setTestCard] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const runIntegrityCheck = async () => {
    setLoading(true);
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Count all cards
      const { count: totalCards, error: cardError } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true });

      if (cardError) {
        errors.push('Failed to count total cards: ' + cardError.message);
        return;
      }

      // 2. Count active cards
      const { count: activeCards, error: activeError } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('is_activated', true);

      if (activeError) {
        errors.push('Failed to count active cards: ' + activeError.message);
      }

      // 3. Count V2 cards
      const { count: v2Cards, error: v2Error } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('migration_version', 2);

      if (v2Error) {
        warnings.push('Failed to count V2 cards: ' + v2Error.message);
      }

      // 4. Count clinics
      const { count: totalClinics, error: clinicError } = await supabase
        .from('mocards_clinics')
        .select('*', { count: 'exact', head: true });

      if (clinicError) {
        errors.push('Failed to count clinics: ' + clinicError.message);
      }

      // 5. Count cards with perks
      const { count: cardsWithPerks, error: perkError } = await supabase
        .from('card_perks')
        .select('card_id', { count: 'exact', head: true });

      if (perkError) {
        warnings.push('Failed to count card perks: ' + perkError.message);
      }

      // 6. Test patient lookup functionality
      let patientsCanLookup = true;
      try {
        // Get a sample card for testing
        const { data: sampleCard } = await supabase
          .from('cards')
          .select('control_number, control_number_v2')
          .limit(1)
          .single();

        if (sampleCard) {
          const testControl = sampleCard.control_number_v2 || sampleCard.control_number;
          // Test streamlined lookup (patient-facing)
          await (streamlinedOps as any).lookupCard(testControl);
        }
      } catch (err) {
        patientsCanLookup = false;
        warnings.push('Patient lookup system may have issues: ' + (err as Error).message);
      }

      // 7. Test clinic lookup functionality
      let clinicsCanLookup = true;
      try {
        // Test direct supabase lookup (clinic-facing)
        const { data: sampleCard } = await supabase
          .from('cards')
          .select('control_number')
          .limit(1)
          .single();

        if (sampleCard) {
          const { data } = await supabase
            .from('cards')
            .select(`
              *,
              clinic:mocards_clinics(*),
              perks:card_perks(*)
            `)
            .eq('control_number', sampleCard.control_number)
            .single();

          if (!data) {
            clinicsCanLookup = false;
          }
        }
      } catch (err) {
        clinicsCanLookup = false;
        warnings.push('Clinic lookup system may have issues: ' + (err as Error).message);
      }

      // 8. Check data consistency
      let dataConsistency = true;
      try {
        // Check for orphaned perks
        const { count: orphanedPerks } = await supabase
          .from('card_perks')
          .select('card_id', { count: 'exact', head: true })
          .not('card_id', 'in', `(SELECT id FROM cards)`);

        if (orphanedPerks && orphanedPerks > 0) {
          dataConsistency = false;
          warnings.push(`Found ${orphanedPerks} orphaned card perks`);
        }

        // Check for duplicate control numbers
        const { data: duplicates } = await supabase
          .from('cards')
          .select('control_number')
          .not('control_number', 'is', null);

        const controlNumbers = duplicates?.map(c => c.control_number) || [];
        const uniqueControls = new Set(controlNumbers);
        if (controlNumbers.length !== uniqueControls.size) {
          dataConsistency = false;
          errors.push('Duplicate control numbers detected');
        }

      } catch (err) {
        warnings.push('Could not verify data consistency: ' + (err as Error).message);
      }

      const newReport: IntegrityReport = {
        timestamp: new Date().toISOString(),
        totalCards: totalCards || 0,
        totalClinics: totalClinics || 0,
        activeCards: activeCards || 0,
        v2Cards: v2Cards || 0,
        cardsWithPerks: cardsWithPerks || 0,
        patientsCanLookup,
        clinicsCanLookup,
        dataConsistency,
        errors,
        warnings
      };

      setReport(newReport);

    } catch (err) {
      errors.push('Integrity check failed: ' + (err as Error).message);
      setReport({
        timestamp: new Date().toISOString(),
        totalCards: 0,
        totalClinics: 0,
        activeCards: 0,
        v2Cards: 0,
        cardsWithPerks: 0,
        patientsCanLookup: false,
        clinicsCanLookup: false,
        dataConsistency: false,
        errors,
        warnings
      });
    } finally {
      setLoading(false);
    }
  };

  const testCardLookup = async () => {
    if (!testCard.trim()) return;

    setLoading(true);
    try {
      // Test both patient and clinic lookup systems
      const patientResult = await (streamlinedOps as any).lookupCard(testCard.trim());

      const { data: clinicResult } = await supabase
        .from('cards')
        .select(`
          *,
          clinic:mocards_clinics(*),
          perks:card_perks(*)
        `)
        .eq('control_number', testCard.trim())
        .single();

      setTestResult({
        success: true,
        patientSystem: patientResult ? 'Found' : 'Not found',
        clinicSystem: clinicResult ? 'Found' : 'Not found',
        dataSynced: !!patientResult && !!clinicResult,
        cardData: patientResult || clinicResult
      });

    } catch (err) {
      setTestResult({
        success: false,
        error: (err as Error).message,
        patientSystem: 'Error',
        clinicSystem: 'Error',
        dataSynced: false
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runIntegrityCheck();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Data Integrity Checker</h2>
          </div>
          <button
            onClick={runIntegrityCheck}
            disabled={loading}
            className="btn btn-outline flex items-center disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Run Check
          </button>
        </div>
        <p className="text-gray-600">
          Comprehensive verification of card data integrity and system mirroring between patient and clinic systems.
        </p>
      </div>

      {/* Integrity Report */}
      {report && (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <Database className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Cards</p>
                  <p className="text-2xl font-bold text-gray-900">{report.totalCards.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Cards</p>
                  <p className="text-2xl font-bold text-gray-900">{report.activeCards.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Clinics</p>
                  <p className="text-2xl font-bold text-gray-900">{report.totalClinics.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-indigo-100">
                  <Search className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">V2 Cards</p>
                  <p className="text-2xl font-bold text-gray-900">{report.v2Cards.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Patient Lookup</h3>
                  <p className="text-sm text-gray-600">Control number only</p>
                </div>
                <div className={`p-2 rounded-full ${report.patientsCanLookup ? 'bg-green-100' : 'bg-red-100'}`}>
                  <CheckCircle className={`h-6 w-6 ${report.patientsCanLookup ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Clinic Lookup</h3>
                  <p className="text-sm text-gray-600">Full card details</p>
                </div>
                <div className={`p-2 rounded-full ${report.clinicsCanLookup ? 'bg-green-100' : 'bg-red-100'}`}>
                  <CheckCircle className={`h-6 w-6 ${report.clinicsCanLookup ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Data Consistency</h3>
                  <p className="text-sm text-gray-600">No orphaned records</p>
                </div>
                <div className={`p-2 rounded-full ${report.dataConsistency ? 'bg-green-100' : 'bg-red-100'}`}>
                  <CheckCircle className={`h-6 w-6 ${report.dataConsistency ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {report.errors.length > 0 && (
            <div className="card p-6 bg-red-50 border-red-200">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3 mt-1" />
                <div>
                  <h4 className="font-medium text-red-900 mb-2">Errors Found</h4>
                  <ul className="space-y-1">
                    {report.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-800">• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {report.warnings.length > 0 && (
            <div className="card p-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-1" />
                <div>
                  <h4 className="font-medium text-yellow-900 mb-2">Warnings</h4>
                  <ul className="space-y-1">
                    {report.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-800">• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {report.errors.length === 0 && report.warnings.length === 0 && (
            <div className="card p-6 bg-green-50 border-green-200">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <h4 className="font-medium text-green-900">All Systems Operational</h4>
                  <p className="text-sm text-green-800">
                    All {report.totalCards.toLocaleString()} cards are properly preserved and accessible through both patient and clinic systems.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Test Card Lookup */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Test Card Lookup</h3>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={testCard}
                onChange={(e) => setTestCard(e.target.value)}
                placeholder="Enter control number to test"
                className="input-field flex-1"
              />
              <button
                onClick={testCardLookup}
                disabled={loading || !testCard.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                Test Lookup
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Patient System:</span>
                    <span className={`ml-2 ${testResult.patientSystem === 'Found' ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.patientSystem}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Clinic System:</span>
                    <span className={`ml-2 ${testResult.clinicSystem === 'Found' ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.clinicSystem}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Data Synced:</span>
                    <span className={`ml-2 ${testResult.dataSynced ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.dataSynced ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                {testResult.error && (
                  <p className="text-red-700 text-sm mt-2">{testResult.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Report Metadata */}
          <div className="text-sm text-gray-500">
            Report generated: {new Date(report.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}