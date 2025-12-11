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
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="glass-card w-full max-w-md animate-float">
          <div className="flex justify-between items-center mb-8">
            <div className="text-3xl font-medium tracking-tight text-slate-100">Admin Access</div>
            <button
              onClick={() => setShowAdminLogin(false)}
              className="text-slate-400 hover:text-slate-200 text-2xl transition-colors"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="glass glass-error rounded-xl text-sm mb-6 p-4">
              {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                className="glass-input w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="glass-input w-full"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="glass-button w-full py-4 text-sm font-bold uppercase tracking-wider"
            >
              {loading ? 'Verifying...' : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Notice Banner */}
      <div className="glass border-b border-slate-500/20 py-3 px-4 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs sm:text-sm text-slate-300">
            ✨ <strong className="text-blue-300">Welcome to MOCARDS:</strong> Secure loyalty card management
            <span className="hidden sm:inline text-slate-400"> for dental clinics and patients.</span>
            <span className="block sm:inline sm:ml-2 text-slate-500 text-xs mt-1 sm:mt-0">No payment processing • Card management only</span>
          </p>
        </div>
      </div>

      <header className="py-6 sm:py-8 px-4 sm:px-6 flex justify-between items-center max-w-7xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 glass-card flex items-center justify-center text-blue-400 text-xl sm:text-2xl font-bold animate-pulse-glow">
            M
          </div>
          <div className="text-2xl sm:text-3xl font-medium tracking-tight text-slate-100">MOCARDS</div>
        </div>
        <button
          onClick={() => setShowAdminLogin(true)}
          className="glass-button-secondary text-xs font-bold uppercase tracking-wider px-4 py-2"
        >
          Admin
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative z-10">
        <div className="max-w-2xl w-full mb-12 sm:mb-16 text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-medium tracking-tighter text-slate-100 mb-6 sm:mb-8 leading-tight animate-gradient bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
            Dental Loyalty<br/>Reimagined.
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 leading-relaxed px-4 sm:px-0">
            The premium rewards platform for modern dental clinics and their valued patients.
          </p>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Patient Card */}
          <div
            className={`glass-card glass-hover cursor-pointer transition-all duration-500 ${
              activeTab === 'patient'
                ? 'border-blue-400/50 shadow-2xl shadow-blue-500/20 scale-[1.02]'
                : 'border-slate-500/20 hover:border-blue-400/30'
            }`}
            onClick={() => setActiveTab('patient')}
          >
            <div className="p-8 md:p-10">
              <div className="w-14 h-14 glass-card flex items-center justify-center text-2xl mb-6 text-blue-400 animate-pulse-glow">
                ✦
              </div>
              <h3 className="text-3xl sm:text-4xl font-medium text-slate-100 mb-3">Patient Access</h3>
              <p className="text-slate-400 mb-8 text-base sm:text-lg">Check your card balance, available perks, and transaction history.</p>

              {activeTab === 'patient' && (
                <form onSubmit={handlePatientLookup} className="space-y-5" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Enter your card control number"
                    value={cardControl}
                    onChange={(e) => setCardControl(e.target.value)}
                    className="glass-input w-full text-lg"
                    required
                  />
                  <button
                    type="submit"
                    disabled={!cardControl.trim()}
                    className="glass-button w-full py-4 text-sm font-bold uppercase tracking-wider"
                  >
                    Check Card Status →
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Clinic Card */}
          <div
            className={`glass-card glass-hover cursor-pointer transition-all duration-500 ${
              activeTab === 'clinic'
                ? 'border-cyan-400/50 shadow-2xl shadow-cyan-500/20 scale-[1.02]'
                : 'border-slate-500/20 hover:border-cyan-400/30'
            }`}
            onClick={() => setActiveTab('clinic')}
          >
            <div className="p-8 md:p-10">
              <div className="w-14 h-14 glass-card flex items-center justify-center text-2xl mb-6 text-cyan-400 animate-pulse-glow" style={{ animationDelay: '1s' }}>
                ◈
              </div>
              <h3 className="text-3xl sm:text-4xl font-medium text-slate-100 mb-3">Clinic Portal</h3>
              <p className="text-slate-400 mb-8 text-base sm:text-lg">Manage cards, activate new patients, and process redemptions.</p>

              {activeTab === 'clinic' && (
                <form onSubmit={handleClinicLogin} className="space-y-5" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Clinic Code"
                    value={clinicCode}
                    onChange={(e) => setClinicCode(e.target.value)}
                    className="glass-input w-full text-lg"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={clinicPassword}
                    onChange={(e) => setClinicPassword(e.target.value)}
                    className="glass-input w-full text-lg"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="glass-button w-full py-4 text-sm font-bold uppercase tracking-wider"
                  >
                    {loading ? 'Verifying...' : 'Enter Portal →'}
                  </button>
                  {error && (
                    <div className="glass glass-error rounded-lg p-3 text-sm text-center">
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
          className="glass-card glass-hover p-4 rounded-full shadow-lg transition-all duration-200 opacity-60 hover:opacity-100 group"
          title="IT Access"
        >
          <svg className="w-6 h-6 text-slate-400 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
