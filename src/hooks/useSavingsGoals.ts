import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { SavingsGoal } from '@/types/db'

export function savingsGoalsKey(userId: string | undefined) {
  return ['savings-goals', userId] as const
}

export interface SavingsGoalInput {
  name: string
  target_amount: number
  deadline: string | null
}

export function useSavingsGoals() {
  const { user } = useAuth()

  return useQuery({
    queryKey: savingsGoalsKey(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as SavingsGoal[]
    },
  })
}

export function useCreateSavingsGoal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: SavingsGoalInput) => {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert({ ...values, user_id: user!.id })
        .select()
        .single()

      if (error) throw error
      return data as SavingsGoal
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: savingsGoalsKey(user?.id) })
    },
  })
}

export function useUpdateSavingsGoal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<SavingsGoalInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('savings_goals')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as SavingsGoal
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: savingsGoalsKey(user?.id) })
    },
  })
}

export function useContributeToSavingsGoal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data: current, error: readError } = await supabase
        .from('savings_goals')
        .select('saved_amount')
        .eq('id', id)
        .single()

      if (readError) throw readError

      const { data, error } = await supabase
        .from('savings_goals')
        .update({
          saved_amount:
            (current as Pick<SavingsGoal, 'saved_amount'>).saved_amount + amount,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as SavingsGoal
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: savingsGoalsKey(user?.id) })
    },
  })
}

export function useDeleteSavingsGoal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: savingsGoalsKey(user?.id) })
    },
  })
}
