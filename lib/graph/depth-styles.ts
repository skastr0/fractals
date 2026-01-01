const DEPTH_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(203 80% 55%)',
  'hsl(196 70% 50%)',
  'hsl(188 60% 45%)',
]

export function getDepthAccentColor(depth: number): string {
  return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)] ?? 'hsl(var(--primary))'
}

export function getDepthGroupTint(depth: number): string {
  const alpha = Math.max(0.04, 0.12 - depth * 0.02)
  return `hsl(var(--secondary) / ${alpha})`
}
