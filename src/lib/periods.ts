import {
  addDays,
  addMonths,
  endOfDay,
  format,
  setDate,
  startOfDay,
  subMonths,
} from 'date-fns'

export interface DateRange {
  start: Date
  end: Date
  label: string
}

function clampDay(day: number): number {
  return Math.min(Math.max(Math.round(day) || 1, 1), 28)
}

export function monthRange(
  monthStartDay: number,
  reference: Date = new Date(),
): DateRange {
  const day = clampDay(monthStartDay)
  const ref = startOfDay(reference)

  const start =
    ref.getDate() >= day
      ? startOfDay(setDate(ref, day))
      : startOfDay(setDate(subMonths(ref, 1), day))

  const nextStart = startOfDay(setDate(addMonths(start, 1), day))
  const end = endOfDay(addDays(nextStart, -1))

  return { start, end, label: format(start, 'MMM yyyy') }
}

export function lastNMonthRanges(
  monthStartDay: number,
  count: number,
  reference: Date = new Date(),
): DateRange[] {
  const current = monthRange(monthStartDay, reference)

  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index
    const start = startOfDay(subMonths(current.start, offset))
    const nextStart = startOfDay(
      setDate(addMonths(start, 1), clampDay(monthStartDay)),
    )
    const end = endOfDay(addDays(nextStart, -1))
    return { start, end, label: format(start, 'MMM') }
  })
}

export function toDateParam(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
