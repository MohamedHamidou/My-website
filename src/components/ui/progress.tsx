import { cn } from '@/lib/utils'

export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger'

const toneClass: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
}

interface ProgressProps {
  value: number
  tone?: ProgressTone
  label?: string
  className?: string
}

export function Progress({
  value,
  tone = 'primary',
  label,
  className,
}: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100)

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300',
          toneClass[tone],
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
