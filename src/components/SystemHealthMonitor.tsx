import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface HealthCheck {
  database: boolean;
  clinicTable: boolean;
  cardsTable: boolean;
  sequences: boolean;
  functions: boolean;
  lastChecked: string;
}

interface SystemHealthMonitorProps {
  enabled?: boolean;
  onHealthChange?: (health: HealthCheck) => void;
}

export function SystemHealthMonitor({ enabled = true, onHealthChange }: SystemHealthMonitorProps) {
  const [health, setHealth] = useState<HealthCheck>({
    database: false,
    clinicTable: false,
    cardsTable: false,
    sequences: false,
    functions: false,
    lastChecked: ''
  });
  const [isMonitoring, setIsMonitoring] = useState(enabled);

  const checkSystemHealth = async (): Promise<HealthCheck> => {
    const healthResult: HealthCheck = {
      database: false,
      clinicTable: false,
      cardsTable: false,
      sequences: false,
      functions: false,
      lastChecked: new Date().toISOString()
    };

    try {
      // Check database connection
      const { error: dbError } = await supabase.from('information_schema.tables').select('table_name').limit(1);
      healthResult.database = !dbError;

      if (healthResult.database) {
        // Check clinics table
        try {
          const { error: clinicError } = await supabase.from('clinics').select('count').limit(1);
          healthResult.clinicTable = !clinicError;
        } catch (e) {
          console.warn('Clinic table check failed:', e);
        }

        // Check cards table
        try {
          const { error: cardError } = await supabase.from('cards').select('count').limit(1);
          healthResult.cardsTable = !cardError;
        } catch (e) {
          console.warn('Cards table check failed:', e);
        }

        // Check sequences
        try {
          const { data: seqData, error: seqError } = await supabase.rpc('check_sequence', { sequence_name: 'card_number_seq' }).single();
          healthResult.sequences = !seqError && Boolean(seqData);
        } catch (e) {
          console.warn('Sequence check failed:', e);
        }

        // Check functions
        try {
          const { data: funcData, error: funcError } = await supabase.rpc('generate_card_control_number');
          healthResult.functions = !funcError && typeof funcData === 'string';
        } catch (e) {
          console.warn('Function check failed:', e);
        }
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }

    return healthResult;
  };

  const runHealthCheck = async () => {
    if (!isMonitoring) return;

    try {
      const newHealth = await checkSystemHealth();
      setHealth(newHealth);
      onHealthChange?.(newHealth);

      // Log critical issues
      if (!newHealth.database) {
        console.error('🚨 CRITICAL: Database connection failed');
      }
      if (!newHealth.clinicTable) {
        console.warn('⚠️ WARNING: Clinic table access failed');
      }
      if (!newHealth.cardsTable) {
        console.warn('⚠️ WARNING: Cards table access failed');
      }
      if (!newHealth.functions) {
        console.warn('⚠️ WARNING: Card generation function failed');
      }

      // Store health status
      localStorage.setItem('mocards_health', JSON.stringify(newHealth));
    } catch (error) {
      console.error('Health monitor error:', error);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Initial health check
    runHealthCheck();

    // Set up periodic health checks (every 30 seconds)
    const interval = setInterval(runHealthCheck, 30000);

    return () => clearInterval(interval);
  }, [enabled, isMonitoring]);

  const getHealthScore = () => {
    const checks = [health.database, health.clinicTable, health.cardsTable, health.sequences, health.functions];
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  };

  const getHealthColor = () => {
    const score = getHealthScore();
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!enabled || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs z-50">
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${health.database ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="font-medium">System Health</span>
        <span className={`font-bold ${getHealthColor()}`}>{getHealthScore()}%</span>
      </div>

      <div className="space-y-1">
        <div className={`flex justify-between ${health.database ? 'text-green-600' : 'text-red-600'}`}>
          <span>Database:</span>
          <span>{health.database ? '✅' : '❌'}</span>
        </div>
        <div className={`flex justify-between ${health.clinicTable ? 'text-green-600' : 'text-red-600'}`}>
          <span>Clinics:</span>
          <span>{health.clinicTable ? '✅' : '❌'}</span>
        </div>
        <div className={`flex justify-between ${health.cardsTable ? 'text-green-600' : 'text-red-600'}`}>
          <span>Cards:</span>
          <span>{health.cardsTable ? '✅' : '❌'}</span>
        </div>
        <div className={`flex justify-between ${health.functions ? 'text-green-600' : 'text-red-600'}`}>
          <span>Functions:</span>
          <span>{health.functions ? '✅' : '❌'}</span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="text-gray-500">
          Last: {new Date(health.lastChecked).toLocaleTimeString()}
        </div>
        <button
          onClick={() => setIsMonitoring(!isMonitoring)}
          className={`mt-1 text-xs px-2 py-1 rounded ${
            isMonitoring ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {isMonitoring ? 'Monitoring' : 'Paused'}
        </button>
      </div>
    </div>
  );
}

// Hook to get current system health
export const useSystemHealth = () => {
  const [health, setHealth] = useState<HealthCheck | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mocards_health');
      if (stored) {
        setHealth(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load health status:', e);
    }
  }, []);

  return health;
};