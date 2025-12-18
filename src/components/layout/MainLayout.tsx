import { useState } from 'react';
import { Search, Stethoscope, Shield, Activity, Menu, X } from 'lucide-react';
import { SecurityDashboard } from '../ui/SecurityDashboard';

export type ViewMode = 'card-lookup' | 'clinic-portal' | 'admin-access';

interface MainLayoutProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  children: React.ReactNode;
}

export function MainLayout({ currentView, onViewChange, children }: MainLayoutProps) {
  const [showSecurityDashboard, setShowSecurityDashboard] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    {
      id: 'card-lookup' as ViewMode,
      label: 'Card Lookup',
      icon: Search,
      description: 'Verify MOC card validity',
    },
    {
      id: 'clinic-portal' as ViewMode,
      label: 'Clinic Portal',
      icon: Stethoscope,
      description: 'Clinic management tools',
    },
    {
      id: 'admin-access' as ViewMode,
      label: 'Admin Access',
      icon: Shield,
      description: 'System administration',
    },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white shadow-lg border border-gray-200"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* iOS-style Sidebar */}
      <div
        className={`ios-sidebar ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-40`}
      >
        {/* Header */}
        <div className="ios-header">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="ios-text-title text-xl">MOCARDS</h1>
              <p className="ios-text-caption">Philippines Healthcare</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={
                    isActive
                      ? 'ios-nav-item-active w-full text-left'
                      : 'ios-nav-item w-full text-left hover:bg-gray-50'
                  }
                >
                  <Icon
                    className={`h-5 w-5 mr-3 ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="ios-text-subtitle text-sm font-medium">
                      {item.label}
                    </div>
                    <div className="ios-text-caption text-xs">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setShowSecurityDashboard(!showSecurityDashboard)}
            className={
              showSecurityDashboard
                ? 'ios-button-primary w-full text-sm'
                : 'ios-button-secondary w-full text-sm'
            }
          >
            <Activity className="h-4 w-4 mr-2" />
            Security Monitor
          </button>

          <div className="text-center mt-4 space-y-1">
            <div className="ios-text-caption text-xs">MOCARDS v3.0 Philippines</div>
            <div className="ios-text-caption text-xs">© 2024 Healthcare Innovation</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ios-main-content">
        <div className="h-full w-full overflow-auto p-4 md:p-6">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </div>
      </div>

      {/* Floating Security Dashboard */}
      {showSecurityDashboard && (
        <div className="fixed bottom-6 right-6 z-50 w-96 animate-slide-in-right">
          <div className="ios-card p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="ios-text-subtitle">Security Monitor</h3>
              <button
                onClick={() => setShowSecurityDashboard(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            <SecurityDashboard />
          </div>
        </div>
      )}
    </div>
  );
}