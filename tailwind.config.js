module.exports = {
  content: ["./pages/*.{html,js}", "./index.html"],
  theme: {
    extend: {
      colors: {
        // Primary Colors - green palette
        primary: {
          DEFAULT: "#16a34a", // green-600
          light: "#22c55e", // green-500
          dark: "#15803d", // green-700
        },
        // Surface Colors - gray palette
        surface: {
          DEFAULT: "#f9fafb", // gray-50
          raised: "#ffffff", // white
          sunken: "#f3f4f6", // gray-100
        },
        // Neutral Colors - gray palette
        background: "#ffffff", // white
        border: "#e5e7eb", // gray-200
        text: {
          primary: "#111827", // gray-900
          secondary: "#4b5563", // gray-600
          tertiary: "#9ca3af", // gray-400
        },
        // Semantic Colors
        success: "#22c55e", // green-500
        warning: "#f59e0b", // amber-500
        error: "#ef4444", // red-500
        info: "#3b82f6", // blue-500
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
      },
      fontSize: {
        'display': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        '3xl': ['30px', { lineHeight: '1.2', fontWeight: '700' }],
        '2xl': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'xl': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'lg': ['18px', { lineHeight: '1.5', fontWeight: '500' }],
        'base': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'xs': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-in-out',
        'slide-up': 'slideUp 300ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      gridTemplateColumns: {
        'sidebar': '300px 1fr',
        'product-detail': '1fr 1fr',
      },
    },
  },
  plugins: [],
}