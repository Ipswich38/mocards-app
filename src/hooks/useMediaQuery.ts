import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(listener);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
};

// Predefined breakpoints following Tailwind CSS conventions
export const useBreakpoint = () => {
  const isMobile = useMediaQuery('(max-width: 640px)'); // sm
  const isTablet = useMediaQuery('(max-width: 1024px)'); // lg
  const isDesktop = useMediaQuery('(min-width: 1024px)'); // lg+
  const isLargeDesktop = useMediaQuery('(min-width: 1280px)'); // xl+

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    // Helper functions
    isMobileOrTablet: isMobile || isTablet,
    isDesktopOrLarger: isDesktop,
  };
};

// Screen size detection for specific optimizations
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    ...screenSize,
    // Device orientation
    isLandscape: screenSize.width > screenSize.height,
    isPortrait: screenSize.height > screenSize.width,

    // Common device sizes
    isSmallMobile: screenSize.width < 375,
    isMobile: screenSize.width < 640,
    isTablet: screenSize.width >= 640 && screenSize.width < 1024,
    isDesktop: screenSize.width >= 1024,

    // Screen density helpers
    isHighDensity: typeof window !== 'undefined' ? window.devicePixelRatio > 1.5 : false,
  };
};

// Touch device detection
export const useTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - for older browsers
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouchDevice;
};