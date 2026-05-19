/**
 * Design Tokens — Spacing
 * 4px grid system
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const

/** Flat map for tailwind.config spacing extend */
export const spacingTokens: Record<string, string> = {
  xs: `${spacing.xs}px`,
  sm: `${spacing.sm}px`,
  md: `${spacing.md}px`,
  lg: `${spacing.lg}px`,
  xl: `${spacing.xl}px`,
  '2xl': `${spacing['2xl']}px`,
}
