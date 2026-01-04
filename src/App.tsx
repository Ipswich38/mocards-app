import { useState, Suspense, lazy, useEffect } from 'react';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CreditCard, Search, Zap, ExternalLink } from 'lucide-react';

// Lazy load core components
const PureCardLookup = lazy(() => import('./components/PureCardLookup').then(module => ({ default: module.PureCardLookup })));
const PureCardGenerator = lazy(() => import('./components/PureCardGenerator').then(module => ({ default: module.PureCardGenerator })));
const ExternalAppConnector = lazy(() => import('./components/ExternalAppConnector').then(module => ({ default: module.ExternalAppConnector })));

type AppMode = 'lookup' | 'generator' | 'connector';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('lookup');

  // Simple app initialization
  useEffect(() => {
    console.log('🎯 MOCARDS - Pure Card System', {
      timestamp: new Date().toISOString(),
      version: '3.0.0-pure',
      features: ['card-lookup', 'card-generator', 'external-connector']
    });
  }, []);

  const renderCurrentMode = () => {
    switch (currentMode) {
      case 'lookup':
        return <PureCardLookup />;
      case 'generator':
        return <PureCardGenerator />;
      case 'connector':
        return <ExternalAppConnector />;
      default:
        return <PureCardLookup />;
    }
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Navigation Header */}
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">MOCARDS</h1>
                    <p className="text-xs text-gray-600">Pure Card System</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentMode('lookup')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      currentMode === 'lookup'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Search className="h-4 w-4" />
                    <span>Lookup</span>
                  </button>
                  <button
                    onClick={() => setCurrentMode('generator')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      currentMode === 'generator'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                    <span>Generate</span>
                  </button>
                  <button
                    onClick={() => setCurrentMode('connector')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      currentMode === 'connector'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Connect</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading...</h2>
                  <p className="text-gray-600">Please wait while we load the component.</p>
                </div>
              </div>
            }>
              {renderCurrentMode()}
            </Suspense>
          </div>
        </div>
        <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  );
}