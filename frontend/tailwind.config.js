/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Keep brand alias pointing to opex for backwards compat
        brand: {
          50:  '#eef3ff',
          100: '#dae3fe',
          200: '#bccbfc',
          500: '#4b60eb',
          600: '#3547d5',
          700: '#2c3bb8',
          900: '#0f2560',
          950: '#080f2e',
        },
        // OPEX Orange — brand accent, KPI highlights, CTAs
        accent: {
          50:  '#fff7ed',
          100: '#ffeed4',
          200: '#fed9a8',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea6500',
          700: '#c2510a',
        },
        // Semantic surface tokens
        surface: {
          DEFAULT: '#f8fafc',
          card:    '#ffffff',
          border:  '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10)',
      },
    },
  },
  plugins: [],
}
