import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { PatientCardView } from './components/PatientCardView';
import { ClinicDashboard } from './components/ClinicDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { CardholderLookup } from './components/CardholderLookup';
import { ClinicPasswordChange } from './components/ClinicPasswordChange';
import { MOCARDSCloudAdmin } from './components/MOCARDSCloudAdmin';
import { LegalFooter } from './components/LegalFooter';

export type ViewMode = 'landing' | 'patient' | 'clinic' | 'superadmin' | 'cardholder' | 'password-change' | 'mocards-cloud';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [cardData, setCardData] = useState<any>(null);
  const [clinicCredentials, setClinicCredentials] = useState<any>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [passwordChangeData, setPasswordChangeData] = useState<any>(null);

  const handleBackToHome = () => {
    setViewMode('landing');
    setCardData(null);
    setClinicCredentials(null);
    setAdminToken(null);
    setPasswordChangeData(null);
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

  const handlePasswordChange = (clinic: any) => {
    setPasswordChangeData(clinic);
    setViewMode('password-change');
  };

  const handlePasswordChanged = (credentials: any) => {
    setClinicCredentials(credentials);
    setPasswordChangeData(null);
    setViewMode('clinic');
  };

  const handleSkipPasswordChange = () => {
    if (passwordChangeData) {
      setClinicCredentials({
        clinicId: passwordChangeData.clinicId,
        clinicCode: passwordChangeData.clinicCode,
        clinicName: passwordChangeData.clinicName,
        token: passwordChangeData.token
      });
      setPasswordChangeData(null);
      setViewMode('clinic');
    }
  };

  const handleMOCARDSCloud = () => {
    setViewMode('mocards-cloud');
  };

  return (
    <div className="bg-white min-h-screen lg:p-4">
      <div className="rounded-[40px] overflow-hidden border border-gray-100 bg-gray-50/50 min-h-[calc(100vh-2rem)]">
        {viewMode === 'landing' && (
          <LandingPage
            onClinicView={handleClinicView}
            onSuperAdminView={handleAdminView}
            onCardholderView={handleCardholderView}
            onITAccess={() => {}} // Disabled IT access
            onPasswordChange={handlePasswordChange}
            onMOCARDSCloud={handleMOCARDSCloud}
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

        {viewMode === 'password-change' && passwordChangeData && (
          <ClinicPasswordChange
            clinic={passwordChangeData}
            onPasswordChanged={handlePasswordChanged}
            onSkipForNow={passwordChangeData.isFirstLogin ? undefined : handleSkipPasswordChange}
          />
        )}

        {viewMode === 'mocards-cloud' && (
          <MOCARDSCloudAdmin onBack={handleBackToHome} />
        )}

        <LegalFooter />
      </div>
    </div>
  );
}