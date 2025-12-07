import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { PatientCardView } from './components/PatientCardView';
import { ProductionClinicDashboard } from './components/ProductionClinicDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { CardholderLookup } from './components/CardholderLookup';
import { ITAccessLogin } from './components/ITAccessLogin';
import { ITDashboard } from './components/ITDashboard';
import { LegalFooter } from './components/LegalFooter';

export type ViewMode = 'landing' | 'patient' | 'clinic' | 'superadmin' | 'cardholder' | 'it_login' | 'it_dashboard';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [cardData, setCardData] = useState<any>(null);
  const [clinicCredentials, setClinicCredentials] = useState<any>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [itCredentials, setItCredentials] = useState<any>(null);

  const handleBackToHome = () => {
    setViewMode('landing');
    setCardData(null);
    setClinicCredentials(null);
    setAdminToken(null);
    setItCredentials(null);
  };

  const handleClinicView = (credentials: any) => {
    setClinicCredentials(credentials);
    setViewMode('clinic');
  };

  const handleSuperAdminView = (token: string) => {
    setAdminToken(token);
    setViewMode('superadmin');
  };

  const handleCardholderView = (prefilledData?: { control: string; passcode: string }) => {
    setCardData(prefilledData || null);
    setViewMode('cardholder');
  };

  const handleITAccess = () => {
    setViewMode('it_login');
  };

  const handleITLogin = (credentials: any) => {
    setItCredentials(credentials);
    setViewMode('it_dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {viewMode === 'landing' && (
        <LandingPage
          onClinicView={handleClinicView}
          onSuperAdminView={handleSuperAdminView}
          onCardholderView={handleCardholderView}
          onITAccess={handleITAccess}
        />
      )}

      {viewMode === 'patient' && cardData && (
        <PatientCardView
          cardData={cardData}
          onBack={handleBackToHome}
        />
      )}

      {viewMode === 'clinic' && clinicCredentials && (
        <ProductionClinicDashboard
          clinicId={clinicCredentials.clinicId}
          clinicCode={clinicCredentials.clinicCode}
          clinicName={clinicCredentials.clinicName}
          onBack={handleBackToHome}
        />
      )}

      {viewMode === 'superadmin' && (
        <SuperAdminDashboard
          token={adminToken}
          onBack={handleBackToHome}
        />
      )}

      {viewMode === 'it_login' && (
        <ITAccessLogin
          onLogin={handleITLogin}
          onBack={handleBackToHome}
        />
      )}

      {viewMode === 'it_dashboard' && itCredentials && (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4">
            <button
              onClick={handleBackToHome}
              className="mb-6 text-gray-600 hover:text-gray-800 flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Home</span>
            </button>
            <ITDashboard />
          </div>
        </div>
      )}

      {viewMode === 'cardholder' && (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4">
            <button
              onClick={handleBackToHome}
              className="mb-6 text-sm text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider hover:bg-gray-100 px-4 py-2 rounded-lg"
            >
              ← Back to Home
            </button>
            <CardholderLookup prefilledData={cardData} />
          </div>
        </div>
      )}

      <LegalFooter />
    </div>
  );
}
