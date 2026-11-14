import { useState } from 'react'
import { Check, Copy, Loader2, Mail, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { useInviteRoommate } from '@/hooks/useHome'
import type { HomeInvitation } from '@/types/db'

interface InviteRoommateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  homeId: string
  existingInvite?: HomeInvitation | null
}

export function InviteRoommateSheet({
  open,
  onOpenChange,
  homeId,
  existingInvite,
}: InviteRoommateSheetProps) {
  const { t } = useTranslation()
  const inviteMutation = useInviteRoommate()
  const [email, setEmail] = useState('')
  const [createdInvite, setCreatedInvite] = useState<HomeInvitation | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeInvite = createdInvite ?? existingInvite

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault()
    try {
      const invite = await inviteMutation.mutateAsync({
        homeId,
        email: email.trim() || undefined,
      })
      setCreatedInvite(invite)
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ??
            'Could not generate invite'
      setError(message)
    }
  }

  async function copyInviteLink(code: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${origin}/settings?join=${code}`

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = link
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Could not copy link to clipboard')
    }
  }

  function handleClose() {
    setCreatedInvite(null)
    setEmail('')
    setCopied(false)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={handleClose}
      title={t('home.inviteSheetTitle')}
      description={t('home.inviteSheetSubtitle')}
    >
      <div className="space-y-4">
        {activeInvite ? (
          <div className="space-y-3.5 rounded-xl border border-border bg-background/60 p-4 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('home.inviteCodeLabel')}
            </span>
            <div className="flex items-center justify-center">
              <span className="rounded-lg bg-card px-4 py-2 font-mono text-2xl font-bold tracking-widest text-primary shadow-xs">
                {activeInvite.token}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              {activeInvite.email
                ? `Reserved for ${activeInvite.email}`
                : 'Anyone with this code or link can join your home.'}
            </p>

            <div className="pt-1">
              <Button
                type="button"
                className="w-full gap-2"
                onClick={() => void copyInviteLink(activeInvite.token)}
              >
                {copied ? (
                  <>
                    <Check className="size-4 text-success-foreground" />
                    {t('home.linkCopied')}
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    {t('home.copyLink')}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="roommateEmail" className="text-sm font-medium">
                {t('home.emailLabel')}
              </label>
              <div className="relative">
                <Input
                  id="roommateEmail"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder={t('home.emailPlaceholder')}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to generate an open code you can share with anyone.
              </p>
              {error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Share2 className="size-4" aria-hidden="true" />
              )}
              {t('home.sendInvite')}
            </Button>
          </form>
        )}

        {activeInvite && !createdInvite ? (
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setCreatedInvite(null)
                setEmail('')
              }}
            >
              <Mail className="size-4" />
              Create another invitation
            </Button>
          </div>
        ) : null}
      </div>
    </Sheet>
  )
}

