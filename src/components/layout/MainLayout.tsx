import { useState } from 'react';
import { Search, Stethoscope, Shield, Activity } from 'lucide-react';
import { SecurityDashboard } from '../ui/SecurityDashboard';

export type ViewMode = 'card-lookup' | 'clinic-portal' | 'admin-access';

interface MainLayoutProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  children: React.ReactNode;
}

export function MainLayout({ currentView, onViewChange, children }: MainLayoutProps) {
  const [showSecurityDashboard, setShowSecurityDashboard] = useState(false);

  const navItems = [
    {
      id: 'card-lookup' as ViewMode,
      label: 'Card Lookup',
      icon: Search,
      description: 'Verify card validity',
    },
    {
      id: 'clinic-portal' as ViewMode,
      label: 'Clinic Portal',
      icon: Stethoscope,
      description: 'Clinic management',
    },
    {
      id: 'admin-access' as ViewMode,
      label: 'Admin Access',
      icon: Shield,
      description: 'System administration',
    },
  ];

  return (
    <div className="min-h-screen flex bg-background-secondary">
      {/* iOS-style Sidebar - Light Mode */}
      <div className="w-72 bg-background-elevated border-r border-border-light flex flex-col fixed h-full z-10 shadow-ios">
        {/* Header */}
        <div className="safe-top p-6 border-b border-border-light">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-healthcare-primary rounded-ios flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-ios-title-3 font-semibold text-text-primary">MOCARDS</h1>
              <p className="text-ios-caption-1 text-text-tertiary">Healthcare Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={
                      isActive
                        ? 'nav-ios-item-active w-full'
                        : 'nav-ios-item w-full hover:bg-ios-gray-100 hover:text-text-primary'
                    }
                  >
                    <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-healthcare-primary' : 'text-text-tertiary'}`} />
                    <div className="text-left flex-1">
                      <div className="text-ios-callout font-medium">
                        {item.label}
                      </div>
                      <div className="text-ios-caption-1 text-text-tertiary">
                        {item.description}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Security Dashboard Toggle */}
        <div className="safe-bottom p-4 border-t border-border-light">
          <button
            onClick={() => setShowSecurityDashboard(!showSecurityDashboard)}
            className={
              showSecurityDashboard
                ? 'btn-ios-primary w-full'
                : 'btn-ios-secondary w-full'
            }
          >
            <Activity className="h-4 w-4 mr-2" />
            <span className="text-ios-footnote font-medium">Security Monitor</span>
          </button>

          <div className="text-ios-caption-2 text-text-quaternary text-center mt-4 space-y-1">
            <div>MOCARDS v3.0 Philippines</div>
            <div>© 2024 Healthcare Innovation</div>
          </div>
        </div>
      </div>

      {/* Main Content Area - iOS Light Background */}
      <div className="flex-1 ml-72 bg-background-secondary min-h-screen">
        <div className="h-full w-full overflow-auto scrollbar-ios">
          {children}
        </div>
      </div>

      {/* Floating Security Dashboard */}
      {showSecurityDashboard && (
        <div className="fixed bottom-6 right-6 z-50 w-96 animate-ios-slide-up">
          <div className="card-ios-large">
            <SecurityDashboard />
          </div>
        </div>
      )}
    </div>
  );
}