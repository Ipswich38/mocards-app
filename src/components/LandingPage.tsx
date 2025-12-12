import { useState } from 'react';
import { dbOperations } from '../lib/supabase';
import bcrypt from 'bcryptjs';

interface LandingPageProps {
  onClinicView: (credentials: any) => void;
  onSuperAdminView: (token: string) => void;
  onCardholderView: (prefilledData?: { control: string }) => void;
  onITAccess: () => void;
  onPasswordChange?: (clinic: any) => void;
}

export function LandingPage({ onClinicView, onSuperAdminView, onCardholderView, onITAccess, onPasswordChange }: LandingPageProps) {
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
          // Check if clinic needs to change password
          if (clinic.password_must_be_changed && onPasswordChange) {
            onPasswordChange({
              clinicId: clinic.id,
              clinicCode: clinic.clinic_code,
              clinicName: clinic.clinic_name,
              token: `clinic-${clinic.id}`,
              requirePasswordChange: true,
              isFirstLogin: clinic.first_login
            });
          } else {
            onClinicView({
              clinicId: clinic.id,
              clinicCode: clinic.clinic_code,
              clinicName: clinic.clinic_name,
              token: `clinic-${clinic.id}` // Simple token for demo
            });
          }
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'var(--md-sys-color-surface)' }}>
        <div className="card-airbnb-elevated w-full max-w-md p-8"> {/* Restored padding and size */}
          <div className="flex justify-between items-center mb-8"> {/* Restored margin */}
            <div className="title-large" style={{ color: 'var(--md-sys-color-accent-yellow)' }}>Admin Access</div>
            <button
              onClick={() => setShowAdminLogin(false)}
              className="state-layer p-2 rounded-full transition-all duration-200"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              ×
            </button>
          </div>

          {error && (
            <div className="rounded-lg text-sm mb-6 p-4" style={{
              backgroundColor: 'var(--md-sys-color-error-container)',
              border: '1px solid var(--md-sys-color-error)',
              color: 'var(--md-sys-color-on-error-container)',
              borderRadius: 'var(--md-sys-shape-corner-large)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="block label-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface)' }}>Username</label>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                className="input-field-enhanced"
                autoFocus
              />
            </div>
            <div>
              <label className="block label-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface)' }}>Password</label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="input-field-enhanced"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="cta-primary w-full disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--md-sys-color-surface)' }}>
      {/* Notice Banner */}
      <div className="py-4 px-4" style={{
        backgroundColor: 'var(--md-sys-color-primary-container)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)'
      }}>
        <div className="max-w-7xl mx-auto text-center">
          <p className="body-small" style={{ color: 'var(--md-sys-color-on-primary-container)' }}>
            ✨ <strong>Welcome to MOCARDS:</strong> Secure loyalty card management
            <span className="hidden sm:inline"> for dental clinics and patients.</span>
            <span className="block sm:inline sm:ml-2 opacity-90 mt-1 sm:mt-0">No payment processing • Card management only</span>
          </p>
        </div>
      </div>

      <header className="py-6 sm:py-8 px-4 sm:px-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl font-bold" style={{
            backgroundColor: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
            borderRadius: 'var(--md-sys-shape-corner-large)'
          }}>
            M
          </div>
          <div className="headline-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>MOCARDS</div>
        </div>
        <button
          onClick={() => setShowAdminLogin(true)}
          className="btn btn-filled-tonal btn-sm"
        >
          Admin
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full mb-12 sm:mb-16 text-center">
          <h1 className="display-large mb-6 sm:mb-8 leading-tight" style={{ color: 'var(--md-sys-color-on-surface)' }}>
            Dental Loyalty<br/>Reimagined.
          </h1>
          <p className="headline-small leading-relaxed px-4 sm:px-0" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            The premium rewards platform for modern dental clinics and their valued patients.
          </p>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Patient Card */}
          <div
            className={`card-interactive transition-all duration-200 ${
              activeTab === 'patient' ? 'ring-2' : ''
            }`}
            onClick={() => setActiveTab('patient')}
            style={{
              borderColor: activeTab === 'patient' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'
            }}
          >
            <div className="p-8 md:p-10">
              <div className="w-14 h-14 flex items-center justify-center text-2xl mb-6" style={{
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
                borderRadius: 'var(--md-sys-shape-corner-large)'
              }}>
                ✦
              </div>
              <h3 className="headline-large mb-3" style={{ color: 'var(--md-sys-color-on-surface)' }}>Patient Access</h3>
              <p className="body-large mb-8" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Check your card balance, available perks, and transaction history.</p>

              {activeTab === 'patient' && (
                <form onSubmit={handlePatientLookup} className="space-y-5" onClick={e => e.stopPropagation()}>
                  <div className="w-full">
                    <input
                      type="text"
                      placeholder="e.g., MOC-01-NCR1-00001"
                      value={cardControl}
                      onChange={(e) => setCardControl(e.target.value)}
                      className="input-field-enhanced"
                      style={{ fontSize: '16px' }}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!cardControl.trim()}
                    className="cta-primary w-full disabled:opacity-50"
                  >
                    Check Card Status →
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Clinic Card */}
          <div
            className={`card-interactive transition-all duration-200 ${
              activeTab === 'clinic' ? 'ring-2' : ''
            }`}
            onClick={() => setActiveTab('clinic')}
            style={{
              borderColor: activeTab === 'clinic' ? 'var(--md-sys-color-secondary)' : 'var(--md-sys-color-outline-variant)'
            }}
          >
            <div className="p-8 md:p-10">
              <div className="w-14 h-14 flex items-center justify-center text-2xl mb-6" style={{
                backgroundColor: 'var(--md-sys-color-secondary-container)',
                color: 'var(--md-sys-color-on-secondary-container)',
                borderRadius: 'var(--md-sys-shape-corner-large)'
              }}>
                ◈
              </div>
              <h3 className="headline-large mb-3" style={{ color: 'var(--md-sys-color-on-surface)' }}>Clinic Portal</h3>
              <p className="body-large mb-8" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Manage cards, activate new patients, and process redemptions.</p>

              {activeTab === 'clinic' && (
                <form onSubmit={handleClinicLogin} className="space-y-6" onClick={e => e.stopPropagation()}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                        Clinic Code
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your clinic code"
                        value={clinicCode}
                        onChange={(e) => setClinicCode(e.target.value)}
                        className="input-field-enhanced w-full"
                        style={{
                          minHeight: '52px',
                          fontSize: '16px',
                          padding: '16px',
                          borderRadius: 'var(--md-sys-shape-corner-large)'
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                        Password
                      </label>
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={clinicPassword}
                        onChange={(e) => setClinicPassword(e.target.value)}
                        className="input-field-enhanced w-full"
                        style={{
                          minHeight: '52px',
                          fontSize: '16px',
                          padding: '16px',
                          borderRadius: 'var(--md-sys-shape-corner-large)'
                        }}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="cta-secondary w-full disabled:opacity-50"
                    style={{
                      minHeight: '52px',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    {loading ? 'Verifying...' : 'Enter Portal →'}
                  </button>
                  {error && (
                    <div className="p-4 text-sm text-center" style={{
                      backgroundColor: 'var(--md-sys-color-error-container)',
                      border: '1px solid var(--md-sys-color-error)',
                      color: 'var(--md-sys-color-on-error-container)',
                      borderRadius: 'var(--md-sys-shape-corner-large)'
                    }}>
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
          className="p-4 transition-all duration-200 opacity-60 hover:opacity-100 state-layer group"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: 'var(--md-sys-shape-corner-full)',
            boxShadow: 'var(--md-sys-elevation-level3)'
          }}
          title="IT Access"
        >
          <svg className="w-6 h-6 transition-colors group-hover:opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
