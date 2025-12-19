import { useState } from 'react';
import { Stethoscope, Users, Calendar, BarChart3, Settings, LogIn, User } from 'lucide-react';
import { clinicOperations, cardOperations, type Clinic } from '../../lib/data';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastError } from '../../lib/toast';

export function ClinicPortalView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentClinic, setCurrentClinic] = useState<Clinic | null>(null);
  const [loginForm, setLoginForm] = useState({ code: '', password: '' });

  const { addToast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clinic = clinicOperations.authenticate(loginForm.code, loginForm.password);

    if (clinic) {
      setCurrentClinic(clinic);
      setIsAuthenticated(true);
      addToast(toastSuccess('Welcome', `Logged in to ${clinic.name}`));
    } else {
      addToast(toastError('Login Failed', 'Invalid clinic code or password'));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentClinic(null);
    setLoginForm({ code: '', password: '' });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="light-card p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Clinic Portal Login</h1>
            <p className="text-gray-600">Please authenticate with your clinic credentials</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Code</label>
              <input
                type="text"
                value={loginForm.code}
                onChange={(e) => setLoginForm({ ...loginForm, code: e.target.value })}
                className="light-input"
                placeholder="Enter clinic code (e.g., CVT001)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="light-input"
                placeholder="Enter clinic password"
                required
              />
            </div>
            <button type="submit" className="light-button-primary w-full flex items-center justify-center">
              <LogIn className="h-4 w-4 mr-2" />
              Access Clinic Portal
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <h3 className="font-medium text-gray-900 mb-2">Demo Credentials:</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>CVT001 / cvt001pass - Central Valley Clinic</p>
              <p>CVT002 / cvt002pass - Manila General Hospital</p>
              <p>CVT003 / cvt003pass - Laguna Medical Center</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentClinic) return null;

  const assignedCards = cardOperations.getByClinicId(currentClinic.id);
  const activeCards = assignedCards.filter(card => card.status === 'active');
  const planLimit = clinicOperations.getPlanLimit(currentClinic.id);
  const usagePercentage = (assignedCards.length / planLimit) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="light-card mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{currentClinic.name}</h1>
                <p className="text-gray-600">{currentClinic.address} • {currentClinic.code}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="light-button-secondary flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="light-card mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Subscription Status</h2>
            <span className={`plan-${currentClinic.plan} capitalize`}>
              {currentClinic.plan} Plan
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cards Assigned</span>
              <span className="font-medium">{assignedCards.length} / {planLimit}</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  usagePercentage > 90 ? 'bg-red-500' :
                  usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{assignedCards.length}</p>
                <p className="text-xs text-gray-600">Total Cards</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{activeCards.length}</p>
                <p className="text-xs text-gray-600">Active Cards</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{assignedCards.length - activeCards.length}</p>
                <p className="text-xs text-gray-600">Inactive Cards</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="light-stat-card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Patients</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="light-stat-card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Appointments</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>

        <div className="light-stat-card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue (PHP)</p>
              <p className="text-2xl font-bold text-gray-900">₱15,600</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Cards Table */}
      <div className="light-card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Assigned Cards</h2>
            <span className="text-sm text-gray-600">
              {assignedCards.length} cards assigned to this clinic
            </span>
          </div>

          {assignedCards.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Cards Assigned</h3>
              <p className="text-gray-600">
                No MOC cards have been assigned to your clinic yet. Contact the administrator to get cards assigned.
              </p>
            </div>
          ) : (
            <div className="light-table">
              <table className="w-full">
                <thead className="light-table-header">
                  <tr>
                    <th className="text-left p-4">Control Number</th>
                    <th className="text-left p-4">Patient Name</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Perks Available</th>
                    <th className="text-left p-4">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedCards.map((card) => (
                    <tr key={card.controlNumber} className="light-table-row">
                      <td className="p-4 font-mono text-sm">{card.controlNumber}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <span className="font-medium">{card.fullName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={card.status === 'active' ? 'status-active' : 'status-inactive'}>
                          {card.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${((card.perksTotal - card.perksUsed) / card.perksTotal) * 100}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {card.perksTotal - card.perksUsed}/{card.perksTotal}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{new Date(card.expiryDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}