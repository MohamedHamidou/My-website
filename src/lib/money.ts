import { getCurrency } from '@/lib/currencies'

export function formatMoney(amountMinor: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode)
  const value = amountMinor / 100

  try {
    return new Intl.NumberFormat(currencyCode === 'BDT' ? 'en-BD' : 'en', {
      style: 'currency',
      currency: currency.code,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency.symbol}${value.toFixed(2)}`
  }
}

export function savingsRate(incomeMinor: number, spentMinor: number): number | null {
  if (incomeMinor <= 0) return null
  return Math.round(((incomeMinor - spentMinor) / incomeMinor) * 100)
}

export function parseAmountToMinor(input: string): number | null {
  const normalized = input.replace(/,/g, '').trim()
  if (!normalized) return null

  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return null

  return Math.round(value * 100)
}
