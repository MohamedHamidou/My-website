import { useCallback, useMemo, useState } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { PiggyBank, Plus, Target, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BudgetSheet } from '@/components/budgets/BudgetSheet'
import { ContributeSheet, GoalSheet } from '@/components/budgets/GoalSheet'
import { WalletSummary } from '@/components/budgets/WalletSummary'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useBudgets } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { useMoneyOverview } from '@/hooks/useMoneyOverview'
import { useProfile } from '@/hooks/useProfile'
import { useSavingsGoals } from '@/hooks/useSavingsGoals'
import { budgetStatus } from '@/lib/budgets'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatMoney, savingsRate } from '@/lib/money'
import { monthRange } from '@/lib/periods'
import { cn } from '@/lib/utils'
import type { Budget, Category, SavingsGoal } from '@/types/db'

interface BudgetRow {
  budget: Budget
  category: Category
  spent: number
}

export function BudgetsPage() {
  const { t } = useTranslation()
  const profile = useProfile()
  const categories = useCategories()
  const overview = useMoneyOverview()
  const budgets = useBudgets()
  const goals = useSavingsGoals()

  const currency = profile.data?.currency ?? 'BDT'
  const monthStartDay = profile.data?.month_start_day ?? 1
  const periodLabel = monthRange(monthStartDay).label

  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null)

  const closeContribute = useCallback((open: boolean) => {
    if (!open) setContributeGoal(null)
  }, [])

  const expenseCategories = useMemo(
    () =>
      (categories.data ?? []).filter((category) => category.type === 'expense'),
    [categories.data],
  )

  const categoryMap = useMemo(
    () =>
      new Map(expenseCategories.map((category) => [category.id, category])),
    [expenseCategories],
  )

  const rows = useMemo(() => {
    const spentByCategory = new Map(
      (overview.data?.categoryTotals ?? []).map((item) => [
        item.categoryId,
        item.amount,
      ]),
    )

    const list: BudgetRow[] = []
    for (const budget of budgets.data ?? []) {
      const category = categoryMap.get(budget.category_id)
      if (!category) continue
      list.push({
        budget,
        category,
        spent: spentByCategory.get(budget.category_id) ?? 0,
      })
    }

    return list.sort((a, b) => a.category.position - b.category.position)
  }, [budgets.data, categoryMap, overview.data])

  const takenCategoryIds = useMemo(
    () => (budgets.data ?? []).map((budget) => budget.category_id),
    [budgets.data],
  )

  const availableCategories = useMemo(
    () =>
      expenseCategories.filter(
        (category) => !takenCategoryIds.includes(category.id),
      ),
    [expenseCategories, takenCategoryIds],
  )

  const income = overview.data?.current.income ?? 0
  const spent = overview.data?.current.spent ?? 0
  const wallets = overview.data?.wallets ?? []
  const rate = savingsRate(income, spent)

  const editingBudgetSpent = editingBudget
    ? rows.find((row) => row.budget.id === editingBudget.id)?.spent ?? 0
    : undefined

  const budgetsLoading = budgets.isLoading || overview.isLoading
  const goalsList = goals.data ?? []

  function openAddBudget() {
    setEditingBudget(null)
    setBudgetSheetOpen(true)
  }

  function openEditBudget(budget: Budget) {
    setEditingBudget(budget)
    setBudgetSheetOpen(true)
  }

  function openAddGoal() {
    setEditingGoal(null)
    setGoalSheetOpen(true)
  }

  function openEditGoal(goal: SavingsGoal) {
    setEditingGoal(goal)
    setGoalSheetOpen(true)
  }

  function deadlineLabel(deadline: string): string {
    const days = differenceInCalendarDays(parseISO(deadline), new Date())
    if (days < 0) return t('budgets.overdue')
    if (days === 0) return t('budgets.dueToday')
    return t('budgets.daysLeft', { days })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('budgets.title')}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t('budgets.subtitle')}
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t('budgets.thisMonth')} · {periodLabel}
            </p>
            <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
              {rate === null ? '—' : `${rate}%`}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('budgets.savingsRate')}
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <TrendingUp className="size-5" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {rate === null
            ? t('budgets.noIncome')
            : t('budgets.savingsHint', {
                income: formatMoney(income, currency),
                spent: formatMoney(spent, currency),
              })}
        </p>
      </section>

      <WalletSummary wallets={wallets} currency={currency} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t('budgets.monthly')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('budgets.monthlyHint')}
            </p>
          </div>
          {availableCategories.length > 0 ? (
            <Button variant="outline" size="sm" onClick={openAddBudget}>
              <Plus aria-hidden="true" />
              {t('budgets.addBudget')}
            </Button>
          ) : null}
        </div>

        {budgetsLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title={t('budgets.noBudgetsTitle')}
            description={t('budgets.noBudgets')}
            action={
              availableCategories.length > 0
                ? { label: t('budgets.addBudget'), onClick: openAddBudget }
                : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {rows.map(({ budget, category, spent: categorySpent }) => {
              const status = budgetStatus(categorySpent, budget.limit_amount)
              const Icon = getCategoryIcon(category.icon)
              const badge = status.over
                ? t('budgets.overBudget')
                : status.ratio >= 1
                  ? t('budgets.atLimit')
                  : status.ratio >= 0.8
                    ? t('budgets.nearLimit')
                    : null

              return (
                <li key={budget.id}>
                  <button
                    type="button"
                    onClick={() => openEditBudget(budget)}
                    className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: category.color }}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-medium">
                            {category.name}
                          </span>
                          {badge ? (
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                status.tone === 'danger'
                                  ? 'bg-destructive/10 text-destructive'
                                  : 'bg-warning/10 text-warning',
                              )}
                            >
                              {badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                          {t('budgets.spentOf', {
                            spent: formatMoney(categorySpent, currency),
                            limit: formatMoney(budget.limit_amount, currency),
                          })}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-xs font-medium tabular-nums',
                          status.tone === 'danger'
                            ? 'text-destructive'
                            : status.tone === 'warning'
                              ? 'text-warning'
                              : 'text-muted-foreground',
                        )}
                      >
                        {status.over
                          ? t('budgets.over', {
                              amount: formatMoney(
                                categorySpent - budget.limit_amount,
                                currency,
                              ),
                            })
                          : t('budgets.remaining', {
                              amount: formatMoney(status.remaining, currency),
                            })}
                      </span>
                    </div>
                    <Progress
                      value={status.percent}
                      tone={status.tone}
                      label={category.name}
                      className="mt-3"
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t('budgets.goals')}</h2>
            <p className="text-xs text-muted-foreground">{t('budgets.goalsHint')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={openAddGoal}>
            <Plus aria-hidden="true" />
            {t('budgets.addGoal')}
          </Button>
        </div>

        {goals.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </p>
        ) : goalsList.length === 0 ? (
          <EmptyState
            icon={Target}
            title={t('budgets.noGoalsTitle')}
            description={t('budgets.noGoals')}
            action={{ label: t('budgets.addGoal'), onClick: openAddGoal }}
          />
        ) : (
          <ul className="space-y-2">
            {goalsList.map((goal) => {
              const percent =
                goal.target_amount > 0
                  ? Math.min(
                      Math.round((goal.saved_amount / goal.target_amount) * 100),
                      100,
                    )
                  : 0
              const complete = goal.saved_amount >= goal.target_amount

              return (
                <li
                  key={goal.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <button
                    type="button"
                    onClick={() => openEditGoal(goal)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{goal.name}</p>
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          {t('budgets.savedOf', {
                            saved: formatMoney(goal.saved_amount, currency),
                            target: formatMoney(goal.target_amount, currency),
                          })}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-xs font-semibold tabular-nums',
                          complete ? 'text-success' : 'text-muted-foreground',
                        )}
                      >
                        {percent}%
                      </span>
                    </div>
                    <Progress
                      value={percent}
                      tone={complete ? 'success' : 'primary'}
                      label={goal.name}
                      className="mt-3"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {goal.deadline
                          ? deadlineLabel(goal.deadline)
                          : t('budgets.noDeadline')}
                      </span>
                      {complete ? (
                        <span className="font-medium text-success">
                          {t('budgets.goalComplete')}
                        </span>
                      ) : null}
                    </div>
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={complete}
                    onClick={() => setContributeGoal(goal)}
                  >
                    <Plus aria-hidden="true" />
                    {t('budgets.addMoney')}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {budgetSheetOpen ? (
        <BudgetSheet
          open
          onOpenChange={setBudgetSheetOpen}
          categories={expenseCategories}
          takenCategoryIds={takenCategoryIds}
          budget={editingBudget}
          currency={currency}
          spent={editingBudgetSpent}
        />
      ) : null}

      {goalSheetOpen ? (
        <GoalSheet
          open
          onOpenChange={setGoalSheetOpen}
          goal={editingGoal}
          currency={currency}
        />
      ) : null}

      {contributeGoal ? (
        <ContributeSheet
          open
          onOpenChange={closeContribute}
          goal={contributeGoal}
          currency={currency}
        />
      ) : null}
    </div>
  )
}
