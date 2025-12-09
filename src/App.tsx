import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { PatientCardView } from './components/PatientCardView';
import { ClinicDashboard } from './components/ClinicDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { CardholderLookup } from './components/CardholderLookup';
import { LegalFooter } from './components/LegalFooter';

export type ViewMode = 'landing' | 'patient' | 'clinic' | 'superadmin' | 'cardholder';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [cardData, setCardData] = useState<any>(null);
  const [clinicCredentials, setClinicCredentials] = useState<any>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const handleBackToHome = () => {
    setViewMode('landing');
    setCardData(null);
    setClinicCredentials(null);
    setAdminToken(null);
  };

  const handleClinicView = (credentials: any) => {
    setClinicCredentials(credentials);
    setViewMode('clinic');
  };

  const handleAdminView = (token: string) => {
    setAdminToken(token);
    setViewMode('superadmin');
  };

  const handlePatientView = (data: any) => {
    setCardData(data);
    setViewMode('patient');
  };

  const handleCardholderView = () => {
    setViewMode('cardholder');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {viewMode === 'landing' && (
        <LandingPage
          onClinicView={handleClinicView}
          onSuperAdminView={handleAdminView}
          onCardholderView={handleCardholderView}
          onITAccess={() => {}} // Disabled IT access
        />
      )}

      {viewMode === 'patient' && (
        <PatientCardView
          cardData={cardData}
          onBack={handleBackToHome}
        />
      )}

      {viewMode === 'clinic' && (
        <ClinicDashboard
          clinicCredentials={clinicCredentials}
          onBack={handleBackToHome}
        />
      )}

      {viewMode === 'superadmin' && (
        <SuperAdminDashboard
          token={adminToken}
          onBack={handleBackToHome}
        />
      )}

      {viewMode === 'cardholder' && (
        <CardholderLookup
          onBack={handleBackToHome}
          onCardFound={handlePatientView}
        />
      )}

      <LegalFooter />
    </div>
  );
}