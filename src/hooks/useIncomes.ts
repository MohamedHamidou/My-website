import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toDateParam } from '@/lib/periods'
import type { Income, IncomePaymentMethod } from '@/types/db'

export function incomesKey(userId: string | undefined) {
  return ['incomes', userId] as const
}

export interface IncomeFilters {
  from: Date
  to: Date
  categoryId?: string
  search?: string
}

export interface IncomeInput {
  amount: number
  category_id: string | null
  date: string
  note: string
  payment_method: IncomePaymentMethod
}

export function useIncomes(filters: IncomeFilters) {
  const { user } = useAuth()

  return useQuery({
    queryKey: [
      ...incomesKey(user?.id),
      toDateParam(filters.from),
      toDateParam(filters.to),
      filters.categoryId ?? 'all',
      filters.search?.trim() ?? '',
    ],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      let query = supabase
        .from('incomes')
        .select('*')
        .eq('user_id', user!.id)
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
      return data as Income[]
    },
  })
}

export function useCreateIncome() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: IncomeInput) => {
      const { data, error } = await supabase
        .from('incomes')
        .insert({ ...values, user_id: user!.id })
        .select()
        .single()

      if (error) throw error
      return data as Income
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: incomesKey(user?.id) })
      void queryClient.invalidateQueries({ queryKey: ['money-overview'] })
    },
  })
}

export function useUpdateIncome() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<IncomeInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('incomes')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Income
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: incomesKey(user?.id) })
      void queryClient.invalidateQueries({ queryKey: ['money-overview'] })
    },
  })
}

export function useDeleteIncome() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('incomes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: incomesKey(user?.id) })
      void queryClient.invalidateQueries({ queryKey: ['money-overview'] })
    },
  })
}
