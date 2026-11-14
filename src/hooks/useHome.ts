import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Home, HomeInvitation, HomeMember } from '@/types/db'

export function myHomeKey(userId: string | undefined) {
  return ['my-home', userId] as const
}

export function homeMembersKey(homeId: string | undefined) {
  return ['home-members', homeId] as const
}

export function homeInvitationsKey(homeId: string | undefined) {
  return ['home-invitations', homeId] as const
}

interface RpcErrorLike {
  code?: string
  message: string
}

function toActionableError(error: RpcErrorLike): Error {
  if (error.code === 'PGRST202') {
    return new Error(
      'Database setup is incomplete. Apply db/migrations/0007_fix_homes.sql in the Supabase SQL Editor, then retry.',
    )
  }
  if (error.code === '42P17') {
    return new Error(
      'Database policies are recursive. Apply db/migrations/0007_fix_homes.sql to repair them.',
    )
  }
  return new Error(error.message)
}

export function useMyHome() {
  const { user } = useAuth()

  return useQuery({
    queryKey: myHomeKey(user?.id),
    enabled: Boolean(user?.id),
    retry: false,
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase.rpc('get_my_home')

      if (error) throw toActionableError(error)
      if (!data) return null

      const parsed =
        typeof data === 'string' ? (JSON.parse(data) as unknown) : data
      return parsed as { home: Home; membership: HomeMember }
    },
  })
}

export function useHomeMembers(homeId: string | undefined) {
  return useQuery({
    queryKey: homeMembersKey(homeId),
    enabled: Boolean(homeId),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_home_members', {
        target_home_id: homeId!,
      })

      if (error) throw toActionableError(error)

      const parsed =
        typeof data === 'string' ? (JSON.parse(data) as unknown) : data
      return (Array.isArray(parsed) ? parsed : []) as HomeMember[]
    },
  })
}

export function useHomeInvitations(homeId: string | undefined) {
  return useQuery({
    queryKey: homeInvitationsKey(homeId),
    enabled: Boolean(homeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_invitations')
        .select('*')
        .eq('home_id', homeId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as HomeInvitation[]
    },
  })
}

export function useCreateHome() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('create_home', {
        home_name: name.trim(),
      })

      if (error) throw toActionableError(error)
      if (!data) throw new Error('Could not create home')

      return data as Home
    },
    onSuccess: (newHome) => {
      if (newHome && user) {
        queryClient.setQueryData(myHomeKey(user.id), {
          home: newHome,
          membership: {
            id: 'temp-owner',
            home_id: newHome.id,
            user_id: user.id,
            role: 'owner' as const,
            joined_at: new Date().toISOString(),
          },
        })
      }
      void queryClient.invalidateQueries({ queryKey: myHomeKey(user?.id) })
    },
  })
}

export interface InviteInput {
  homeId: string
  email?: string
}

export function useInviteRoommate() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ homeId, email }: InviteInput) => {
      if (!user) throw new Error('Not authenticated')

      const cleanEmail = email?.trim() ? email.trim() : null

      const { data, error } = await supabase.rpc('create_home_invitation', {
        target_home_id: homeId,
        invite_email: cleanEmail,
      })

      if (error) throw toActionableError(error)
      if (!data) throw new Error('Could not create invitation')

      const parsed =
        typeof data === 'string' ? (JSON.parse(data) as unknown) : data
      return parsed as HomeInvitation
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: homeInvitationsKey(variables.homeId),
      })
    },
  })
}

export function useAcceptInvite() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error('Not authenticated')

      const cleanCode = code.trim().toUpperCase()

      const { data, error } = await supabase.rpc('join_home_by_token', {
        invite_token: cleanCode,
      })

      if (error) throw toActionableError(error)

      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myHomeKey(user?.id) })
    },
  })
}

export function useCancelInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      homeId,
    }: {
      id: string
      homeId: string
    }) => {
      const { error } = await supabase
        .from('home_invitations')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (error) throw error
      return { id, homeId }
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: homeInvitationsKey(result.homeId),
      })
    },
  })
}

export function useLeaveHome() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      homeId,
      isOwner,
    }: {
      homeId: string
      isOwner: boolean
    }) => {
      if (!user) throw new Error('Not authenticated')

      if (isOwner) {
        // Owner deleting or archiving home
        const { error } = await supabase.from('homes').delete().eq('id', homeId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('home_members')
          .delete()
          .eq('home_id', homeId)
          .eq('user_id', user.id)

        if (error) throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myHomeKey(user?.id) })
    },
  })
}

