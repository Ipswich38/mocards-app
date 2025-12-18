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
    <div className="min-h-screen flex">
      {/* Persistent Sidebar - Deep Teal Theme */}
      <div className="w-64 bg-[#1A535C] text-white flex flex-col fixed h-full z-10">
        {/* Header */}
        <div className="p-6 border-b border-teal-600">
          <h1 className="text-xl font-bold text-white">MOCARDS CLOUD</h1>
          <p className="text-teal-200 text-sm mt-1">HMO Management Platform</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${isActive
                        ? 'bg-white text-[#1A535C] shadow-lg'
                        : 'text-teal-100 hover:bg-teal-600 hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-[#1A535C]' : ''}`} />
                    <div className="text-left">
                      <div className={`font-medium ${isActive ? 'text-[#1A535C]' : ''}`}>
                        {item.label}
                      </div>
                      <div className={`text-xs ${isActive ? 'text-teal-600' : 'text-teal-300'}`}>
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
        <div className="p-4 border-t border-teal-600">
          <button
            onClick={() => setShowSecurityDashboard(!showSecurityDashboard)}
            className={`
              w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200
              ${showSecurityDashboard
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-teal-100 hover:bg-teal-600 hover:text-white'
              }
            `}
          >
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Security Monitor</span>
          </button>

          <div className="text-xs text-teal-300 text-center mt-3">
            MOCARDS v3.0
            <br />
            © 2024 Healthcare Innovation
          </div>
        </div>
      </div>

      {/* Main Content Area - Default Light Background */}
      <div className="flex-1 ml-64 bg-gray-50 min-h-screen">
        {children}
      </div>

      {/* Floating Security Dashboard */}
      {showSecurityDashboard && (
        <div className="fixed bottom-4 right-4 z-50 w-96 animate-slide-in-right">
          <SecurityDashboard />
        </div>
      )}
    </div>
  );
}