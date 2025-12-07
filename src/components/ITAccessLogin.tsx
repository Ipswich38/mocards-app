import React, { useState } from 'react';
import { Shield, Eye, EyeOff, AlertCircle, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ITAccessLoginProps {
  onLogin: (credentials: { username: string; role: string }) => void;
  onBack: () => void;
}

export const ITAccessLogin: React.FC<ITAccessLoginProps> = ({ onLogin, onBack }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // IT Access Credentials (in production, hash and store securely)
      const validCredentials = [
        {
          username: 'itadmin',
          password: 'ITAccess2024!',
          role: 'it_admin',
          full_name: 'MOCARDS IT Administrator'
        },
        {
          username: 'developer',
          password: 'DevAccess2024!',
          role: 'developer',
          full_name: 'MOCARDS Developer'
        },
        {
          username: 'support',
          password: 'SupportAccess2024!',
          role: 'support',
          full_name: 'MOCARDS Support'
        }
      ];

      const validUser = validCredentials.find(
        user => user.username === credentials.username && user.password === credentials.password
      );

      if (validUser) {
        // Log the IT access login
        await supabase.rpc('log_it_activity', {
          p_actor_type: 'it_admin',
          p_actor_id: null,
          p_actor_name: validUser.full_name,
          p_action_type: 'it_access_login',
          p_action_category: 'authentication',
          p_details: {
            username: validUser.username,
            role: validUser.role,
            login_time: new Date().toISOString(),
            access_level: 'full_system_monitoring'
          },
          p_severity: 'info'
        });

        onLogin({
          username: validUser.username,
          role: validUser.role
        });
      } else {
        setError('Invalid IT access credentials');

        // Log failed login attempt
        await supabase.rpc('log_it_activity', {
          p_actor_type: 'system',
          p_actor_id: null,
          p_actor_name: 'Security Monitor',
          p_action_type: 'it_access_login_failed',
          p_action_category: 'security_event',
          p_details: {
            attempted_username: credentials.username,
            ip_address: 'unknown',
            timestamp: new Date().toISOString()
          },
          p_severity: 'warning'
        });
      }
    } catch (err: any) {
      console.error('IT login error:', err);
      setError('Login system error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MOCARDS IT ACCESS</h1>
          <p className="text-gray-400">System Monitoring & Development Access</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IT Username
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter IT username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  <span>Access IT Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* IT Access Information */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>IT Access Levels</span>
            </h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>IT Admin:</span>
                <span className="text-red-600 font-medium">Full System Access</span>
              </div>
              <div className="flex justify-between">
                <span>Developer:</span>
                <span className="text-orange-600 font-medium">Development & Debug</span>
              </div>
              <div className="flex justify-between">
                <span>Support:</span>
                <span className="text-blue-600 font-medium">Read-Only Monitoring</span>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <button
            onClick={onBack}
            className="w-full mt-4 text-gray-600 hover:text-gray-800 text-sm"
          >
            ← Back to Main Login
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            🔒 This is a restricted access area for MOCARDS development and system monitoring.
            <br />
            All activities are logged and monitored.
          </p>
        </div>
      </div>
    </div>
  );
};