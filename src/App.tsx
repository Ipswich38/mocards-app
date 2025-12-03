import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { PatientCardView } from './components/PatientCardView';
import { ProductionClinicDashboard } from './components/ProductionClinicDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';

export type ViewMode = 'landing' | 'patient' | 'clinic' | 'superadmin';

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

  const handlePatientView = (data: any) => {
    setCardData(data);
    setViewMode('patient');
  };

  const handleClinicView = (credentials: any) => {
    setClinicCredentials(credentials);
    setViewMode('clinic');
  };

  const handleSuperAdminView = (token: string) => {
    setAdminToken(token);
    setViewMode('superadmin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {viewMode === 'landing' && (
        <LandingPage
          onPatientView={handlePatientView}
          onClinicView={handleClinicView}
          onSuperAdminView={handleSuperAdminView}
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
    </div>
  );
}
