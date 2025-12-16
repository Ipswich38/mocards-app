import { Search, Stethoscope, Shield } from 'lucide-react';

export type ViewMode = 'card-lookup' | 'clinic-portal' | 'admin-access';

interface MainLayoutProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  children: React.ReactNode;
}

export function MainLayout({ currentView, onViewChange, children }: MainLayoutProps) {
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
      {/* Persistent Sidebar */}
      <div className="w-64 bg-[#1A535C] text-white flex flex-col">
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
                      w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all
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

        {/* Footer */}
        <div className="p-4 border-t border-teal-600">
          <div className="text-xs text-teal-300 text-center">
            MOCARDS v3.0
            <br />
            © 2024 Healthcare Innovation
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}