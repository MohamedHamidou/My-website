import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Budget } from '@/types/db'

export function budgetsKey(userId: string | undefined) {
  return ['budgets', userId] as const
}

export interface BudgetInput {
  category_id: string
  limit_amount: number
}

export function useBudgets() {
  const { user } = useAuth()

  return useQuery({
    queryKey: budgetsKey(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as Budget[]
    },
  })
}

export function useSetBudget() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: BudgetInput) => {
      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          { ...values, user_id: user!.id },
          { onConflict: 'user_id,category_id' },
        )
        .select()
        .single()

      if (error) throw error
      return data as Budget
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetsKey(user?.id) })
    },
  })
}

export function useDeleteBudget() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetsKey(user?.id) })
    },
  })
}
