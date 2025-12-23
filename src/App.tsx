import { useState } from 'react';
import { ResponsiveLayout, type ViewMode } from './components/layout/ResponsiveLayout';
import { CardLookupView } from './components/views/CardLookupView';
import { ClinicPortalView } from './components/views/ClinicPortalView';
import { AdminPortalView } from './components/views/AdminPortalView';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/ui/ToastContainer';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('card-lookup');
  const { isAuthenticated, user } = useAuth();

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

  // Handle view change with authentication restrictions
  const handleViewChange = (view: ViewMode) => {
    // Card lookup is always accessible
    if (view === 'card-lookup') {
      setCurrentView(view);
      return;
    }

    // If user is authenticated, check portal restrictions
    if (isAuthenticated && user) {
      // Admin user trying to access clinic portal - blocked
      if (user.type === 'admin' && view === 'clinic-portal') {
        return; // Silently ignore - button will be disabled
      }
      // Clinic user trying to access admin portal - blocked
      if (user.type === 'clinic' && view === 'admin-access') {
        return; // Silently ignore - button will be disabled
      }
    }

    setCurrentView(view);
  };

  return (
    <ToastProvider>
      <ResponsiveLayout
        currentView={currentView}
        onViewChange={handleViewChange}
        isAuthenticated={isAuthenticated}
        userType={user?.type}
      >
        {renderCurrentView()}
      </ResponsiveLayout>
      <ToastContainer />
    </ToastProvider>
  );
}