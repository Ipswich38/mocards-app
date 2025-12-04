import { useState } from 'react';
import { dbOperations } from '../lib/supabase';
import bcrypt from 'bcryptjs';

interface LandingPageProps {
  onClinicView: (credentials: any) => void;
  onSuperAdminView: (token: string) => void;
  onCardholderView: (prefilledData?: { control: string; passcode: string }) => void;
}

export function LandingPage({ onClinicView, onSuperAdminView, onCardholderView }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'patient' | 'clinic'>('patient');
  const [cardControl, setCardControl] = useState('');
  const [cardPasscode, setCardPasscode] = useState('');

  const [clinicCode, setClinicCode] = useState('');
  const [clinicPassword, setClinicPassword] = useState('');

  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePatientLookup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Pass the entered values to the enhanced cardholder view
    onCardholderView({
      control: cardControl,
      passcode: cardPasscode
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <div className="text-3xl font-medium tracking-tight text-gray-900">Admin Access</div>
            <button
              onClick={() => setShowAdminLogin(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-gray-900 transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-gray-900 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-black transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Legal Notice Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200 py-2 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-yellow-800">
            ⚠️ <strong>LEGAL NOTICE:</strong> This platform is for legitimate dental clinic loyalty programs only.
            No financial transactions are processed through this system.
            <span className="ml-2 text-yellow-700">Platform developed as contracted service - developer assumes no liability for misuse.</span>
          </p>
        </div>
      </div>

      <header className="py-8 px-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white text-xl font-bold">M</div>
          <div className="text-2xl font-medium tracking-tight text-gray-900">MOCARDS</div>
        </div>
        <button
          onClick={() => setShowAdminLogin(true)}
          className="text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-900 transition-colors"
        >
          Admin Login
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-medium tracking-tighter text-gray-900 mb-6">
            Dental Loyalty<br/>Reimagined.
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            The premium rewards platform for modern dental clinics and their valued patients.
          </p>
        </div>

        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">
          {/* Patient Card */}
          <div
            className={`relative overflow-hidden rounded-3xl transition-all duration-300 cursor-pointer border-2 ${
              activeTab === 'patient'
                ? 'bg-white border-blue-500 shadow-2xl scale-[1.02]'
                : 'bg-white/50 border-transparent hover:bg-white hover:border-gray-200'
            }`}
            onClick={() => setActiveTab('patient')}
          >
            <div className="p-8 md:p-10">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl mb-6 text-blue-600">
                ✦
              </div>
              <h3 className="text-3xl font-medium text-gray-900 mb-2">Patient Access</h3>
              <p className="text-gray-500 mb-8">Check your card balance, available perks, and transaction history.</p>

              {activeTab === 'patient' && (
                <form onSubmit={handlePatientLookup} className="space-y-4" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Control Number (e.g. MOC-001)"
                    value={cardControl}
                    onChange={(e) => setCardControl(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <input
                    type="password"
                    placeholder="Passcode (e.g. CAV1234)"
                    value={cardPasscode}
                    onChange={(e) => setCardPasscode(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-4 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors"
                  >
                    Check Card Status →
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Clinic Card */}
          <div
            className={`relative overflow-hidden rounded-3xl transition-all duration-300 cursor-pointer border-2 ${
              activeTab === 'clinic'
                ? 'bg-white border-teal-500 shadow-2xl scale-[1.02]'
                : 'bg-white/50 border-transparent hover:bg-white hover:border-gray-200'
            }`}
            onClick={() => setActiveTab('clinic')}
          >
            <div className="p-8 md:p-10">
              <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-2xl mb-6 text-teal-600">
                ◈
              </div>
              <h3 className="text-3xl font-medium text-gray-900 mb-2">Clinic Portal</h3>
              <p className="text-gray-500 mb-8">Manage cards, activate new patients, and process redemptions.</p>

              {activeTab === 'clinic' && (
                <form onSubmit={handleClinicLogin} className="space-y-4" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Clinic Code"
                    value={clinicCode}
                    onChange={(e) => setClinicCode(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={clinicPassword}
                    onChange={(e) => setClinicPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-600 text-white py-4 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Enter Portal →'}
                  </button>
                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
