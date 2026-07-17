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
        stone: {
          50: '#f4f4f2',
          100: '#eaeae6',
          200: '#d6d6cf',
          300: '#b8b8ae',
          400: '#96968c',
          500: '#7a7a70',
        },
        signal: {
          50: '#fff4f0',
          100: '#ffe4db',
          200: '#ffc4b0',
          300: '#ff9a78',
          400: '#ff6840',
          500: '#e23d12',
          600: '#c4310d',
          700: '#a22910',
          800: '#852514',
          900: '#6e2214',
        },
        flow: {
          50: '#eef7f6',
          100: '#d5ebe8',
          200: '#aad7d1',
          300: '#78bbb4',
          400: '#4a958f',
          500: '#2f766f',
          600: '#245e59',
          700: '#1f4c49',
          800: '#1a3d3b',
          900: '#163331',
        },
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
          950: '#101114',
        },
        accent: {
          50: '#fff4f0',
          100: '#ffe4db',
          200: '#ffc4b0',
          300: '#ff9a78',
          400: '#ff6840',
          500: '#e23d12',
          600: '#c4310d',
          700: '#a22910',
          800: '#852514',
          900: '#6e2214',
          950: '#3b1008',
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
          50: '#fff4f0',
          100: '#ffe4db',
          500: '#e23d12',
          600: '#c4310d',
          700: '#a22910',
          800: '#852514',
          900: '#6e2214',
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
          'radial-gradient(circle at 18% 20%, rgba(226,61,18,0.12), transparent 42%), radial-gradient(circle at 82% 8%, rgba(47,118,111,0.14), transparent 38%), radial-gradient(circle at 50% 100%, rgba(226,61,18,0.08), transparent 40%)',
      },
      boxShadow: {
        glow: '0 12px 40px -16px rgba(226,61,18,0.35)',
        'glow-gold': '0 12px 40px -16px rgba(249,152,7,0.35)',
        card: '0 10px 30px -18px rgba(16,17,20,0.35)',
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
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};

export default config;
