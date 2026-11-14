import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import {
  useContributeToSavingsGoal,
  useCreateSavingsGoal,
  useDeleteSavingsGoal,
  useUpdateSavingsGoal,
} from '@/hooks/useSavingsGoals'
import { formatMoney, parseAmountToMinor } from '@/lib/money'
import { useConfirm } from '@/lib/confirm-context'
import type { SavingsGoal } from '@/types/db'

interface GoalSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: SavingsGoal | null
  currency: string
}

export function GoalSheet({ open, onOpenChange, goal, currency }: GoalSheetProps) {
  const { t } = useTranslation()
  const create = useCreateSavingsGoal()
  const update = useUpdateSavingsGoal()
  const remove = useDeleteSavingsGoal()
  const confirm = useConfirm()

  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(() =>
    goal ? (goal.target_amount / 100).toString() : '',
  )
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [error, setError] = useState<string | null>(null)

  const isPending = create.isPending || update.isPending || remove.isPending

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()

    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError(t('budgets.nameError'))
      return
    }

    const amount = parseAmountToMinor(target)
    if (amount === null || amount <= 0) {
      setError(t('budgets.targetError'))
      return
    }

    const payload = {
      name: trimmed,
      target_amount: amount,
      deadline: deadline || null,
    }

    try {
      if (goal) {
        await update.mutateAsync({ id: goal.id, ...payload })
      } else {
        await create.mutateAsync(payload)
      }
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
    if (!goal) return
    const confirmed = await confirm({
      title: t('budgets.deleteGoal'),
      description: t('budgets.confirmDeleteGoal', { name: goal.name }),
      confirmLabel: t('budgets.deleteGoal'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    })
    if (!confirmed) return

    try {
      await remove.mutateAsync(goal.id)
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
      title={t(goal ? 'budgets.editGoal' : 'budgets.addGoal')}
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="goal-name" className="text-sm font-medium">
            {t('budgets.goalName')}
          </label>
          <Input
            id="goal-name"
            autoComplete="off"
            placeholder={t('budgets.goalNamePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="goal-target" className="text-sm font-medium">
            {t('budgets.targetAmount')}
          </label>
          <Input
            id="goal-target"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            className="tabular-nums"
            aria-invalid={Boolean(error)}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          {goal ? (
            <p className="text-xs text-muted-foreground">
              {t('budgets.goalSaved', {
                amount: formatMoney(goal.saved_amount, currency),
              })}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="goal-deadline" className="text-sm font-medium">
            {t('budgets.deadline')}
          </label>
          <Input
            id="goal-deadline"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t('budgets.deadlineOptional')}
          </p>
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
          {goal ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isPending}
              onClick={() => void onDelete()}
              aria-label={t('budgets.deleteGoal')}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </form>
    </Sheet>
  )
}

interface ContributeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: SavingsGoal
  currency: string
}

export function ContributeSheet({
  open,
  onOpenChange,
  goal,
  currency,
}: ContributeSheetProps) {
  const { t } = useTranslation()
  const contribute = useContributeToSavingsGoal()

  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()

    const minor = parseAmountToMinor(amount)
    if (minor === null || minor <= 0) {
      setError(t('budgets.amountError'))
      return
    }

    try {
      await contribute.mutateAsync({ id: goal.id, amount: minor })
      onOpenChange(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('budgets.saveError'),
      )
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('budgets.addToGoal', { name: goal.name })}
      description={t('budgets.savedOf', {
        saved: formatMoney(goal.saved_amount, currency),
        target: formatMoney(goal.target_amount, currency),
      })}
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="goal-amount" className="text-sm font-medium">
            {t('budgets.goalAmount')}
          </label>
          <Input
            id="goal-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            className="h-14 text-2xl font-semibold tabular-nums"
            aria-invalid={Boolean(error)}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        {error ? (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={contribute.isPending}>
          {contribute.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : null}
          {t('budgets.addMoney')}
        </Button>
      </form>
    </Sheet>
  )
}
