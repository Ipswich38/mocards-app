import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Lock, Save, Eye, EyeOff, Shield, AlertCircle, CheckCircle } from 'lucide-react';

interface AdminProfile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  last_login_at?: string;
}

export const AdminProfileManagement: React.FC = () => {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    full_name: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Mock admin profile - in production, this would come from JWT token or session
  const mockAdminId = '609e400b-27bf-476a-a5f5-7d793d85293f';

  useEffect(() => {
    loadAdminProfile();
  }, []);

  const loadAdminProfile = async () => {
    try {
      // For demonstration, we'll create a mock admin profile
      // In production, this would query the admin_accounts table
      const mockProfile: AdminProfile = {
        id: mockAdminId,
        username: 'admin',
        email: 'admin@mocards.local',
        full_name: 'MOCARDS Administrator',
        role: 'super_admin',
        created_at: '2024-01-01T00:00:00Z',
        last_login_at: new Date().toISOString()
      };

      setProfile(mockProfile);
      setEditForm({
        username: mockProfile.username,
        email: mockProfile.email,
        full_name: mockProfile.full_name
      });

      // Log the profile access
      await supabase.rpc('log_it_activity', {
        p_actor_type: 'admin',
        p_action_type: 'profile_accessed',
        p_action_category: 'authentication',
        p_actor_id: mockProfile.id,
        p_actor_name: mockProfile.full_name,
        p_severity: 'info'
      });

    } catch (error) {
      console.error('Error loading admin profile:', error);
      setMessage({ type: 'error', text: 'Failed to load admin profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!profile) return;

    try {
      setIsLoading(true);

      // Validate form
      if (!editForm.username.trim() || !editForm.email.trim() || !editForm.full_name.trim()) {
        setMessage({ type: 'error', text: 'All fields are required' });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email)) {
        setMessage({ type: 'error', text: 'Please enter a valid email address' });
        return;
      }

      // In production, this would update the admin_accounts table
      // For now, we'll simulate the update
      const updatedProfile: AdminProfile = {
        ...profile,
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        full_name: editForm.full_name.trim()
      };

      setProfile(updatedProfile);

      // Log the profile update
      await supabase.rpc('log_it_activity', {
        p_actor_type: 'admin',
        p_action_type: 'profile_updated',
        p_action_category: 'authentication',
        p_actor_id: profile.id,
        p_actor_name: profile.full_name,
        p_details: {
          updated_fields: ['username', 'email', 'full_name'],
          old_values: {
            username: profile.username,
            email: profile.email,
            full_name: profile.full_name
          },
          new_values: editForm
        },
        p_severity: 'info'
      });

      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setIsEditing(false);

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async () => {
    if (!profile) return;

    try {
      setIsLoading(true);

      // Validate password form
      if (!passwordForm.current_password) {
        setMessage({ type: 'error', text: 'Current password is required' });
        return;
      }

      if (!passwordForm.new_password) {
        setMessage({ type: 'error', text: 'New password is required' });
        return;
      }

      if (passwordForm.new_password !== passwordForm.confirm_password) {
        setMessage({ type: 'error', text: 'New passwords do not match' });
        return;
      }

      // Password strength validation
      if (passwordForm.new_password.length < 8) {
        setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
        return;
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.new_password)) {
        setMessage({ type: 'error', text: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
        return;
      }

      // In production, this would hash and update the password in admin_accounts table
      // For now, we'll simulate the password update

      // Log the password change
      await supabase.rpc('log_it_activity', {
        p_actor_type: 'admin',
        p_action_type: 'password_changed',
        p_action_category: 'security_event',
        p_actor_id: profile.id,
        p_actor_name: profile.full_name,
        p_details: {
          timestamp: new Date().toISOString(),
          security_level: 'high'
        },
        p_severity: 'warning'
      });

      setMessage({ type: 'success', text: 'Password updated successfully' });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordForm(false);

    } catch (error) {
      console.error('Error updating password:', error);
      setMessage({ type: 'error', text: 'Failed to update password' });
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 font-medium">Profile Not Found</span>
        </div>
        <p className="text-red-700 mt-2">Unable to load admin profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <User className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Admin Profile Management</h2>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span>{message.text}</span>
              </div>
              <button
                onClick={clearMessage}
                className="text-xs underline opacity-75 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={isEditing ? editForm.username : profile.username}
                onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={isEditing ? editForm.email : profile.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={isEditing ? editForm.full_name : profile.full_name}
                onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    <User className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Change Password</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={updateProfile}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        username: profile.username,
                        email: profile.email,
                        full_name: profile.full_name
                      });
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Account Details</h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Role</span>
                <span className="flex items-center space-x-1">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Super Administrator</span>
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Account Created</span>
                <span className="text-sm text-gray-700">
                  {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Last Login</span>
                <span className="text-sm text-gray-700">
                  {profile.last_login_at
                    ? new Date(profile.last_login_at).toLocaleString()
                    : 'Never'
                  }
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Account Status</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  ● Active
                </span>
              </div>
            </div>

            {/* Security Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Security Information</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <p>• Two-factor authentication: Recommended</p>
                <p>• Password last changed: Unknown</p>
                <p>• Login attempts: Monitor for suspicious activity</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters.
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={updatePassword}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};