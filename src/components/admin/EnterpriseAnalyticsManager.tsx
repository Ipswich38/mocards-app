import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, AlertTriangle, CheckCircle, Database, Trash2, Activity, TrendingUp } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastError, toastWarning, toastInfo } from '../../lib/toast';
import {
  resetEnterpriseAnalytics,
  verifyAnalyticsReset,
  getAnalyticsResetStatus
} from '../../lib/enterpriseAnalyticsReset';
import { logBusinessEvent } from '../../lib/productionMonitoring';

interface ResetStatus {
  isReset: boolean;
  lastReset: Date | null;
  baseline: any;
}

export default function EnterpriseAnalyticsManager() {
  const [resetStatus, setResetStatus] = useState<ResetStatus | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadResetStatus();
  }, []);

  const loadResetStatus = async () => {
    try {
      const status = getAnalyticsResetStatus();
      setResetStatus(status);
      console.log('📊 Analytics Reset Status:', status);
    } catch (error) {
      console.error('Failed to load reset status:', error);
    }
  };

  const handleAnalyticsReset = async () => {
    if (!showConfirmDialog) {
      setShowConfirmDialog(true);
      return;
    }

    setShowConfirmDialog(false);
    setIsResetting(true);

    try {
      addToast(toastInfo('Analytics Reset', 'Starting enterprise analytics reset...'));
      console.log('🚀 Starting enterprise analytics reset...');

      const result = await resetEnterpriseAnalytics();

      if (result.success) {
        addToast(toastSuccess(
          'Reset Complete!',
          `Successfully reset ${result.clearedTables.length} analytics components`
        ));

        logBusinessEvent('enterprise_analytics_reset_success', 1, {
          resetId: result.resetId,
          tablesCleared: result.clearedTables.length
        });

        // Reload status
        await loadResetStatus();

        console.log('✅ Enterprise Analytics Reset Completed:', result);
      } else {
        addToast(toastError(
          'Reset Incomplete',
          `Reset completed with ${result.errors.length} errors. Check console for details.`
        ));
        console.error('❌ Analytics reset had errors:', result.errors);
      }

    } catch (error) {
      addToast(toastError(
        'Reset Failed',
        `Analytics reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
      console.error('💥 Analytics reset failed:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleVerifyReset = async () => {
    setIsVerifying(true);

    try {
      addToast(toastInfo('Verification', 'Verifying analytics reset completion...'));

      const verification = await verifyAnalyticsReset();
      setVerificationResult(verification);

      if (verification.verified) {
        addToast(toastSuccess('Verification Passed', 'Analytics reset verified successfully!'));
      } else {
        addToast(toastWarning(
          'Verification Issues',
          `Found ${verification.details.nonEmptyTables.length} tables with remaining data`
        ));
      }

      console.log('🔍 Verification Result:', verification);
    } catch (error) {
      addToast(toastError(
        'Verification Failed',
        `Could not verify reset: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    } finally {
      setIsVerifying(false);
    }
  };

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  };

  const getStatusColor = () => {
    if (!resetStatus) return 'bg-gray-100 text-gray-600';
    return resetStatus.isReset ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
  };

  const getStatusText = () => {
    if (!resetStatus) return 'Unknown';
    return resetStatus.isReset ? 'Reset to Fresh State' : 'Contains Historical Data';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <BarChart3 className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Enterprise Analytics Manager</h2>
          <p className="text-sm text-gray-600">Reset analytics to fresh state for client deployment</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="light-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Analytics Status</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <Activity className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Last Reset</p>
              <p className="text-xs text-gray-600">{formatDateTime(resetStatus?.lastReset)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Database className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Baseline Exists</p>
              <p className="text-xs text-gray-600">
                {resetStatus?.baseline ? 'Yes' : 'No'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Reset ID</p>
              <p className="text-xs text-gray-600 font-mono">
                {resetStatus?.baseline?.reset_id?.slice(-8) || 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Card */}
      <div className="light-card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Analytics Actions</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reset Button */}
          <button
            onClick={handleAnalyticsReset}
            disabled={isResetting}
            className={`light-button-destructive flex items-center justify-center space-x-2 p-4 ${
              isResetting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isResetting ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Resetting Analytics...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5" />
                <span>Reset to Fresh State</span>
              </>
            )}
          </button>

          {/* Verify Button */}
          <button
            onClick={handleVerifyReset}
            disabled={isVerifying}
            className={`light-button-secondary flex items-center justify-center space-x-2 p-4 ${
              isVerifying ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>Verify Reset</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Verification Results */}
      {verificationResult && (
        <div className="light-card p-6">
          <div className="flex items-center space-x-3 mb-4">
            {verificationResult.verified ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            )}
            <h3 className="text-lg font-medium text-gray-900">
              Verification Results
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2">
                ✅ Empty Tables ({verificationResult.details.emptyTables.length})
              </h4>
              <div className="space-y-1">
                {verificationResult.details.emptyTables.slice(0, 5).map((table: string, index: number) => (
                  <p key={index} className="text-xs text-gray-600 font-mono">{table}</p>
                ))}
                {verificationResult.details.emptyTables.length > 5 && (
                  <p className="text-xs text-gray-500">
                    ... and {verificationResult.details.emptyTables.length - 5} more
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">
                ⚠️ Non-Empty Tables ({verificationResult.details.nonEmptyTables.length})
              </h4>
              <div className="space-y-1">
                {verificationResult.details.nonEmptyTables.map((table: string, index: number) => (
                  <p key={index} className="text-xs text-gray-600 font-mono">{table}</p>
                ))}
                {verificationResult.details.nonEmptyTables.length === 0 && (
                  <p className="text-xs text-gray-500">All analytics tables are empty ✅</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                LocalStorage Cleared: {verificationResult.details.localStorageCleared ? 'Yes' : 'No'}
              </span>
              <span className="text-gray-600">
                Baseline Exists: {verificationResult.details.baselineExists ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Baseline Information */}
      {resetStatus?.baseline && (
        <div className="light-card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Baseline</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Users:</span>
                <span className="ml-2 text-gray-900">
                  {resetStatus.baseline.initial_state?.total_users || 0}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Cards:</span>
                <span className="ml-2 text-gray-900">
                  {resetStatus.baseline.initial_state?.total_cards || 0}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Clinics:</span>
                <span className="ml-2 text-gray-900">
                  {resetStatus.baseline.initial_state?.total_clinics || 0}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Revenue:</span>
                <span className="ml-2 text-gray-900">
                  ₱{resetStatus.baseline.initial_state?.total_revenue || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Analytics Reset</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-3">
                This will permanently delete all analytics data including:
              </p>
              <ul className="text-xs text-gray-600 space-y-1 ml-4">
                <li>• All historical analytics events and metrics</li>
                <li>• Performance data and user behavior analytics</li>
                <li>• Dashboard cache and stored analytics preferences</li>
                <li>• Business metrics and revenue tracking data</li>
              </ul>
              <p className="text-sm text-gray-700 mt-3">
                The system will be reset to a fresh state as if newly deployed.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 light-button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAnalyticsReset}
                className="flex-1 light-button-destructive"
              >
                Reset Analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}