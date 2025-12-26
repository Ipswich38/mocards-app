import { useState, Suspense, lazy } from 'react';
import { ResponsiveLayout, type ViewMode } from './components/layout/ResponsiveLayout';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/ui/ToastContainer';
import { useAuth } from './hooks/useAuth';

// Lazy load components for code splitting
const CardLookupView = lazy(() => import('./components/views/CardLookupView').then(module => ({ default: module.CardLookupView })));
const EnhancedCardLookupView = lazy(() => import('./components/views/EnhancedCardLookupView').then(module => ({ default: module.EnhancedCardLookupView })));
const ClinicPortalView = lazy(() => import('./components/views/ClinicPortalView').then(module => ({ default: module.ClinicPortalView })));
const AdminPortalView = lazy(() => import('./components/views/AdminPortalView').then(module => ({ default: module.AdminPortalView })));

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('card-lookup');
  const { isAuthenticated, user } = useAuth();

  const renderCurrentView = () => {
    switch (currentView) {
      case 'card-lookup':
        return <CardLookupView />;
      case 'enhanced-lookup':
        return <EnhancedCardLookupView />;
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
    // Card lookup views are always accessible
    if (view === 'card-lookup' || view === 'enhanced-lookup') {
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
        <Suspense fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="light-card p-8 w-full max-w-md text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading...</h2>
              <p className="text-gray-600">Please wait while we load the application.</p>
            </div>
          </div>
        }>
          {renderCurrentView()}
        </Suspense>
      </ResponsiveLayout>
      <ToastContainer />
    </ToastProvider>
  );
}