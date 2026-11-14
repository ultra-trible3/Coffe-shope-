/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem' },
    extend: {
      fontFamily: {
        // Offline-first: locally installed fonts only.
        sans: [
          'Segoe UI',
          'Tahoma',
          'Noto Sans Arabic',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: [
          'Georgia',
          'Iowan Old Style',
          'Palatino Linotype',
          'Book Antiqua',
          'Times New Roman',
          'serif',
        ],
        mono: ['Consolas', 'Courier New', 'monospace'],
      },
      fontSize: {
        // Slightly larger working scale for counter and back-office screens.
        xs: ['0.8125rem', { lineHeight: '1.125rem' }],
        sm: ['0.9375rem', { lineHeight: '1.375rem' }],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
          active: 'hsl(var(--sidebar-active))',
        },
        brand: {
          coffee: 'hsl(var(--brand-coffee))',
          caramel: 'hsl(var(--brand-caramel))',
          cream: 'hsl(var(--brand-cream))',
          red: 'hsl(var(--brand-red))',
          orange: 'hsl(var(--brand-orange))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
      },
      boxShadow: {
        card: '0 1px 2px rgb(31 23 17 / 0.05), 0 8px 24px -16px rgb(31 23 17 / 0.18)',
        pop: '0 12px 40px -12px rgb(31 23 17 / 0.28)',
        soft: '0 18px 50px -28px rgb(43 28 18 / 0.35)',
        lift: '0 30px 70px -34px rgb(43 28 18 / 0.5)',
      },
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.82)' },
          '60%': { opacity: '1', transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'toast-progress': {
          from: { transform: 'scaleX(1)' },
          to: { transform: 'scaleX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        reveal: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'steam-rise': {
          '0%': { opacity: '0', transform: 'translateY(6px) scaleX(0.9)' },
          '30%': { opacity: '0.55' },
          '100%': { opacity: '0', transform: 'translateY(-18px) scaleX(1.15)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.18s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.22s ease-out',
        'pop-in': 'pop-in 0.38s cubic-bezier(0.22, 0.9, 0.3, 1.1)',
        'toast-progress': 'toast-progress 6s linear forwards',
        float: 'float 7s ease-in-out infinite',
        reveal: 'reveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'steam-rise': 'steam-rise 3.4s ease-out infinite',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('rtl', '&:where([dir="rtl"], [dir="rtl"] *)');
      addVariant('ltr', '&:where([dir="ltr"], [dir="ltr"] *)');
    },
  ],
};
