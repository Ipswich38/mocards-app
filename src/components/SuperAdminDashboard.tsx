import { MOCAdminDashboardV2 } from './MOCAdminDashboardV2';

interface SuperAdminDashboardProps {
  token: string | null;
  onBack: () => void;
}

export function SuperAdminDashboard(props: SuperAdminDashboardProps) {
  return <MOCAdminDashboardV2 {...props} />;
}