import React, { useState, useEffect } from 'react';
import {
  Download, Share, X, Smartphone, Monitor,
  Check, AlertCircle, ExternalLink
} from 'lucide-react';
import { usePWA, showNotification } from '../../hooks/usePWA';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastError, toastInfo } from '../../lib/toast';

interface PWAInstallPromptProps {
  showPrompt?: boolean;
  onDismiss?: () => void;
  compact?: boolean;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  showPrompt = true,
  onDismiss,
  compact = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const {
    isSupported,
    isInstalled,
    canInstall,
    platform,
    installApp,
    shareApp,
    requestNotificationPermission,
    getInstallInstructions,
    canShare
  } = usePWA();

  const { addToast } = useToast();

  useEffect(() => {
    // Show prompt if supported, not installed, and can install
    setIsVisible(
      showPrompt &&
      isSupported &&
      !isInstalled &&
      canInstall &&
      !localStorage.getItem('pwa-prompt-dismissed')
    );
  }, [showPrompt, isSupported, isInstalled, canInstall]);

  const handleInstall = async () => {
    setIsInstalling(true);

    try {
      const result = await installApp();

      if (result.success) {
        addToast(toastSuccess(
          'App Installed Successfully!',
          'MOCARDS is now available on your home screen',
          {
            label: 'Open App',
            onClick: () => window.location.reload()
          }
        ));

        setIsVisible(false);

        // Request notification permission after install
        setTimeout(async () => {
          const notificationGranted = await requestNotificationPermission();
          if (notificationGranted) {
            showNotification('Welcome to MOCARDS!', {
              body: 'You\'ll receive important updates and notifications here.',
              tag: 'welcome'
            });
          }
        }, 2000);
      } else if (result.outcome === 'dismissed') {
        addToast(toastInfo(
          'Installation Cancelled',
          'You can install MOCARDS anytime from your browser menu'
        ));
      } else {
        throw new Error(result.error || 'Installation failed');
      }
    } catch (error) {
      addToast(toastError(
        'Installation Failed',
        error instanceof Error ? error.message : 'Please try again'
      ));
    } finally {
      setIsInstalling(false);
    }
  };

  const handleShare = async () => {
    try {
      const success = await shareApp();

      if (success) {
        addToast(toastSuccess(
          'Shared Successfully!',
          'MOCARDS link has been shared'
        ));
      } else {
        addToast(toastInfo(
          'Link Copied',
          'MOCARDS link copied to clipboard'
        ));
      }
    } catch (error) {
      addToast(toastError(
        'Share Failed',
        'Unable to share the app'
      ));
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    onDismiss?.();
  };

  const handleShowInstructions = () => {
    setShowInstructions(true);
  };

  const instructions = getInstallInstructions();

  if (!isVisible && !compact) {
    return null;
  }

  // Compact version for settings or info pages
  if (compact) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              Install MOCARDS App
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Get faster access and offline capabilities
            </p>

            <div className="flex items-center space-x-2 mt-3">
              {canInstall ? (
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {isInstalling ? 'Installing...' : 'Install'}
                </button>
              ) : (
                <button
                  onClick={handleShowInstructions}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-200"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  How to Install
                </button>
              )}

              {canShare && (
                <button
                  onClick={handleShare}
                  className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200"
                >
                  <Share className="h-3 w-3 mr-1" />
                  Share
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full installation prompt modal
  return (
    <>
      {/* Installation Prompt */}
      {isVisible && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-in-right">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Smartphone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Install MOCARDS
                  </h3>
                  <p className="text-sm text-gray-600">
                    For better performance & offline access
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Features */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Faster loading and performance
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Offline access to core features
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Push notifications for updates
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Home screen shortcut
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isInstalling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Install App
                  </>
                )}
              </button>

              <button
                onClick={handleShowInstructions}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </button>

              {canShare && (
                <button
                  onClick={handleShare}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Share className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Installation Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Monitor className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    How to Install
                  </h3>
                </div>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-900">
                    Platform: {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </span>
                </div>

                <ol className="space-y-3">
                  {instructions.steps.map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 text-sm font-medium rounded-full flex items-center justify-center mr-3">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm text-amber-800">
                      <span className="font-medium">Note:</span> Installation steps may vary
                      depending on your browser and operating system.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;