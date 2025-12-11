import { useState } from 'react';
import { dbOperations } from '../lib/supabase';
import bcrypt from 'bcryptjs';

interface LandingPageProps {
  onClinicView: (credentials: any) => void;
  onSuperAdminView: (token: string) => void;
  onCardholderView: (prefilledData?: { control: string }) => void;
  onITAccess: () => void;
}

export function LandingPage({ onClinicView, onSuperAdminView, onCardholderView, onITAccess }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'patient' | 'clinic'>('patient');
  const [cardControl, setCardControl] = useState('');

  const [clinicCode, setClinicCode] = useState('');
  const [clinicPassword, setClinicPassword] = useState('');

  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePatientLookup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Pass the control number to the enhanced cardholder view
    onCardholderView({
      control: cardControl
    });
  };

  const handleClinicLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const clinic = await dbOperations.getClinicByCode(clinicCode);

      if (clinic) {
        // Use bcrypt to compare the password with the stored hash
        const isValidPassword = await bcrypt.compare(clinicPassword, clinic.password_hash);

        if (isValidPassword) {
          onClinicView({
            clinicId: clinic.id,
            clinicCode: clinic.clinic_code,
            clinicName: clinic.clinic_name,
            token: `clinic-${clinic.id}` // Simple token for demo
          });
        } else {
          setError('Invalid password');
        }
      } else {
        setError('Clinic not found');
      }
    } catch (err) {
      console.error('Error logging in clinic:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const admin = await dbOperations.getAdminByUsername(adminUser);

      if (admin) {
        // Use bcrypt to compare the password with the stored hash
        const isValidPassword = await bcrypt.compare(adminPass, admin.password_hash);

        if (isValidPassword) {
          onSuperAdminView(`admin-${admin.id}`);
        } else {
          setError('Invalid password');
        }
      } else {
        setError('Admin user not found');
      }
    } catch (err) {
      console.error('Error logging in admin:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (showAdminLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="card w-full max-w-md p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="text-3xl font-medium tracking-tight text-gray-900">Admin Access</div>
            <button
              onClick={() => setShowAdminLogin(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-6 p-4">
              {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                className="input-field"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="input-field"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Notice Banner */}
      <div className="bg-blue-50 border-b border-blue-200 py-3 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs sm:text-sm text-blue-800">
            ✨ <strong className="text-blue-900">Welcome to MOCARDS:</strong> Secure loyalty card management
            <span className="hidden sm:inline text-blue-700"> for dental clinics and patients.</span>
            <span className="block sm:inline sm:ml-2 text-blue-600 text-xs mt-1 sm:mt-0">No payment processing • Card management only</span>
          </p>
        </div>
      </div>

      <header className="py-6 sm:py-8 px-4 sm:px-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xl sm:text-2xl font-bold">
            M
          </div>
          <div className="text-2xl sm:text-3xl font-medium tracking-tight text-gray-900">MOCARDS</div>
        </div>
        <button
          onClick={() => setShowAdminLogin(true)}
          className="btn btn-secondary text-xs font-bold uppercase tracking-wider px-4 py-2"
        >
          Admin
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full mb-12 sm:mb-16 text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-medium tracking-tighter text-gray-900 mb-6 sm:mb-8 leading-tight">
            Dental Loyalty<br/>Reimagined.
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed px-4 sm:px-0">
            The premium rewards platform for modern dental clinics and their valued patients.
          </p>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Patient Card */}
          <div
            className={`card cursor-pointer transition-all duration-200 ${
              activeTab === 'patient'
                ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
            onClick={() => setActiveTab('patient')}
          >
            <div className="p-8 md:p-10">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center text-2xl mb-6 text-blue-600">
                ✦
              </div>
              <h3 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-3">Patient Access</h3>
              <p className="text-gray-600 mb-8 text-base sm:text-lg">Check your card balance, available perks, and transaction history.</p>

              {activeTab === 'patient' && (
                <form onSubmit={handlePatientLookup} className="space-y-5" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Enter your card control number"
                    value={cardControl}
                    onChange={(e) => setCardControl(e.target.value)}
                    className="input-field text-lg"
                    required
                  />
                  <button
                    type="submit"
                    disabled={!cardControl.trim()}
                    className="btn btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    Check Card Status →
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Clinic Card */}
          <div
            className={`card cursor-pointer transition-all duration-200 ${
              activeTab === 'clinic'
                ? 'border-green-500 shadow-lg ring-2 ring-green-200'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
            onClick={() => setActiveTab('clinic')}
          >
            <div className="p-8 md:p-10">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center text-2xl mb-6 text-green-600">
                ◈
              </div>
              <h3 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-3">Clinic Portal</h3>
              <p className="text-gray-600 mb-8 text-base sm:text-lg">Manage cards, activate new patients, and process redemptions.</p>

              {activeTab === 'clinic' && (
                <form onSubmit={handleClinicLogin} className="space-y-5" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Clinic Code"
                    value={clinicCode}
                    onChange={(e) => setClinicCode(e.target.value)}
                    className="input-field text-lg"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={clinicPassword}
                    onChange={(e) => setClinicPassword(e.target.value)}
                    className="input-field text-lg"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Enter Portal →'}
                  </button>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm text-center">
                      {error}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* IT Access - Floating Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <button
          onClick={onITAccess}
          className="bg-white border border-gray-200 shadow-lg p-4 rounded-full transition-all duration-200 opacity-60 hover:opacity-100 hover:shadow-xl group"
          title="IT Access"
        >
          <svg className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
