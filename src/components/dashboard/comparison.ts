export type ComparisonResult = {
  pct: number
  direction: 'up' | 'down'
}

export function computeComparison(current: number, previous: number): ComparisonResult | null {
  if (!previous || previous <= 0) return null
  const pct = ((current - previous) / previous) * 100
  return {
    pct,
    direction: pct >= 0 ? 'up' : 'down',
  }
}
