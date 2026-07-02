import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f6fb',
          100: '#e6eaf5',
          200: '#c7cfe6',
          300: '#9aa7cc',
          400: '#6c7aab',
          500: '#4b5787',
          600: '#37416a',
          700: '#282f52',
          800: '#181d38',
          900: '#0f1226',
          950: '#080a17',
        },
        accent: {
          50: '#eafcff',
          100: '#cef7ff',
          200: '#a3edff',
          300: '#66ddff',
          400: '#22c8f7',
          500: '#06aede',
          600: '#0089bb',
          700: '#046d97',
          800: '#0a597b',
          900: '#0d4a68',
          950: '#062f45',
        },
        gold: {
          50: '#fffaeb',
          100: '#fff0c6',
          200: '#ffe088',
          300: '#ffc94a',
          400: '#ffb420',
          500: '#f99807',
          600: '#dd7402',
          700: '#b75206',
          800: '#943f0c',
          900: '#7a350d',
        },
        primary: {
          50: '#eafcff',
          100: '#cef7ff',
          500: '#22c8f7',
          600: '#06aede',
          700: '#0089bb',
          800: '#046d97',
          900: '#0d4a68',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 20% 20%, rgba(34,200,247,0.18), transparent 45%), radial-gradient(circle at 80% 0%, rgba(249,152,7,0.14), transparent 40%), radial-gradient(circle at 50% 100%, rgba(34,200,247,0.10), transparent 40%)',
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(34,200,247,0.45)',
        'glow-gold': '0 0 40px -8px rgba(249,152,7,0.45)',
        card: '0 8px 30px -12px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
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
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
