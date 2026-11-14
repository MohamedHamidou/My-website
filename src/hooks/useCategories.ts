import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Category, CategoryType } from '@/types/db'

export function categoriesKey(userId: string | undefined) {
  return ['categories', userId] as const
}

export interface CategoryInput {
  name: string
  icon: string
  color: string
  type: CategoryType
}

export function useCategories() {
  const { user } = useAuth()

  return useQuery({
    queryKey: categoriesKey(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user!.id)
        .order('type', { ascending: true })
        .order('position', { ascending: true })

      if (error) throw error
      return data as Category[]
    },
  })
}

export function useCreateCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: CategoryInput) => {
      const existing = queryClient.getQueryData<Category[]>(
        categoriesKey(user?.id),
      )
      const sameType = existing?.filter((item) => item.type === values.type) ?? []
      const position = sameType.length

      const { data, error } = await supabase
        .from('categories')
        .insert({ ...values, user_id: user!.id, position })
        .select()
        .single()

      if (error) throw error
      return data as Category
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesKey(user?.id) })
    },
  })
}

export function useUpdateCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<CategoryInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Category
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesKey(user?.id) })
    },
  })
}

export function useDeleteCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesKey(user?.id) })
    },
  })
}
