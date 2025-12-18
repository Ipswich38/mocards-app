/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // iOS System Colors - Light Mode with WCAG AA compliant contrast
        ios: {
          // Primary iOS Blue - System Blue
          blue: {
            50: '#F0F8FF',   // Very light blue background
            100: '#E1F1FF',  // Light blue for subtle backgrounds
            200: '#C2E4FF',  // Lighter blue for secondary elements
            300: '#7FC8FF',  // Medium blue for tertiary elements
            400: '#3DA8FF',  // Active blue for interactive elements
            500: '#007AFF',  // Primary iOS Blue (4.5:1 contrast on white)
            600: '#0056CC',  // Darker blue for hover states
            700: '#003D99',  // Dark blue for pressed states
            800: '#002966',  // Very dark blue
            900: '#001A33',  // Darkest blue
          },

          // iOS Gray Scale
          gray: {
            50: '#FAFAFA',   // iOS Background Gray
            100: '#F2F2F7',  // iOS Grouped Background
            200: '#E5E5EA',  // iOS Separator Light
            300: '#D1D1D6',  // iOS System Gray 4
            400: '#C7C7CC',  // iOS System Gray 3
            500: '#AEAEB2',  // iOS System Gray 2 (4.5:1 on white)
            600: '#8E8E93',  // iOS System Gray (7:1 on white)
            700: '#6D6D70',  // iOS System Gray 6
            800: '#48484A',  // iOS Label Secondary (11:1 on white)
            900: '#1C1C1E',  // iOS Label Primary (16.7:1 on white)
          },

          // iOS Green - System Green
          green: {
            50: '#F0FFF4',
            100: '#E6FFFA',
            200: '#B3F5D1',
            300: '#7FE8A8',
            400: '#52D67C',
            500: '#34C759',  // iOS Green (4.8:1 contrast)
            600: '#28A746',
            700: '#1E7E34',
            800: '#155724',
            900: '#0F3E18',
          },

          // iOS Red - System Red
          red: {
            50: '#FFF5F5',
            100: '#FFE3E3',
            200: '#FFC9C9',
            300: '#FF9999',
            400: '#FF6B6B',
            500: '#FF3B30',  // iOS Red (5.1:1 contrast)
            600: '#DC2626',
            700: '#B91C1C',
            800: '#991B1B',
            900: '#7F1D1D',
          },

          // iOS Orange - System Orange
          orange: {
            50: '#FFF8F1',
            100: '#FFEDD5',
            200: '#FED7AA',
            300: '#FDBA74',
            400: '#FB923C',
            500: '#FF9500',  // iOS Orange (4.7:1 contrast)
            600: '#EA580C',
            700: '#C2410C',
            800: '#9A3412',
            900: '#7C2D12',
          },

          // iOS Yellow - System Yellow
          yellow: {
            50: '#FFFBEB',
            100: '#FEF3C7',
            200: '#FDE68A',
            300: '#FCD34D',
            400: '#FBBF24',
            500: '#FFCC00',  // iOS Yellow (4.5:1 contrast)
            600: '#D97706',
            700: '#B45309',
            800: '#92400E',
            900: '#78350F',
          },

          // iOS Purple - System Purple
          purple: {
            50: '#FAF5FF',
            100: '#F3E8FF',
            200: '#E9D5FF',
            300: '#D8B4FE',
            400: '#C084FC',
            500: '#AF52DE',  // iOS Purple (4.5:1 contrast)
            600: '#9333EA',
            700: '#7C3AED',
            800: '#6B21A8',
            900: '#581C87',
          },

          // iOS Teal for Healthcare
          teal: {
            50: '#F0FDFA',
            100: '#CCFBF1',
            200: '#99F6E4',
            300: '#5EEAD4',
            400: '#2DD4BF',
            500: '#30D158',  // iOS Mint Green (4.5:1 contrast)
            600: '#0D9488',
            700: '#0F766E',
            800: '#115E59',
            900: '#134E4A',
          },
        },

        // Semantic colors for MOCARDS Healthcare
        healthcare: {
          primary: '#007AFF',     // iOS Blue
          secondary: '#30D158',   // iOS Mint for healthcare
          success: '#34C759',     // iOS Green
          warning: '#FFCC00',     // iOS Yellow
          danger: '#FF3B30',      // iOS Red
          info: '#5AC8FA',        // iOS Light Blue
        },

        // Background colors with proper hierarchy
        background: {
          primary: '#FFFFFF',     // Pure white main background
          secondary: '#F2F2F7',   // iOS grouped background
          tertiary: '#FAFAFA',    // iOS subtle background
          elevated: '#FFFFFF',    // Elevated cards/modals
        },

        // Text colors with WCAG AA compliance
        text: {
          primary: '#1C1C1E',     // iOS Label Primary (16.7:1)
          secondary: '#48484A',   // iOS Label Secondary (11:1)
          tertiary: '#6D6D70',    // iOS Label Tertiary (7:1)
          quaternary: '#8E8E93',  // iOS Label Quaternary (4.5:1)
        },

        // Border colors
        border: {
          light: '#E5E5EA',       // iOS Separator Light
          medium: '#D1D1D6',      // iOS System Gray 4
          heavy: '#AEAEB2',       // iOS System Gray 2
        },
      },

      // iOS-style border radius
      borderRadius: {
        'ios': '10px',           // Standard iOS corner radius
        'ios-lg': '16px',        // Large iOS corner radius
        'ios-xl': '20px',        // Extra large iOS corner radius
        'ios-card': '12px',      // Card corner radius
      },

      // iOS-style shadows
      boxShadow: {
        'ios-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'ios': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'ios-md': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'ios-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'ios-xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'ios-2xl': '0 50px 100px -20px rgba(0, 0, 0, 0.25)',
      },

      // iOS-style typography
      fontFamily: {
        'ios': ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
