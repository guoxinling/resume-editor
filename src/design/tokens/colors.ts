/**
 * Design Tokens — Colors
 * Resume Editor design system
 * Industry: Game / Internet · Style: Minimalist Professional (Linear × Notion)
 */

export const colors = {
  brand: {
    primary: '#4F46E5',
    secondary: '#7C3AED',
  },

  accent: '#7C3AED',
  accentMuted: '#EDE9FE',

  bg: {
    page: '#F6F8FB',
    card: '#FFFFFF',
    hover: '#F1F5F9',
    toolbar: '#FFFFFF',
    editor: '#FCFCFD',
  },

  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    muted: '#8795A6',
  },

  border: '#E2E8F0',

  functional: {
    success: '#16A34A',
    danger: '#DC2626',
    warning: '#F59E0B',
  },
} as const

/** Flattened alias for tailwind.config import */
export const colorValues = {
  'brand-primary': colors.brand.primary,
  'brand-secondary': colors.brand.secondary,
  'accent': colors.accent,
  'accent-muted': colors.accentMuted,

  'bg-page': colors.bg.page,
  'bg-card': colors.bg.card,
  'bg-hover': colors.bg.hover,
  'bg-toolbar': colors.bg.toolbar,
  'bg-editor': colors.bg.editor,

  'text-primary': colors.text.primary,
  'text-secondary': colors.text.secondary,
  'text-muted': colors.text.muted,

  'border-default': colors.border,

  'functional-success': colors.functional.success,
  'functional-danger': colors.functional.danger,
  'functional-warning': colors.functional.warning,
} as const
