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
        'brand-primary': '#6750A4',
        'brand-secondary': '#7D5FD3',
        'accent': '#6750A4',
        'accent-muted': '#EFE7F8',

        // Backgrounds
        'bg-page': '#FAF9F7',
        'bg-card': '#FFFFFF',
        'bg-hover': '#F6F7FB',
        'bg-toolbar': '#FAF9F7',
        'bg-editor': '#FFFFFF',

        // Text
        'text-primary': '#1D1B20',
        'text-secondary': '#675F6B',
        'text-muted': '#79717D',

        // Border
        'border-default': '#D4D7DF',

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
