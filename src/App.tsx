import { useState, Suspense, lazy, useEffect } from 'react';
import { ResponsiveLayout, type ViewMode } from './components/layout/ResponsiveLayout';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/ui/ToastContainer';
import { useLegacyAuth } from './features/authentication';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { SystemHealthMonitor } from './components/SystemHealthMonitor';
import { healthChecker } from './lib/healthCheck';
import { logBusinessEvent } from './lib/productionMonitoring';

// Lazy load components for code splitting
const EnhancedCardLookupView = lazy(() => import('./components/views/EnhancedCardLookupView').then(module => ({ default: module.EnhancedCardLookupView })));
const ClinicPortalView = lazy(() => import('./components/views/ClinicPortalView').then(module => ({ default: module.ClinicPortalView })));
const AdminPortalView = lazy(() => import('./components/views/AdminPortalView').then(module => ({ default: module.AdminPortalView })));

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('enhanced-lookup');
  const { isAuthenticated, user } = useLegacyAuth();

  // Initialize production monitoring and health checks
  useEffect(() => {
    // Start health monitoring
    healthChecker.startMonitoring(60000); // Check every minute

    // Log application startup
    logBusinessEvent('app_startup', 1, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`
    });

    // Perform initial health check
    healthChecker.performHealthCheck().then(health => {
      console.log('🏥 Initial health check completed:', health.overall);
      if (health.overall === 'critical') {
        console.error('🚨 Critical system issues detected on startup');
      }
    });

    // Log app version and build info
    console.log('🚀 MOCARDS CLOUD - Production Ready', {
      timestamp: new Date().toISOString(),
      build: 'production',
      monitoring: 'active'
    });

    // Cleanup on unmount
    return () => {
      healthChecker.stopMonitoring();
    };
  }, []);

  // Redirect to card lookup when user logs out and reset view to allow portal switching
  useEffect(() => {
    if (!isAuthenticated && (currentView === 'admin-access' || currentView === 'clinic-portal')) {
      setCurrentView('enhanced-lookup');
    }
  }, [isAuthenticated]); // Removed currentView from dependencies to prevent infinite loops

  // Log view changes for analytics
  useEffect(() => {
    logBusinessEvent('view_change', 1, {
      from: 'previous_view',
      to: currentView,
      authenticated: isAuthenticated,
      userType: user?.type
    });
  }, [currentView, isAuthenticated, user?.type]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'enhanced-lookup':
        return <EnhancedCardLookupView />;
      case 'clinic-portal':
        return <ClinicPortalView />;
      case 'admin-access':
        return <AdminPortalView />;
      default:
        return <EnhancedCardLookupView />;
    }
  };

  // Handle view change with authentication restrictions
  const handleViewChange = (view: ViewMode) => {
    // Enhanced lookup is always accessible
    if (view === 'enhanced-lookup') {
      setCurrentView(view);
      return;
    }

    // Allow portal switching when not authenticated (user can choose which portal to log into)
    // When authenticated, allow access to the matching portal type only
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

    // Allow view change for all other cases (including when not authenticated)
    setCurrentView(view);
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ResponsiveLayout
          currentView={currentView}
          onViewChange={handleViewChange}
          isAuthenticated={isAuthenticated}
          userType={user?.type as "admin" | "clinic" | undefined}
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

        {/* Development Diagnostic Tools */}
        <DiagnosticPanel />
        <SystemHealthMonitor enabled={process.env.NODE_ENV !== 'production'} />
      </ToastProvider>
    </ErrorBoundary>
  );
}