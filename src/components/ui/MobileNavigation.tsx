import React, { useState } from 'react';
import {
  Search, Stethoscope, Shield, Activity, Menu, X,
  ChevronRight, Home
} from 'lucide-react';
import { ViewMode } from '../layout/MainLayout';

interface MobileNavigationProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onSecurityToggle: () => void;
  showSecurityDashboard: boolean;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView,
  onViewChange,
  onSecurityToggle,
  showSecurityDashboard
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    {
      id: 'card-lookup' as ViewMode,
      label: 'Card Lookup',
      icon: Search,
      description: 'Verify card validity',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'clinic-portal' as ViewMode,
      label: 'Clinic Portal',
      icon: Stethoscope,
      description: 'Clinic management',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'admin-access' as ViewMode,
      label: 'Admin Access',
      icon: Shield,
      description: 'System administration',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
  ];

  const handleNavClick = (viewId: ViewMode) => {
    onViewChange(viewId);
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden bg-white shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#1A535C] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MC</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">MOCARDS</h1>
              <p className="text-xs text-gray-500 -mt-1">Healthcare Platform</p>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {/* Security Monitor Toggle */}
            <button
              onClick={onSecurityToggle}
              className={`p-2 rounded-lg transition-colors ${
                showSecurityDashboard
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Activity className="h-4 w-4" />
            </button>

            {/* Menu Toggle */}
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Current View Indicator */}
        <div className="px-4 pb-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-[#1A535C] rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">
              {navItems.find(item => item.id === currentView)?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      <div className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}>
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={() => setIsOpen(false)}
        />

        {/* Menu Panel */}
        <div className={`absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {/* Menu Header */}
          <div className="p-6 bg-[#1A535C] text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">MOCARDS CLOUD</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[#1A535C] text-white shadow-lg'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-white bg-opacity-20' : item.bgColor}`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : item.color}`} />
                  </div>

                  <div className="flex-1 text-left">
                    <div className={`font-medium ${isActive ? 'text-white' : 'text-gray-900'}`}>
                      {item.label}
                    </div>
                    <div className={`text-sm ${isActive ? 'text-teal-200' : 'text-gray-500'}`}>
                      {item.description}
                    </div>
                  </div>

                  <ChevronRight className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                </button>
              );
            })}
          </div>

          {/* Security Section */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                onSecurityToggle();
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
                showSecurityDashboard
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-blue-50 text-gray-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${
                showSecurityDashboard ? 'bg-white bg-opacity-20' : 'bg-blue-50'
              }`}>
                <Activity className={`h-5 w-5 ${
                  showSecurityDashboard ? 'text-white' : 'text-blue-600'
                }`} />
              </div>

              <div className="flex-1 text-left">
                <div className={`font-medium ${showSecurityDashboard ? 'text-white' : 'text-gray-900'}`}>
                  Security Monitor
                </div>
                <div className={`text-sm ${showSecurityDashboard ? 'text-blue-200' : 'text-gray-500'}`}>
                  Live security dashboard
                </div>
              </div>

              {showSecurityDashboard && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-center">
              <p className="text-xs text-gray-500">MOCARDS v4.0</p>
              <p className="text-xs text-gray-400">© 2025 Dental Group</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Small Screens */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="grid grid-cols-4 py-2">
          {/* Home/Current View */}
          <button className="flex flex-col items-center py-2 text-[#1A535C]">
            <Home className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </button>

          {/* Navigation Items */}
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center py-2 ${
                  isActive ? 'text-[#1A535C]' : 'text-gray-400'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}

          {/* Menu */}
          <button
            onClick={toggleMenu}
            className="flex flex-col items-center py-2 text-gray-600"
          >
            <Menu className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Menu</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;