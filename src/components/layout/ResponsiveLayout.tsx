import React from 'react';
import { Search, Stethoscope, Shield } from 'lucide-react';
import { useBreakpoint } from '../../hooks/useMediaQuery';

export type ViewMode = 'enhanced-lookup' | 'clinic-portal' | 'admin-access';

interface ResponsiveLayoutProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  children: React.ReactNode;
  isAuthenticated?: boolean;
  userType?: 'admin' | 'clinic';
}

export function ResponsiveLayout({ currentView, onViewChange, children, isAuthenticated, userType }: ResponsiveLayoutProps) {
  const { isMobile } = useBreakpoint();

  const getNavItemDisabled = (itemId: ViewMode): boolean => {
    // When not authenticated, all portals should be accessible for login
    if (!isAuthenticated || !userType) {
      return false;
    }

    // When authenticated, only allow access to matching portal type
    if (userType === 'admin' && itemId === 'clinic-portal') return true;
    if (userType === 'clinic' && itemId === 'admin-access') return true;

    return false;
  };

  const navItems = [
    {
      id: 'enhanced-lookup' as ViewMode,
      label: 'Card Lookup',
      icon: Search,
      description: 'View card details and search',
      disabled: false,
    },
    {
      id: 'clinic-portal' as ViewMode,
      label: 'Clinic Portal',
      icon: Stethoscope,
      description: 'Manage appointments',
      disabled: getNavItemDisabled('clinic-portal'),
    },
    {
      id: 'admin-access' as ViewMode,
      label: 'Admin Portal',
      icon: Shield,
      description: 'Generate cards & manage clinics',
      disabled: getNavItemDisabled('admin-access'),
    },
  ];

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Simple Mobile Header */}
        <div className="bg-white shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center justify-center px-4 py-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#1A535C] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MC</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">MOCARDS</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="bg-white border-b border-gray-200 fixed top-14 left-0 right-0 z-40">
          <div className="flex space-x-1 p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => !item.disabled && onViewChange(item.id)}
                  disabled={item.disabled}
                  className={`flex-1 flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                    currentView === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : item.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="pt-28 px-4 pb-4">
          <div className="max-w-full mx-auto">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-[#1A535C] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">MC</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MOCARDS</h1>
                <p className="text-sm text-gray-600">Dental Benefits Platform</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => !item.disabled && onViewChange(item.id)}
                    disabled={item.disabled}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                      currentView === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : item.disabled
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}