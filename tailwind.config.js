/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Noto Sans"', 'sans-serif'],
      },
      colors: {
        // Brand
        'brand-primary': '#4F46E5',
        'brand-secondary': '#7C3AED',
        'accent': '#7C3AED',
        'accent-muted': '#EDE9FE',

        // Backgrounds
        'bg-page': '#F6F8FB',
        'bg-card': '#FFFFFF',
        'bg-hover': '#F1F5F9',
        'bg-toolbar': '#FFFFFF',
        'bg-editor': '#FCFCFD',

        // Text
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        'text-muted': '#8795A6',

        // Border
        'border-default': '#E2E8F0',

        // Functional
        'functional-success': '#16A34A',
        'functional-danger': '#DC2626',
        'functional-warning': '#F59E0B',
      },
      fontSize: {
        'heading-1': ['24px', { fontWeight: '700' }],
        'heading-2': ['14px', { fontWeight: '700', letterSpacing: '0.05em' }],
        'heading-3': ['12px', { fontWeight: '600' }],
        'body': ['10px', { fontWeight: '400' }],
        'caption': ['9px', { fontWeight: '400' }],
        'small': ['8px', { fontWeight: '400' }],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
      },
    },
  },
  plugins: [],
}
