import { useMemo } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  ReceiptText,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState } from '@/components/EmptyState'
import { useCategories } from '@/hooks/useCategories'
import { useMoneyOverview } from '@/hooks/useMoneyOverview'
import { useProfile } from '@/hooks/useProfile'
import { formatMoney } from '@/lib/money'
import { monthRange } from '@/lib/periods'

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof Wallet
  tone: 'success' | 'danger' | 'primary'
}) {
  const toneClass = {
    success: 'bg-success/10 text-success',
    danger: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary',
  }[tone]

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`mb-3 flex size-9 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="size-4.5" aria-hidden="true" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums">
        {value}
      </p>
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const profile = useProfile()
  const categories = useCategories()
  const overview = useMoneyOverview()

  const currency = profile.data?.currency ?? 'BDT'
  const monthStartDay = profile.data?.month_start_day ?? 1
  const firstName = profile.data?.name?.trim().split(' ')[0]

  const categoryMap = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category])),
    [categories.data],
  )

  const current = overview.data?.current
  const income = current?.income ?? 0
  const spent = current?.spent ?? 0
  const saved = income - spent

  const donutData = (overview.data?.categoryTotals ?? []).map((item) => {
    const category = item.categoryId ? categoryMap.get(item.categoryId) : undefined
    return {
      name: category?.name ?? t('expenses.uncategorised'),
      value: item.amount,
      color: category?.color ?? '#6B7280',
    }
  })

  const trendData = (overview.data?.months ?? []).map((month) => ({
    name: month.label,
    spent: month.spent,
    income: month.income,
  }))

  const hasCurrentData = donutData.length > 0 || income > 0
  const hasTrendData = trendData.some((month) => month.spent > 0 || month.income > 0)
  const loading = overview.isLoading || profile.isLoading

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          {firstName
            ? t('dashboard.hi', { name: firstName })
            : t('dashboard.greeting')}
        </p>
        <h1 className="text-2xl font-semibold">
          {monthRange(monthStartDay).label}
        </h1>
      </div>

      <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
        <p className="text-sm/relaxed text-primary-foreground/80">
          {t('dashboard.remaining')}
        </p>
        <p className="mt-1 font-heading text-4xl font-semibold tabular-nums">
          {formatMoney(saved, currency)}
        </p>
        <p className="mt-3 text-xs text-primary-foreground/70">
          {t('dashboard.remainingHint')}
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <SummaryCard
          label={t('dashboard.income')}
          value={formatMoney(income, currency)}
          icon={ArrowDownLeft}
          tone="success"
        />
        <SummaryCard
          label={t('dashboard.spent')}
          value={formatMoney(spent, currency)}
          icon={ArrowUpRight}
          tone="danger"
        />
        <SummaryCard
          label={t('dashboard.saved')}
          value={formatMoney(saved, currency)}
          icon={PiggyBank}
          tone={saved >= 0 ? 'primary' : 'danger'}
        />
      </section>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t('common.loading')}
        </p>
      ) : !hasCurrentData ? (
        <EmptyState
          icon={ReceiptText}
          title={t('dashboard.emptyTitle')}
          description={t('dashboard.empty')}
        />
      ) : (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">{t('dashboard.byCategory')}</h2>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {donutData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatMoney(Number(value), currency)}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2">
            {donutData.slice(0, 6).map((item) => (
              <li key={item.name} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {item.name}
                </span>
                <span className="tabular-nums font-medium">
                  {formatMoney(item.value, currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasTrendData ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">{t('dashboard.trend')}</h2>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barGap={2}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  tickFormatter={(value) => String(Math.round(Number(value) / 100))}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                  formatter={(value) => formatMoney(Number(value), currency)}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="income"
                  name={t('dashboard.income')}
                  fill="var(--success)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="spent"
                  name={t('dashboard.spent')}
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-success" />
              {t('dashboard.income')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary" />
              {t('dashboard.spent')}
            </span>
          </div>
        </section>
      ) : null}

      <p className="pb-2 text-center text-xs text-muted-foreground">
        {t('dashboard.chartHint', { month: monthRange(monthStartDay).label })}
      </p>
    </div>
  )
}
