import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isSupported: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  isStandalone: boolean;
  platform: string;
}

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaState, setPwaState] = useState<PWAState>({
    isSupported: false,
    isInstalled: false,
    canInstall: false,
    isStandalone: false,
    platform: 'unknown'
  });

  // Detect PWA support and installation status
  useEffect(() => {
    const updatePWAState = () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');

      const platform = getPlatform();
      const isInstalled = isStandalone || isRunningInApp();

      setPwaState({
        isSupported,
        isInstalled,
        canInstall: deferredPrompt !== null,
        isStandalone,
        platform
      });
    };

    updatePWAState();

    // Listen for display mode changes
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    displayModeQuery.addListener(updatePWAState);

    return () => displayModeQuery.removeListener(updatePWAState);
  }, [deferredPrompt]);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setDeferredPrompt(null);
      setPwaState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if (pwaState.isSupported && process.env.NODE_ENV === 'production') {
      registerServiceWorker();
    }
  }, [pwaState.isSupported]);

  const installApp = useCallback(async (): Promise<{
    success: boolean;
    outcome?: 'accepted' | 'dismissed';
    error?: string;
  }> => {
    if (!deferredPrompt) {
      return {
        success: false,
        error: 'Installation prompt not available'
      };
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      console.log('[PWA] User choice:', choiceResult.outcome);

      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        return {
          success: true,
          outcome: 'accepted'
        };
      } else {
        return {
          success: false,
          outcome: 'dismissed'
        };
      }
    } catch (error) {
      console.error('[PWA] Installation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed'
      };
    }
  }, [deferredPrompt]);

  const shareApp = useCallback(async (data?: {
    title?: string;
    text?: string;
    url?: string;
  }): Promise<boolean> => {
    const shareData = {
      title: 'MOCARDS Cloud - Healthcare Management Platform',
      text: 'Professional healthcare card management and clinic portal system',
      url: window.location.origin,
      ...data
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[PWA] Share failed:', error);
        }
        return false;
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        return true;
      } catch (error) {
        console.error('[PWA] Clipboard write failed:', error);
        return false;
      }
    }
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('[PWA] This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[PWA] Notification permission request failed:', error);
      return false;
    }
  }, []);

  const getInstallInstructions = useCallback((): {
    platform: string;
    steps: string[];
  } => {
    const platform = getPlatform();

    const instructions: Record<string, string[]> = {
      ios: [
        'Tap the Share button in Safari',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to install the app'
      ],
      android: [
        'Tap the menu button (⋮) in Chrome',
        'Select "Add to Home screen"',
        'Tap "Add" to install the app'
      ],
      desktop: [
        'Click the install button in your browser\'s address bar',
        'Or use Ctrl+Shift+A (Cmd+Shift+A on Mac)',
        'Click "Install" when prompted'
      ]
    };

    return {
      platform,
      steps: instructions[platform] || instructions.desktop
    };
  }, []);

  return {
    ...pwaState,
    installApp,
    shareApp,
    requestNotificationPermission,
    getInstallInstructions,
    canShare: 'share' in navigator || 'clipboard' in navigator
  };
};

// Helper functions
function getPlatform(): string {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  } else if (/android/.test(userAgent)) {
    return 'android';
  } else if (/windows/.test(userAgent)) {
    return 'windows';
  } else if (/mac/.test(userAgent)) {
    return 'mac';
  } else {
    return 'desktop';
  }
}

function isRunningInApp(): boolean {
  // Check for various app environments
  return (
    // iOS Safari in standalone mode
    (window.navigator as any).standalone ||
    // Android TWA or installed PWA
    window.matchMedia('(display-mode: standalone)').matches ||
    // Cordova/PhoneGap
    !!(window as any).cordova ||
    // Capacitor
    !!(window as any).Capacitor ||
    // Electron
    !!(window as any).require
  );
}

async function registerServiceWorker(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[PWA] Service Worker registered:', registration);

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New service worker available');
            // Optionally notify user about update
          }
        });
      }
    });

    return true;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return false;
  }
}

// Notification helper
export const showNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<Notification | null> => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(title, {
      badge: '/icons/badge-72x72.png',
      icon: '/icons/icon-192x192.png',
      ...options
    });

    return null;
  } else if ('Notification' in window && Notification.permission === 'granted') {
    return new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      ...options
    });
  }

  return null;
};