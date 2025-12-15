import { EnhancedClinicDashboard } from './EnhancedClinicDashboard';

interface ClinicDashboardProps {
  clinicCredentials: {
    clinicId: string;
    clinicCode: string;
    clinicName: string;
    token: string;
  };
  onBack: () => void;
}

export function ClinicDashboard({ clinicCredentials, onBack }: ClinicDashboardProps) {
  return (
    <EnhancedClinicDashboard
      clinicCredentials={clinicCredentials}
      onBack={onBack}
    />
  );
}