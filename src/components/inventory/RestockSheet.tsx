import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { useCreateExpense } from '@/hooks/useExpenses'
import { useUpdateInventoryItem } from '@/hooks/useInventoryItems'
import { formatQuantity, parseQuantity } from '@/lib/inventory'
import { parseAmountToMinor } from '@/lib/money'
import { toDateParam } from '@/lib/periods'
import type { Category, InventoryItem } from '@/types/db'

interface RestockSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem
  expenseCategories: Category[]
}

export function RestockSheet({
  open,
  onOpenChange,
  item,
  expenseCategories,
}: RestockSheetProps) {
  const { t } = useTranslation()
  const updateItem = useUpdateInventoryItem()
  const createExpense = useCreateExpense()

  const [quantity, setQuantity] = useState(() =>
    formatQuantity(item.quantity + 1),
  )
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(
    () =>
      expenseCategories.find((category) => category.name === 'Household items')
        ?.id ??
      expenseCategories[0]?.id ??
      '',
  )
  const [error, setError] = useState<string | null>(null)

  const isPending = updateItem.isPending || createExpense.isPending
  const loggingExpense = amount.trim().length > 0

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()

    const parsedQuantity = parseQuantity(quantity)
    if (parsedQuantity === null) {
      setError(t('inventory.quantityError'))
      return
    }

    let expenseAmount: number | null = null
    if (loggingExpense) {
      expenseAmount = parseAmountToMinor(amount)
      if (expenseAmount === null || expenseAmount <= 0) {
        setError(t('inventory.amountError'))
        return
      }
    }

    try {
      await updateItem.mutateAsync({ id: item.id, quantity: parsedQuantity })

      if (expenseAmount !== null) {
        await createExpense.mutateAsync({
          amount: expenseAmount,
          category_id: categoryId || null,
          date: toDateParam(new Date()),
          note: item.name,
          payment_method: 'cash',
        })
      }

      onOpenChange(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('inventory.saveError'),
      )
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('inventory.shopping.restockTitle', { name: item.name })}
      description={t('inventory.shopping.current', {
        quantity: formatQuantity(item.quantity),
        unit: item.unit,
        min: formatQuantity(item.min_threshold),
      })}
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="restock-quantity" className="text-sm font-medium">
            {t('inventory.shopping.newQuantity')}
          </label>
          <Input
            id="restock-quantity"
            inputMode="decimal"
            autoComplete="off"
            className="text-xl font-semibold tabular-nums"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="restock-amount" className="text-sm font-medium">
            {t('inventory.shopping.logExpense')}
          </label>
          <Input
            id="restock-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            className="tabular-nums"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        {loggingExpense ? (
          <div className="space-y-2">
            <label htmlFor="restock-category" className="text-sm font-medium">
              {t('entries.category')}
            </label>
            <Select
              id="restock-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {error ? (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : null}
          {t('inventory.shopping.restock')}
        </Button>
      </form>
    </Sheet>
  )
}
