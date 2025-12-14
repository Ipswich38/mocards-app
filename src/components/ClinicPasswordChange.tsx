import { useState } from 'react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import { Eye, EyeOff, Lock, AlertCircle, Check } from 'lucide-react';

interface ClinicPasswordChangeProps {
  clinic: {
    clinicId: string;
    clinicCode: string;
    clinicName: string;
    requirePasswordChange: boolean;
    isFirstLogin?: boolean;
  };
  onPasswordChanged: (credentials: any) => void;
  onSkipForNow?: () => void;
}

export function ClinicPasswordChange({ clinic, onPasswordChanged, onSkipForNow }: ClinicPasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      // Get current clinic data to verify current password
      const { data: clinicData, error: fetchError } = await supabase
        .from('mocards_clinics')
        .select('password_hash')
        .eq('id', clinic.clinicId)
        .single();

      if (fetchError) throw fetchError;

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, clinicData.password_hash);
      if (!isValidPassword) {
        setError('Current password is incorrect');
        return;
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password in database
      const { error: updateError } = await supabase
        .from('mocards_clinics')
        .update({
          password_hash: newPasswordHash,
          current_password: newPassword, // Store for admin visibility
          password_must_be_changed: false,
          first_login: false,
          last_password_change: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', clinic.clinicId);

      if (updateError) throw updateError;

      // Success - redirect to clinic dashboard
      onPasswordChanged({
        clinicId: clinic.clinicId,
        clinicCode: clinic.clinicCode,
        clinicName: clinic.clinicName,
        token: `clinic-${clinic.clinicId}`
      });

    } catch (err: any) {
      setError('Failed to update password: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (onSkipForNow) {
      onSkipForNow();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {clinic.isFirstLogin ? 'Welcome!' : 'Password Change Required'}
          </h1>
          <p className="text-gray-600 text-center max-w-sm mx-auto">
            {clinic.isFirstLogin
              ? `Welcome to MOCARDS, ${clinic.clinicName}! Please set up your permanent password to secure your account.`
              : 'For security reasons, you must change your password before accessing the clinic portal.'
            }
          </p>
        </div>

        {/* Password Change Form */}
        <div className="card p-6">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {clinic.isFirstLogin ? 'Temporary Password' : 'Current Password'}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your new password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="btn btn-primary w-full py-3 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Update Password
                  </>
                )}
              </button>

              {!clinic.isFirstLogin && onSkipForNow && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="btn btn-outline w-full py-3"
                  disabled={loading}
                >
                  Change Later (Go to Dashboard)
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Lock className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Security Notice</p>
              <p>Your password will be encrypted and stored securely. Make sure to choose a strong password that you can remember.</p>
            </div>
          </div>
        </div>

        {/* Clinic Info */}
        <div className="mt-4 text-center text-sm text-gray-500">
          Logged in as: <span className="font-medium">{clinic.clinicName}</span> ({clinic.clinicCode})
        </div>
      </div>
    </div>
  );
}