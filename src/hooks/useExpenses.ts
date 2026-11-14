import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { useMyHome } from '@/hooks/useHome'
import { supabase } from '@/lib/supabase'
import { toDateParam } from '@/lib/periods'
import type {
  Expense,
  InventoryItem,
  PaymentMethod,
  StockMovement,
  StockPurchaseInput,
} from '@/types/db'

export function expensesKey(userId: string | undefined, homeId?: string) {
  const key = ['expenses', userId] as const
  return homeId ? ([...key, homeId] as const) : key
}

export interface ExpenseFilters {
  from: Date
  to: Date
  categoryId?: string
  search?: string
}

export interface ExpenseInput {
  amount: number
  category_id: string | null
  date: string
  note: string
  payment_method: PaymentMethod
  home_id?: string | null
  is_common?: boolean
  paid_by?: string | null
}

export interface ExpenseWithStockInput {
  expense: ExpenseInput
  stock: StockPurchaseInput
}

export interface ExpenseWithStockResult {
  expense: Expense
  item: InventoryItem
  movement: StockMovement
}

export function useExpenses(filters: ExpenseFilters) {
  const { user } = useAuth()
  const myHome = useMyHome()
  const homeId = myHome.data?.home.id

  return useQuery({
    queryKey: [
      ...expensesKey(user?.id, homeId),
      toDateParam(filters.from),
      toDateParam(filters.to),
      filters.categoryId ?? 'all',
      filters.search?.trim() ?? '',
    ],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*')
        .gte('date', toDateParam(filters.from))
        .lte('date', toDateParam(filters.to))
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      const search = filters.search?.trim()
      if (search) {
        query = query.ilike('note', `%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Expense[]
    },
  })
}

export function useCreateExpense() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ExpenseInput) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...values, user_id: user!.id })
        .select()
        .single()

      if (error) throw error
      return data as Expense
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expensesKey(user?.id) })
      void queryClient.invalidateQueries({ queryKey: ['money-overview'] })
    },
  })
}

export function useCreateExpenseWithStock() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ExpenseWithStockInput) => {
      const { data, error } = await supabase.rpc(
        'create_expense_with_stock',
        { payload: values },
      )

      if (error) throw error

      const parsed =
        typeof data === 'string' ? (JSON.parse(data) as unknown) : data
      if (!parsed) throw new Error('Could not save the expense')

      return parsed as ExpenseWithStockResult
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expensesKey(user?.id) })
      void queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      void queryClient.invalidateQueries({ queryKey: ['money-overview'] })
    },
  })
}

export function useUpdateExpense() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<ExpenseInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Expense
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expensesKey(user?.id) })
      void queryClient.invalidateQueries({ queryKey: ['money-overview'] })
    },
  })
}

export function useDeleteExpense() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expensesKey(user?.id) })
      void queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      void queryClient.invalidateQueries({ queryKey: ['money-overview'] })
    },
  })
}
