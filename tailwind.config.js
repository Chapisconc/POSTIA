/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand:  { DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)', light: 'rgb(var(--c-brandLight) / <alpha-value>)', dark: 'rgb(var(--c-brandDark) / <alpha-value>)', soft: 'rgb(var(--c-brandSoft) / <alpha-value>)' },
        night:  { DEFAULT: 'rgb(var(--c-night) / <alpha-value>)', light: 'rgb(var(--c-nightLight) / <alpha-value>)', lighter: 'rgb(var(--c-nightLighter) / <alpha-value>)' },
        gold:   { DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)', dark: 'rgb(var(--c-goldDark) / <alpha-value>)', soft: 'rgb(var(--c-goldSoft) / <alpha-value>)' },
        danger: { DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)', dark: 'rgb(var(--c-dangerDark) / <alpha-value>)', soft: 'rgb(var(--c-dangerSoft) / <alpha-value>)' },
        success: { DEFAULT: 'rgb(var(--c-success) / <alpha-value>)', dark: 'rgb(var(--c-successDark) / <alpha-value>)', soft: 'rgb(var(--c-successSoft) / <alpha-value>)' },
        warning: { DEFAULT: 'rgb(var(--c-warning) / <alpha-value>)', dark: 'rgb(var(--c-warningDark) / <alpha-value>)', soft: 'rgb(var(--c-warningSoft) / <alpha-value>)' },
        info:   { DEFAULT: 'rgb(var(--c-info) / <alpha-value>)', dark: 'rgb(var(--c-infoDark) / <alpha-value>)', soft: 'rgb(var(--c-infoSoft) / <alpha-value>)' },
        page:   'rgb(var(--c-page) / <alpha-value>)',
        card:   'rgb(var(--c-card) / <alpha-value>)',
        muted:  'rgb(var(--c-muted) / <alpha-value>)',
        line:   'rgb(var(--c-line) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        full: '9999px',
      },
      boxShadow: {
        sm: 'var(--shadow-card)',
        DEFAULT: 'var(--shadow-float)',
        md: 'var(--shadow-float)',
        lg: 'var(--shadow-pop)',
        xl: 'var(--shadow-pop)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      keyframes: {
        'flash': {
          '0%':   { backgroundColor: '#DCFCE7' },
          '100%': { backgroundColor: 'transparent' },
        },
        'pop': {
          '0%':   { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'flash': 'flash 0.8s ease-out',
        'pop': 'pop 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
