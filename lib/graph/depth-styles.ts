/**
 * Depth-based fallback colors for sessions/subagents.
 * These are used when agents don't have custom colors configured.
 */
const DEPTH_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(203 80% 55%)',
  'hsl(196 70% 50%)',
  'hsl(188 60% 45%)',
]

/**
 * Get accent color for a session based on depth.
 * Used as fallback when no agent color is configured.
 */
export function getDepthAccentColor(depth: number): string {
  return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)] ?? 'hsl(var(--primary))'
}

/**
 * Get a tinted background color for subagent groups based on depth.
 */
export function getDepthGroupTint(depth: number): string {
  const alpha = Math.max(0.04, 0.12 - depth * 0.02)
  return `hsl(var(--secondary) / ${alpha})`
}

/**
 * Convert a hex color (like #FF5733) to HSL format for consistency with the design system.
 * Returns the color in a format compatible with Tailwind/CSS.
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '')

  // Parse hex values
  const r = Number.parseInt(cleanHex.slice(0, 2), 16) / 255
  const g = Number.parseInt(cleanHex.slice(2, 4), 16) / 255
  const b = Number.parseInt(cleanHex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    // Achromatic
    return `hsl(0 0% ${Math.round(l * 100)}%)`
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    case b:
      h = ((r - g) / d + 4) / 6
      break
  }

  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`
}

/**
 * Get the accent color for a session, preferring agent color over depth-based.
 *
 * @param agentColor - The agent's configured color (hex format like #FF5733)
 * @param depth - The session depth in the tree hierarchy
 * @returns CSS color string
 */
export function getAccentColor(agentColor: string | undefined, depth: number): string {
  if (agentColor) {
    return hexToHsl(agentColor)
  }
  return getDepthAccentColor(depth)
}

/**
 * Get a tinted background color, preferring agent color over depth-based.
 *
 * @param agentColor - The agent's configured color (hex format like #FF5733)
 * @param depth - The session depth in the tree hierarchy
 * @returns CSS color string with alpha transparency
 */
export function getGroupTint(agentColor: string | undefined, depth: number): string {
  if (agentColor) {
    // Parse hex and create a semi-transparent version
    const cleanHex = agentColor.replace('#', '')
    const r = Number.parseInt(cleanHex.slice(0, 2), 16)
    const g = Number.parseInt(cleanHex.slice(2, 4), 16)
    const b = Number.parseInt(cleanHex.slice(4, 6), 16)
    const alpha = Math.max(0.04, 0.12 - depth * 0.02)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return getDepthGroupTint(depth)
}
