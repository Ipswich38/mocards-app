import { useState } from 'react';
import { Search, Stethoscope, Shield, Activity, Menu, X } from 'lucide-react';

export type ViewMode = 'card-lookup' | 'clinic-portal' | 'admin-access';

interface MainLayoutProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  children: React.ReactNode;
}

export function MainLayout({ currentView, onViewChange, children }: MainLayoutProps) {
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
    <div className="main-layout">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-white shadow-lg border border-gray-200"
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

      {/* Deep Teal Sidebar */}
      <div
        className={`sidebar-layout teal-sidebar ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-40`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">MOCARDS</h1>
              <p className="text-sm text-white/70">Philippines Healthcare</p>
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
                      ? 'teal-nav-item-active w-full text-left'
                      : 'teal-nav-item w-full text-left'
                  }
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {item.label}
                    </div>
                    <div className="text-xs opacity-80">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/20">
          <div className="text-center space-y-1">
            <div className="text-xs text-white/70">MOCARDS v4.0 Philippines</div>
            <div className="text-xs text-white/50">© 2025 Dental Group</div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Light Mode */}
      <div className="content-layout">
        <div className="h-full w-full overflow-auto p-6">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}