export type BudgetTone = 'success' | 'warning' | 'danger'

export interface BudgetStatus {
  ratio: number
  percent: number
  tone: BudgetTone
  remaining: number
  over: boolean
}

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  const ratio = limit > 0 ? spent / limit : 0
  const percent = Math.round(ratio * 100)

  return {
    ratio,
    percent,
    tone: ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warning' : 'success',
    remaining: Math.max(limit - spent, 0),
    over: spent > limit,
  }
}
