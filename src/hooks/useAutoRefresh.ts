import { useEffect, useRef } from 'react';
import { useToast } from './useToast';
import { toastSuccess, toastWarning } from '../lib/toast';

interface AutoRefreshOptions {
  enabled?: boolean;
  checkInterval?: number; // in milliseconds
  showNotifications?: boolean;
}

export const useAutoRefresh = (options: AutoRefreshOptions = {}) => {
  const {
    enabled = true,
    checkInterval = 30000, // 30 seconds
    showNotifications = true
  } = options;

  const { addToast } = useToast();
  const initialBuildHash = useRef<string | null>(null);
  const isCheckingRef = useRef(false);

  // Get build hash from index.html or a version endpoint
  const getBuildHash = async (): Promise<string | null> => {
    try {
      // In development, we can check the Vite dev server status
      if (import.meta.env.DEV) {
        // For development, we'll use a timestamp approach
        const response = await fetch('/', {
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const html = await response.text();

        // Extract any script tags or version info
        const scriptMatch = html.match(/<script[^>]*src="([^"]*)"[^>]*>/);
        return scriptMatch ? scriptMatch[1] : Date.now().toString();
      } else {
        // For production, check the built files
        const response = await fetch('/index.html', {
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const html = await response.text();

        // Extract script src or meta version tag
        const scriptMatch = html.match(/<script[^>]*src="[^"]*assets[^"]*\.js"[^>]*>/);
        const metaMatch = html.match(/<meta name="version" content="([^"]*)">/);

        return metaMatch ? metaMatch[1] : (scriptMatch ? scriptMatch[0] : null);
      }
    } catch (error) {
      console.warn('Failed to check for app updates:', error);
      return null;
    }
  };

  // Check for updates
  const checkForUpdates = async () => {
    if (isCheckingRef.current || !enabled) return;

    isCheckingRef.current = true;

    try {
      const currentHash = await getBuildHash();

      if (currentHash && initialBuildHash.current) {
        if (currentHash !== initialBuildHash.current) {
          // App has been updated
          if (showNotifications) {
            addToast(toastWarning(
              'App Updated',
              'A new version is available. The page will refresh automatically.'
            ));
          }

          // Wait a moment for user to see the notification, then refresh
          setTimeout(() => {
            window.location.reload();
          }, 2000);

          return;
        }
      } else if (currentHash && !initialBuildHash.current) {
        // Store initial hash
        initialBuildHash.current = currentHash;
      }
    } catch (error) {
      console.warn('Update check failed:', error);
    } finally {
      isCheckingRef.current = false;
    }
  };

  // Initialize and set up interval
  useEffect(() => {
    if (!enabled) return;

    // Get initial build hash
    getBuildHash().then(hash => {
      initialBuildHash.current = hash;
    });

    // Set up periodic checking
    const interval = setInterval(checkForUpdates, checkInterval);

    // Also check when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Small delay to avoid immediate check when tab becomes active
        setTimeout(checkForUpdates, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check for updates when online status changes
    const handleOnline = () => {
      setTimeout(checkForUpdates, 1000);
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, checkInterval, showNotifications]);

  // Manual refresh function
  const forceRefresh = () => {
    if (showNotifications) {
      addToast(toastSuccess('Refreshing', 'Updating to the latest version...'));
    }
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return { forceRefresh, checkForUpdates };
};