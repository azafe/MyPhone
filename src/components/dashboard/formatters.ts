export function formatARS(value: number) {
  const rounded = Math.round(value)
  return `$ ${rounded.toLocaleString('es-AR')}`
}

export function formatUSD(value: number) {
  return `USD ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatUnits(value: number) {
  return value.toLocaleString('es-AR')
}

export function formatPercent(value: number) {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}
