import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { incomePaymentMethods } from '@/lib/payments'
import { lastNMonthRanges, toDateParam } from '@/lib/periods'
import { supabase } from '@/lib/supabase'
import type { IncomePaymentMethod, PaymentMethod } from '@/types/db'

export interface MonthBucket {
  label: string
  income: number
  spent: number
}

export interface CategoryTotal {
  categoryId: string | null
  amount: number
}

export interface WalletBucket {
  method: IncomePaymentMethod
  income: number
  spent: number
  remaining: number
}

export interface MoneyOverview {
  months: MonthBucket[]
  current: MonthBucket
  categoryTotals: CategoryTotal[]
  wallets: WalletBucket[]
}

interface AmountRow {
  amount: number
  date: string
  category_id: string | null
  payment_method: PaymentMethod
}

export function useMoneyOverview(monthCount = 6) {
  const { user } = useAuth()
  const profile = useProfile()
  const monthStartDay = profile.data?.month_start_day ?? 1
  const ranges = lastNMonthRanges(monthStartDay, monthCount)
  const from = toDateParam(ranges[0].start)
  const to = toDateParam(ranges[ranges.length - 1].end)

  return useQuery({
    queryKey: ['money-overview', user?.id, monthStartDay, from, to],
    enabled: Boolean(user?.id && profile.data),
    queryFn: async (): Promise<MoneyOverview> => {
      const [expensesResult, incomesResult] = await Promise.all([
        supabase
          .from('expenses')
          .select('amount, date, category_id, payment_method')
          .eq('user_id', user!.id)
          .gte('date', from)
          .lte('date', to),
        supabase
          .from('incomes')
          .select('amount, date, category_id, payment_method')
          .eq('user_id', user!.id)
          .gte('date', from)
          .lte('date', to),
      ])

      if (expensesResult.error) throw expensesResult.error
      if (incomesResult.error) throw incomesResult.error

      const expenses = (expensesResult.data ?? []) as AmountRow[]
      const incomes = (incomesResult.data ?? []) as AmountRow[]

      const months: MonthBucket[] = ranges.map((range) => {
        const startParam = toDateParam(range.start)
        const endParam = toDateParam(range.end)

        const spent = expenses
          .filter((row) => row.date >= startParam && row.date <= endParam)
          .reduce((sum, row) => sum + row.amount, 0)

        const income = incomes
          .filter((row) => row.date >= startParam && row.date <= endParam)
          .reduce((sum, row) => sum + row.amount, 0)

        return { label: range.label, income, spent }
      })

      const currentRange = ranges[ranges.length - 1]
      const currentStart = toDateParam(currentRange.start)
      const currentEnd = toDateParam(currentRange.end)

      const currentExpenses = expenses.filter(
        (row) => row.date >= currentStart && row.date <= currentEnd,
      )
      const currentIncomes = incomes.filter(
        (row) => row.date >= currentStart && row.date <= currentEnd,
      )

      const totals = new Map<string | null, number>()
      for (const row of currentExpenses) {
        const key = row.category_id ?? null
        totals.set(key, (totals.get(key) ?? 0) + row.amount)
      }

      const categoryTotals: CategoryTotal[] = [...totals.entries()]
        .map(([categoryId, amount]) => ({ categoryId, amount }))
        .sort((a, b) => b.amount - a.amount)

      const wallets: WalletBucket[] = incomePaymentMethods.map((method) => {
        const income = currentIncomes
          .filter((row) => row.payment_method === method)
          .reduce((sum, row) => sum + row.amount, 0)
        const spent = currentExpenses
          .filter((row) => row.payment_method === method)
          .reduce((sum, row) => sum + row.amount, 0)

        return { method, income, spent, remaining: income - spent }
      })

      return {
        months,
        current: months[months.length - 1],
        categoryTotals,
        wallets,
      }
    },
  })
}
