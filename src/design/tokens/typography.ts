/**
 * Design Tokens — Typography
 * Size scale for the resume editor
 */

export const typography = {
  h1: {
    fontSize: '24px',
    fontWeight: '700',
  },
  h2: {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
  },
  h3: {
    fontSize: '12px',
    fontWeight: '600',
  },
  body: {
    fontSize: '10px',
    fontWeight: '400',
  },
  caption: {
    fontSize: '9px',
    fontWeight: '400',
  },
  small: {
    fontSize: '8px',
    fontWeight: '400',
  },
} as const

/** Font-size-only map for tailwind.config fontSize */
export const fontSizeTokens = {
  'heading-1': ['24px', { fontWeight: '700' }],
  'heading-2': ['14px', { fontWeight: '700', letterSpacing: '0.05em' }],
  'heading-3': ['12px', { fontWeight: '600' }],
  'body': ['10px', { fontWeight: '400' }],
  'caption': ['9px', { fontWeight: '400' }],
  'small': ['8px', { fontWeight: '400' }],
} as const
