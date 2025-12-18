import { useState } from 'react';
import { ResponsiveLayout, type ViewMode } from './components/layout/ResponsiveLayout';
import { CardLookupView } from './components/views/CardLookupView';
import { ClinicPortalView } from './components/views/ClinicPortalView';
import { AdminPortalView } from './components/views/AdminPortalView';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/ui/ToastContainer';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('card-lookup');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'card-lookup':
        return <CardLookupView />;
      case 'clinic-portal':
        return <ClinicPortalView />;
      case 'admin-access':
        return <AdminPortalView />;
      default:
        return <CardLookupView />;
    }
  };

  return (
    <ToastProvider>
      <ResponsiveLayout currentView={currentView} onViewChange={setCurrentView}>
        {renderCurrentView()}
      </ResponsiveLayout>
      <ToastContainer />
    </ToastProvider>
  );
}