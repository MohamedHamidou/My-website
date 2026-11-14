import { useState } from 'react'
import {
  Check,
  Clock,
  Copy,
  DoorOpen,
  Home as HomeIcon,
  Loader2,
  Plus,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { CreateHomeSheet } from '@/components/settings/CreateHomeSheet'
import { InviteRoommateSheet } from '@/components/settings/InviteRoommateSheet'
import { JoinHomeSheet } from '@/components/settings/JoinHomeSheet'
import { Button } from '@/components/ui/button'
import {
  useCancelInvitation,
  useHomeInvitations,
  useHomeMembers,
  useLeaveHome,
  useMyHome,
} from '@/hooks/useHome'
import { useConfirm } from '@/lib/confirm-context'
import type { HomeInvitation } from '@/types/db'

export function HomeManager() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const myHome = useMyHome()
  const home = myHome.data?.home
  const membership = myHome.data?.membership

  const members = useHomeMembers(home?.id)
  const invitations = useHomeInvitations(home?.id)
  const cancelInvite = useCancelInvitation()
  const leaveHome = useLeaveHome()
  const confirm = useConfirm()

  const queryJoinCode = searchParams.get('join') ?? ''
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(Boolean(queryJoinCode))
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedInvite, setSelectedInvite] = useState<HomeInvitation | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [joinCodeParam, setJoinCodeParam] = useState(queryJoinCode)
  const [actionError, setActionError] = useState<string | null>(null)

  function handleCloseJoin(open: boolean) {
    setJoinOpen(open)
    if (!open && searchParams.has('join')) {
      searchParams.delete('join')
      setSearchParams(searchParams, { replace: true })
    }
  }

  const isOwner = membership?.role === 'owner'
  const memberList = members.data ?? []
  const inviteList = invitations.data ?? []

  async function copyToken(token: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${origin}/settings?join=${token}`

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link)
      }
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2500)
    } catch {
      // Fallback
    }
  }

  async function handleLeaveHome() {
    if (!home) return
    const message = isOwner
      ? t('home.confirmDelete')
      : t('home.confirmLeave')
    const actionLabel = isOwner ? t('home.deleteHome') : t('home.leaveHome')

    setActionError(null)
    const confirmed = await confirm({
      title: actionLabel,
      description: message,
      confirmLabel: actionLabel,
      cancelLabel: t('common.cancel'),
      destructive: true,
    })
    if (!confirmed) return

    try {
      await leaveHome.mutateAsync({ homeId: home.id, isOwner })
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t('home.leaveError'),
      )
    }
  }

  if (myHome.isLoading) {
    return (
      <section className="flex items-center justify-center rounded-xl border border-border bg-card p-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </section>
    )
  }

  if (myHome.isError) {
    const errorDetails =
      myHome.error instanceof Error
        ? myHome.error.message
        : (myHome.error as { message?: string })?.message ||
          (myHome.error as { details?: string })?.details ||
          'Database policy or connection error'

    return (
      <section className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs">
        <p className="font-semibold text-destructive">Could not load shared home</p>
        <p className="text-muted-foreground break-words">{errorDetails}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void myHome.refetch()}
        >
          Try again
        </Button>
      </section>
    )
  }

  return (
    <>
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HomeIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">{t('home.title')}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('home.subtitle')}
              </p>
            </div>
          </div>

          {home ? (
            <Button
              size="sm"
              onClick={() => {
                setSelectedInvite(null)
                setInviteOpen(true)
              }}
              className="gap-1.5"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              {t('home.inviteAction')}
            </Button>
          ) : null}
        </div>

        {home ? (
          <div className="space-y-4 pt-1">
            {actionError ? (
              <p
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {actionError}
              </p>
            ) : null}

            {/* Home details banner */}
            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('home.homeName')}</p>
                <p className="font-heading text-sm font-semibold text-foreground">
                  {home.name}
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <Users className="size-3.5" aria-hidden="true" />
                {t('home.memberCount', { count: memberList.length })}
              </span>
            </div>

            {/* Members list */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('home.membersTitle')}
              </p>
              {members.isError ? (
                <p className="text-xs text-destructive">
                  Could not load members:{' '}
                  {members.error instanceof Error
                    ? members.error.message
                    : (members.error as { message?: string })?.message ||
                      'Unknown error'}
                </p>
              ) : null}
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {memberList.map((m) => {
                  const displayName =
                    m.profile?.name || m.profile?.email || 'Housemate'
                  const initial = displayName.trim().charAt(0).toUpperCase()

                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-xs font-semibold text-secondary-foreground">
                          {initial}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {displayName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.profile?.email}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          m.role === 'owner'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {m.role === 'owner' ? (
                          <>
                            <ShieldCheck className="size-3" aria-hidden="true" />
                            {t('home.ownerBadge')}
                          </>
                        ) : (
                          <>
                            <UserCheck className="size-3" aria-hidden="true" />
                            {t('home.memberBadge')}
                          </>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Pending invitations */}
            {inviteList.length > 0 || invitations.isError ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('home.pendingTitle')}
                </p>
                {invitations.isError ? (
                  <p className="text-xs text-destructive">
                    Could not load invitations:{' '}
                    {invitations.error instanceof Error
                      ? invitations.error.message
                      : (invitations.error as { message?: string })?.message ||
                        'Unknown error'}
                  </p>
                ) : null}
                <ul className="space-y-2">
                  {inviteList.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold tracking-wider text-primary">
                            {inv.token}
                          </span>
                          {inv.email ? (
                            <span className="text-muted-foreground">
                              ({inv.email})
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="size-3" aria-hidden="true" />
                          {t('home.expiresIn', { days: 7 })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => void copyToken(inv.token)}
                        >
                          {copiedToken === inv.token ? (
                            <Check className="size-3.5 text-success" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            setActionError(null)
                            void cancelInvite
                              .mutateAsync({
                                id: inv.id,
                                homeId: home.id,
                              })
                              .catch((err) => {
                                setActionError(
                                  err instanceof Error
                                    ? err.message
                                    : t('home.cancelInviteError'),
                                )
                              })
                          }}
                          disabled={cancelInvite.isPending}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Leave Home */}
            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void handleLeaveHome()}
                disabled={leaveHome.isPending}
              >
                {leaveHome.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <DoorOpen className="size-4" aria-hidden="true" />
                )}
                {isOwner ? t('home.deleteHome') : t('home.leaveHome')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="rounded-lg border border-border/80 bg-background/50 p-3.5 text-center">
              <p className="text-xs text-muted-foreground">
                {t('home.noHomeDesc')}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1 gap-1.5"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" aria-hidden="true" />
                {t('home.createAction')}
              </Button>

              <Button
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => {
                  setJoinCodeParam('')
                  setJoinOpen(true)
                }}
              >
                <Users className="size-4" aria-hidden="true" />
                {t('home.joinAction')}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Sheet Modals */}
      <CreateHomeSheet open={createOpen} onOpenChange={setCreateOpen} />
      <JoinHomeSheet
        open={joinOpen}
        onOpenChange={handleCloseJoin}
        initialCode={joinCodeParam}
      />
      {home ? (
        <InviteRoommateSheet
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          homeId={home.id}
          existingInvite={selectedInvite}
        />
      ) : null}
    </>
  )
}
