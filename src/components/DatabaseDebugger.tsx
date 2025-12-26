import { useState } from 'react';
import { Database, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function DatabaseDebugger() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runDatabaseCheck = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('[DEBUG] Starting database analysis...');

      // 1. Check if cards table exists and get structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', 'cards')
        .eq('table_schema', 'public');

      // 2. Get sample cards data
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .limit(10);

      // 3. Get cards count
      const { count: cardsCount, error: countError } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true });

      // 4. Test direct control_number search
      const { data: testSearch, error: searchError } = await supabase
        .from('cards')
        .select('*')
        .limit(5);

      const debugResults = {
        tableStructure: {
          data: tableInfo,
          error: tableError
        },
        sampleCards: {
          data: cardsData,
          error: cardsError
        },
        totalCards: {
          count: cardsCount,
          error: countError
        },
        testSearch: {
          data: testSearch,
          error: searchError
        },
        timestamp: new Date().toISOString()
      };

      console.log('[DEBUG] Complete database analysis:', debugResults);
      setResults(debugResults);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[DEBUG] Database check failed:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="light-card p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <Database className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Database Debugger</h2>
      </div>

      <button
        onClick={runDatabaseCheck}
        disabled={isLoading}
        className="light-button-primary flex items-center space-x-2 mb-6"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Analyzing Database...</span>
          </>
        ) : (
          <>
            <Search className="h-4 w-4" />
            <span>Run Database Analysis</span>
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">Database Error</span>
          </div>
          <p className="text-red-700 mt-2">{error}</p>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Database Analysis Complete</span>
          </div>

          {/* Table Structure */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Cards Table Structure</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {results.tableStructure.error ? (
                <p className="text-red-600">Error: {results.tableStructure.error.message}</p>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Found {results.tableStructure.data?.length || 0} columns in cards table
                  </p>
                  {results.tableStructure.data && results.tableStructure.data.length > 0 && (
                    <div className="text-xs font-mono">
                      {results.tableStructure.data.map((col: any, i: number) => (
                        <div key={i} className="text-gray-700">
                          {col.column_name}: {col.data_type}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cards Count */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Total Cards</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {results.totalCards.error ? (
                <p className="text-red-600">Error: {results.totalCards.error.message}</p>
              ) : (
                <p className="text-2xl font-bold text-blue-600">{results.totalCards.count} cards</p>
              )}
            </div>
          </div>

          {/* Sample Cards */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Sample Cards Data</h3>
            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              {results.sampleCards.error ? (
                <p className="text-red-600">Error: {results.sampleCards.error.message}</p>
              ) : (
                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(results.sampleCards.data, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* Test Search */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Basic Query Test</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {results.testSearch.error ? (
                <p className="text-red-600">Error: {results.testSearch.error.message}</p>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Query returned {results.testSearch.data?.length || 0} cards
                  </p>
                  {results.testSearch.data && results.testSearch.data.length > 0 && (
                    <div className="text-xs">
                      <p className="font-medium text-gray-700">First card control_number:</p>
                      <p className="font-mono text-blue-600">{results.testSearch.data[0]?.control_number || 'No control_number field'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Raw Results */}
          <details className="border border-gray-200 rounded-lg">
            <summary className="p-4 cursor-pointer font-medium">View Raw Results</summary>
            <div className="p-4 border-t bg-gray-50">
              <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}