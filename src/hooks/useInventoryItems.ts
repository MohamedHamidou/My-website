import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { useMyHome } from '@/hooks/useHome'
import { supabase } from '@/lib/supabase'
import type { InventoryCategory, InventoryItem } from '@/types/db'

export function inventoryItemsKey(userId: string | undefined) {
  return ['inventory-items', userId] as const
}

export interface InventoryItemInput {
  name: string
  category: InventoryCategory
  quantity: number
  unit: string
  min_threshold: number
  location: string
  home_id?: string | null
  is_common?: boolean
}

export function useInventoryItems() {
  const { user } = useAuth()
  const myHome = useMyHome()
  const homeId = myHome.data?.home.id

  return useQuery({
    queryKey: [...inventoryItemsKey(user?.id), homeId ?? 'personal'],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data as InventoryItem[]
    },
  })
}

export function useCreateInventoryItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: InventoryItemInput) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({ ...values, user_id: user!.id })
        .select()
        .single()

      if (error) throw error
      return data as InventoryItem
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryItemsKey(user?.id) })
    },
  })
}

export function useUpdateInventoryItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<InventoryItemInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as InventoryItem
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryItemsKey(user?.id) })
    },
  })
}

export function useDeleteInventoryItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryItemsKey(user?.id) })
    },
  })
}
