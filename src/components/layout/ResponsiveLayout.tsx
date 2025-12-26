import React, { useState, useEffect } from 'react';
import { Search, Stethoscope, Shield, Activity } from 'lucide-react';
import { SecurityDashboard } from '../ui/SecurityDashboard';
import { MobileNavigation } from '../ui/MobileNavigation';
import { PWAInstallPrompt } from '../ui/PWAInstallPrompt';
import { CloudSyncIndicator } from '../ui/CloudSyncIndicator';
import { useBreakpoint, useScreenSize } from '../../hooks/useMediaQuery';

export type ViewMode = 'card-lookup' | 'enhanced-lookup' | 'clinic-portal' | 'admin-access';

interface ResponsiveLayoutProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  children: React.ReactNode;
  isAuthenticated?: boolean;
  userType?: 'admin' | 'clinic';
}

export function ResponsiveLayout({ currentView, onViewChange, children, isAuthenticated, userType }: ResponsiveLayoutProps) {
  const [showSecurityDashboard, setShowSecurityDashboard] = useState(false);
  const { isMobile, isTablet } = useBreakpoint();
  const { height } = useScreenSize();

  // Auto-hide security dashboard on mobile when screen is too small
  useEffect(() => {
    if (isMobile && height < 600) {
      setShowSecurityDashboard(false);
    }
  }, [isMobile, height]);

  const getNavItemDisabled = (itemId: ViewMode): boolean => {
    if (!isAuthenticated || !userType) return false;

    // Admin users cannot access clinic portal
    if (userType === 'admin' && itemId === 'clinic-portal') return true;
    // Clinic users cannot access admin portal
    if (userType === 'clinic' && itemId === 'admin-access') return true;

    return false;
  };

  const navItems = [
    {
      id: 'card-lookup' as ViewMode,
      label: 'Card Lookup',
      icon: Search,
      description: 'Verify card validity',
      disabled: false, // Always accessible
    },
    {
      id: 'enhanced-lookup' as ViewMode,
      label: 'Enhanced Lookup',
      icon: Search,
      description: 'Advanced card search',
      disabled: false, // Always accessible
    },
    {
      id: 'clinic-portal' as ViewMode,
      label: 'Clinic Portal',
      icon: Stethoscope,
      description: 'Clinic management',
      disabled: getNavItemDisabled('clinic-portal'),
    },
    {
      id: 'admin-access' as ViewMode,
      label: 'Admin Access',
      icon: Shield,
      description: 'System administration',
      disabled: getNavItemDisabled('admin-access'),
    },
  ];

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Mobile Navigation */}
        <MobileNavigation
          currentView={currentView}
          onViewChange={onViewChange}
          onSecurityToggle={() => setShowSecurityDashboard(!showSecurityDashboard)}
          showSecurityDashboard={showSecurityDashboard}
          navItems={navItems}
        />

        {/* Main Content with proper spacing for mobile header */}
        <div className="pt-20 px-4 pb-4">
          <div className="max-w-full mx-auto">
            {children}
          </div>
        </div>

        {/* Mobile Security Dashboard */}
        {showSecurityDashboard && (
          <div className="fixed inset-x-4 top-24 z-40 animate-slide-in-down">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-h-[70vh] overflow-y-auto">
              <div className="p-3 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Security Monitor</h3>
                  <button
                    onClick={() => setShowSecurityDashboard(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-4">
                <SecurityDashboard compact={true} />
              </div>
            </div>
          </div>
        )}

        {/* PWA Installation Prompt */}
        <PWAInstallPrompt />
      </div>
    );
  }

  // Tablet Layout
  if (isTablet) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Tablet Header */}
        <div className="bg-[#1A535C] text-white shadow-lg">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">MC</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MOCARDS CLOUD</h1>
              </div>
            </div>

            {/* Security Toggle */}
            <button
              onClick={() => setShowSecurityDashboard(!showSecurityDashboard)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                showSecurityDashboard
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white bg-opacity-20 text-teal-100 hover:bg-opacity-30'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Security</span>
            </button>
          </div>

          {/* Tablet Navigation */}
          <div className="px-6 pb-4">
            <div className="flex space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const isDisabled = item.disabled;

                return (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && onViewChange(item.id)}
                    disabled={isDisabled}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                      isDisabled
                        ? 'bg-gray-400 bg-opacity-20 text-gray-500 cursor-not-allowed opacity-50'
                        : isActive
                          ? 'bg-white text-[#1A535C] shadow-lg'
                          : 'bg-white bg-opacity-10 text-teal-100 hover:bg-opacity-20'
                    }`}
                    title={isDisabled ? 'Please logout to access this portal' : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {isDisabled && <span className="text-xs">🔒</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tablet Content */}
        <div className="flex-1 bg-gray-50 relative">
          <div className="p-6">
            {children}
          </div>

          {/* Tablet Security Dashboard */}
          {showSecurityDashboard && (
            <div className="fixed bottom-4 right-4 z-50 w-80 animate-slide-in-right">
              <SecurityDashboard />
            </div>
          )}

          {/* PWA Installation Prompt */}
          <PWAInstallPrompt />
        </div>
      </div>
    );
  }

  // Desktop Layout (Original)
  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <div className="w-64 bg-[#1A535C] text-white flex flex-col fixed h-full z-10">
        {/* Header */}
        <div className="p-6 border-b border-teal-600">
          <h1 className="text-xl font-bold text-white">MOCARDS CLOUD</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isDisabled = item.disabled;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => !isDisabled && onViewChange(item.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isDisabled
                        ? 'bg-gray-600 bg-opacity-20 text-gray-400 cursor-not-allowed opacity-60'
                        : isActive
                          ? 'bg-white text-[#1A535C] shadow-lg'
                          : 'text-teal-100 hover:bg-teal-600 hover:text-white'
                    }`}
                    title={isDisabled ? 'Please logout to access this portal' : undefined}
                  >
                    <Icon className={`h-5 w-5 ${
                      isDisabled ? 'text-gray-400' : isActive ? 'text-[#1A535C]' : ''
                    }`} />
                    <div className="text-left flex-1">
                      <div className={`font-medium ${
                        isDisabled ? 'text-gray-400' : isActive ? 'text-[#1A535C]' : ''
                      }`}>
                        {item.label}
                        {isDisabled && <span className="ml-2">🔒</span>}
                      </div>
                      <div className={`text-xs ${
                        isDisabled ? 'text-gray-500' : isActive ? 'text-teal-600' : 'text-teal-300'
                      }`}>
                        {isDisabled ? 'Logout required' : item.description}
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
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 ${
              showSecurityDashboard
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-teal-100 hover:bg-teal-600 hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Security Monitor</span>
          </button>

          {/* Cloud Sync Status */}
          <div className="mt-4">
            <CloudSyncIndicator compact={true} className="w-full" />
          </div>

          <div className="text-xs text-teal-300 text-center mt-3">
            MOCARDS v4.0 Cloud
            <br />
            © 2025 Dental Group
          </div>
        </div>
      </div>

      {/* Desktop Main Content */}
      <div className="flex-1 ml-64 bg-gray-50 min-h-screen">
        {children}
      </div>

      {/* Desktop Security Dashboard */}
      {showSecurityDashboard && (
        <div className="fixed bottom-4 right-4 z-50 w-96 animate-slide-in-right">
          <SecurityDashboard />
        </div>
      )}

      {/* PWA Installation Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}

export default ResponsiveLayout;