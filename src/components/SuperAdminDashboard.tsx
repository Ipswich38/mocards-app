import { StreamlinedAdminDashboard } from './StreamlinedAdminDashboard';

interface SuperAdminDashboardProps {
  token: string | null;
  onBack: () => void;
}

export function SuperAdminDashboard(props: SuperAdminDashboardProps) {
  return <StreamlinedAdminDashboard {...props} />;
}