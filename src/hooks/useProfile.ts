import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/db'

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    'name' | 'currency' | 'locale' | 'month_start_day' | 'onboarding_completed'
  >
>

export function profileKey(userId: string | undefined) {
  return ['profile', userId] as const
}

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: profileKey(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      return data as Profile
    },
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ProfileUpdate) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(values)
        .eq('id', user!.id)
        .select()
        .single()

      if (error) throw error
      return data as Profile
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey(profile.id), profile)
    },
  })
}
