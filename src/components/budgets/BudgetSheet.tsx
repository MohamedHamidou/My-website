import { useMemo, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { useDeleteBudget, useSetBudget } from '@/hooks/useBudgets'
import { useConfirm } from '@/lib/confirm-context'
import { formatMoney, parseAmountToMinor } from '@/lib/money'
import type { Budget, Category } from '@/types/db'

interface BudgetSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  takenCategoryIds: string[]
  budget: Budget | null
  currency: string
  spent?: number
}

export function BudgetSheet({
  open,
  onOpenChange,
  categories,
  takenCategoryIds,
  budget,
  currency,
  spent,
}: BudgetSheetProps) {
  const { t } = useTranslation()
  const setBudget = useSetBudget()
  const deleteBudget = useDeleteBudget()
  const confirm = useConfirm()

  const available = useMemo(
    () =>
      categories.filter((category) => !takenCategoryIds.includes(category.id)),
    [categories, takenCategoryIds],
  )

  const [categoryId, setCategoryId] = useState(
    () => budget?.category_id ?? available[0]?.id ?? '',
  )
  const [limit, setLimit] = useState(() =>
    budget ? (budget.limit_amount / 100).toString() : '',
  )
  const [error, setError] = useState<string | null>(null)

  const selected = categories.find((category) => category.id === categoryId)
  const isPending = setBudget.isPending || deleteBudget.isPending

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()

    const amount = parseAmountToMinor(limit)
    if (amount === null || amount <= 0) {
      setError(t('budgets.amountError'))
      return
    }

    if (!categoryId) {
      setError(t('budgets.chooseCategory'))
      return
    }

    try {
      await setBudget.mutateAsync({
        category_id: categoryId,
        limit_amount: amount,
      })
      onOpenChange(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('budgets.saveError'),
      )
    }
  }

  async function onDelete() {
    if (!budget || !selected) return
    const confirmed = await confirm({
      title: t('budgets.deleteBudget'),
      description: t('budgets.confirmDeleteBudget', { name: selected.name }),
      confirmLabel: t('budgets.deleteBudget'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    })
    if (!confirmed) return

    try {
      await deleteBudget.mutateAsync(budget.id)
      onOpenChange(false)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t('budgets.saveError'),
      )
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t(budget ? 'budgets.editBudget' : 'budgets.addBudget')}
    >
      {available.length === 0 && !budget ? (
        <p className="text-sm text-muted-foreground">{t('budgets.noCategories')}</p>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="budget-category" className="text-sm font-medium">
              {t('entries.category')}
            </label>
            <Select
              id="budget-category"
              value={categoryId}
              disabled={Boolean(budget)}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {(budget ? categories : available).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="budget-limit" className="text-sm font-medium">
              {t('budgets.limit')}
            </label>
            <Input
              id="budget-limit"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              className="text-xl font-semibold tabular-nums"
              aria-invalid={Boolean(error)}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
            {spent !== undefined ? (
              <p className="text-xs text-muted-foreground">
                {t('budgets.spentSoFar', {
                  amount: formatMoney(spent, currency),
                })}
              </p>
            ) : null}
          </div>

          {error ? (
            <p
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              {t('entries.save')}
            </Button>
            {budget ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isPending}
                onClick={() => void onDelete()}
                aria-label={t('budgets.deleteBudget')}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </Sheet>
  )
}
