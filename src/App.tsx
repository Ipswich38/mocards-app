import { useState } from 'react';
import { MainLayout, type ViewMode } from './components/layout/MainLayout';
import { CardLookupView } from './components/views/CardLookupView';
import { ClinicPortalView } from './components/views/ClinicPortalView';
import { AdminPortalView } from './components/views/AdminPortalView';

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
    <MainLayout currentView={currentView} onViewChange={setCurrentView}>
      {renderCurrentView()}
    </MainLayout>
  );
}