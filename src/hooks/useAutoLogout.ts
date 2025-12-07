import { useEffect, useRef, useCallback } from 'react';

interface UseAutoLogoutOptions {
  onLogout: () => void;
  timeout?: number; // in milliseconds, default 30 minutes
  warningTime?: number; // in milliseconds, default 5 minutes before timeout
  onWarning?: () => void;
}

export function useAutoLogout({
  onLogout,
  timeout = 30 * 60 * 1000, // 30 minutes
  warningTime = 5 * 60 * 1000, // 5 minutes
  onWarning
}: UseAutoLogoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    // Set warning timer
    if (onWarning) {
      warningRef.current = setTimeout(() => {
        onWarning();
      }, timeout - warningTime);
    }

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      onLogout();
    }, timeout);
  }, [onLogout, timeout, warningTime, onWarning]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }
  }, []);

  useEffect(() => {
    // Events that should reset the timer
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const resetTimerHandler = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimerHandler, true);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimerHandler, true);
      });
      clearTimers();
    };
  }, [resetTimer, clearTimers]);

  return {
    resetTimer,
    clearTimers
  };
}