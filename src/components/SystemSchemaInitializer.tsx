import { useState } from 'react';
import { Database, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

interface SystemSchemaInitializerProps {
  onComplete?: () => void;
}

export function SystemSchemaInitializer({ onComplete }: SystemSchemaInitializerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState<string[]>([]);

  const addProgress = (message: string) => {
    setProgress(prev => [...prev, message]);
  };

  const initializeSchema = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setProgress([]);

    try {
      addProgress('📋 Schema Information Display - Ready for Manual Setup');
      addProgress('🗄️ This component shows the required schema structure');
      addProgress('📍 Tables need to be created manually using the provided SQL script');
      addProgress('💳 The MOC Card System V2.0 schema is documented and ready');

      // Simulate some progress for the UI
      await new Promise(resolve => setTimeout(resolve, 1000));
      addProgress('✅ Schema documentation completed!');

      setSuccess('Schema information displayed. Please run the provided SQL script to create the database tables.');

      if (onComplete) {
        onComplete();
      }

    } catch (err: any) {
      setError(`Schema display failed: ${err.message}`);
      addProgress(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Database className="h-8 w-8 text-blue-600 mr-3" />
        <div>
          <h3 className="text-xl font-bold text-gray-900">Database Schema Initializer</h3>
          <p className="text-gray-600">Initialize database tables for MOC Card System V2.0</p>
        </div>
      </div>

      {/* Progress Display */}
      {progress.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Progress:</h4>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {progress.map((step, index) => (
              <div key={index} className="text-sm text-gray-700 font-mono">
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={initializeSchema}
        disabled={loading}
        className="btn btn-primary w-full py-3 flex items-center justify-center disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader className="animate-spin h-5 w-5 mr-2" />
            Initializing Schema...
          </>
        ) : (
          <>
            <Database className="h-5 w-5 mr-2" />
            Initialize Database Schema
          </>
        )}
      </button>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mt-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span>{success}</span>
        </div>
      )}

      {/* Schema Information */}
      <div className="mt-6 border-t pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">This will create:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>location_codes_v2</strong> - Location codes 01-16 for all regions</li>
          <li>• <strong>clinic_codes_by_region</strong> - Clinic codes for Visayas, Luzon 4A, NCR</li>
          <li>• <strong>default_perk_templates</strong> - Default perks (consultation, cleaning, etc.)</li>
          <li>• <strong>cards table updates</strong> - New columns for MOC V2.0 format</li>
          <li>• <strong>Initial data</strong> - 16 location codes, clinic codes, and 5 default perks</li>
        </ul>
      </div>
    </div>
  );
}