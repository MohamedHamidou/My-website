import type { IncomePaymentMethod, PaymentMethod } from '@/types/db'

export const expensePaymentMethods: PaymentMethod[] = [
  'cash',
  'bkash',
  'nagad',
  'card',
  'bank',
]

export const incomePaymentMethods: IncomePaymentMethod[] = [
  'cash',
  'bkash',
  'bank',
]
