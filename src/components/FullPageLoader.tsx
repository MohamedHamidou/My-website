import { Eye, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

export function FullPageLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col items-center justify-center gap-3 bg-background text-muted-foreground',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Eye className="size-6" aria-hidden="true" />
      </span>
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  )
}
