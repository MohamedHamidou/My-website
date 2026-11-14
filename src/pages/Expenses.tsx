import { useMemo, useState, createElement } from 'react'
import {
  endOfDay,
  format,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ReceiptText,
  Search,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { EntrySheet, type Entry, type EntryType } from '@/components/money/EntrySheet'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/hooks/useCategories'
import { useExpenses } from '@/hooks/useExpenses'
import { useIncomes } from '@/hooks/useIncomes'
import { useProfile } from '@/hooks/useProfile'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatMoney } from '@/lib/money'
import { monthRange } from '@/lib/periods'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/db'

type RangePreset = 'thisMonth' | 'last30' | 'all'

const rangePresets: RangePreset[] = ['thisMonth', 'last30', 'all']

export function ExpensesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const profile = useProfile()
  const categories = useCategories()
  const currency = profile.data?.currency ?? 'BDT'
  const monthStartDay = profile.data?.month_start_day ?? 1

  const [type, setType] = useState<EntryType>('expense')
  const [preset, setPreset] = useState<RangePreset>('thisMonth')
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)

  const range = useMemo(() => {
    if (preset === 'thisMonth') {
      const { start, end } = monthRange(monthStartDay)
      return { start, end }
    }
    if (preset === 'last30') {
      return { start: startOfDay(subDays(new Date(), 29)), end: endOfDay(new Date()) }
    }
    return { start: startOfDay(new Date(2000, 0, 1)), end: endOfDay(new Date()) }
  }, [preset, monthStartDay])

  const filters = { from: range.start, to: range.end, categoryId, search }
  const expenses = useExpenses(filters)
  const incomes = useIncomes(filters)

  const allCategories = useMemo(() => categories.data ?? [], [categories.data])
  const typeCategories = allCategories.filter((category) => category.type === type)
  const categoryMap = useMemo(
    () => new Map(allCategories.map((category) => [category.id, category])),
    [allCategories],
  )

  const activeQuery = type === 'expense' ? expenses : incomes
  const entries = useMemo(
    () => (activeQuery.data ?? []) as Entry[],
    [activeQuery.data],
  )

  const grouped = useMemo(() => {
    const groups = new Map<string, Entry[]>()
    for (const entry of entries) {
      const list = groups.get(entry.date) ?? []
      list.push(entry)
      groups.set(entry.date, list)
    }
    return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [entries])

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)

  function changeType(next: EntryType) {
    setType(next)
    setCategoryId('')
  }

  function openAdd() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(entry: Entry) {
    setEditing(entry)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('expenses.title')}</h1>
        <div className="flex rounded-full border border-border bg-card p-1">
          {(['expense', 'income'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeType(option)}
              aria-pressed={type === option}
              className={cn(
                'min-h-9 rounded-full px-3 text-xs font-medium transition-colors',
                type === option
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {t(option === 'expense' ? 'expenses.expenses' : 'expenses.income')}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">
          {t(type === 'expense' ? 'expenses.totalSpent' : 'expenses.totalIncome')}
        </p>
        <p
          className={cn(
            'mt-0.5 font-heading text-2xl font-semibold tabular-nums',
            type === 'expense' ? 'text-foreground' : 'text-success',
          )}
        >
          {formatMoney(total, currency)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('expenses.count', { count: entries.length })}
        </p>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('expenses.searchPlaceholder')}
            className="pl-9"
            aria-label={t('expenses.search')}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-label={t('expenses.filterCategory')}
          >
            <option value="">{t('expenses.allCategories')}</option>
            {typeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select
            value={preset}
            onChange={(event) => setPreset(event.target.value as RangePreset)}
            aria-label={t('expenses.filterRange')}
          >
            {rangePresets.map((option) => (
              <option key={option} value={option}>
                {t(`expenses.range.${option}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {activeQuery.isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t('common.loading')}
        </p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={t(type === 'expense' ? 'expenses.emptyTitle' : 'incomes.emptyTitle')}
          description={t(type === 'expense' ? 'expenses.empty' : 'incomes.empty')}
          action={{ label: t('expenses.add'), onClick: openAdd }}
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, dayEntries]) => (
            <section key={date} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {format(parseISO(date), 'EEE, d MMM')}
                </h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatMoney(
                    dayEntries.reduce((sum, entry) => sum + entry.amount, 0),
                    currency,
                  )}
                </span>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {dayEntries.map((entry) => {
                  const canEdit = entry.user_id === user?.id
                  const isCommon = 'is_common' in entry && entry.is_common
                  const paymentLabel = t(
                    `entries.payment.${entry.payment_method}`,
                  )
                  const rowContent = (
                    <>
                      <CategoryBadge
                        category={
                          entry.category_id
                            ? categoryMap.get(entry.category_id)
                            : undefined
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {entry.category_id
                            ? categoryMap.get(entry.category_id)?.name ??
                              t('expenses.uncategorised')
                            : t('expenses.uncategorised')}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {entry.note
                            ? `${entry.note} · ${paymentLabel}`
                            : paymentLabel}
                          {isCommon ? (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-primary">
                              <Users className="size-3" aria-hidden="true" />
                              {t('expenses.shared')}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex items-center gap-1 text-sm font-semibold tabular-nums',
                          type === 'expense' ? 'text-foreground' : 'text-success',
                        )}
                      >
                        {type === 'expense' ? (
                          <ArrowUpRight className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDownLeft className="size-3.5" aria-hidden="true" />
                        )}
                        {formatMoney(entry.amount, currency)}
                      </span>
                    </>
                  )

                  return (
                    <li key={entry.id}>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                        >
                          {rowContent}
                        </button>
                      ) : (
                        <div className="flex w-full items-center gap-3 px-4 py-3 text-left">
                          {rowContent}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={openAdd}
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:bg-primary-dark active:scale-95 bottom-[calc(var(--safe-bottom)+4.75rem)]"
        aria-label={t(type === 'expense' ? 'entries.addExpense' : 'entries.addIncome')}
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>

      <EntrySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        type={type}
        categories={allCategories}
        initial={editing}
      />
    </div>
  )
}

function CategoryBadge({ category }: { category?: Category }) {
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: category?.color ?? '#6B7280' }}
    >
      {createElement(getCategoryIcon(category?.icon), {
        className: 'size-5',
        'aria-hidden': true,
      })}
    </span>
  )
}
