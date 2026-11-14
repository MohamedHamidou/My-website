import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { useMyHome } from '@/hooks/useHome'
import { supabase } from '@/lib/supabase'
import type { ShoppingItem } from '@/types/db'

export function shoppingItemsKey(userId: string | undefined) {
  return ['shopping-items', userId] as const
}

export interface ShoppingItemInput {
  name: string
  quantity: string
  home_id?: string | null
  is_common?: boolean
}

export function useShoppingItems() {
  const { user } = useAuth()
  const myHome = useMyHome()
  const homeId = myHome.data?.home.id

  return useQuery({
    queryKey: [...shoppingItemsKey(user?.id), homeId ?? 'personal'],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .order('checked', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as ShoppingItem[]
    },
  })
}

export function useCreateShoppingItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ShoppingItemInput) => {
      const { data, error } = await supabase
        .from('shopping_items')
        .insert({ ...values, user_id: user!.id })
        .select()
        .single()

      if (error) throw error
      return data as ShoppingItem
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shoppingItemsKey(user?.id) })
    },
  })
}

export function useToggleShoppingItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { data, error } = await supabase
        .from('shopping_items')
        .update({ checked })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as ShoppingItem
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shoppingItemsKey(user?.id) })
    },
  })
}

export function useDeleteShoppingItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shopping_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shoppingItemsKey(user?.id) })
    },
  })
}

export function useClearBoughtShoppingItems() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('checked', true)

      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shoppingItemsKey(user?.id) })
    },
  })
}
