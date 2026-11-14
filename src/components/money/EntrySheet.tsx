import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Loader2, Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import {
  useCreateExpense,
  useCreateExpenseWithStock,
  useDeleteExpense,
  useUpdateExpense,
} from '@/hooks/useExpenses'
import { useMyHome } from '@/hooks/useHome'
import { useCreateIncome, useDeleteIncome, useUpdateIncome } from '@/hooks/useIncomes'
import { useInventoryItems } from '@/hooks/useInventoryItems'
import { useConfirm } from '@/lib/confirm-context'
import { getCategoryIcon } from '@/lib/category-icons'
import {
  formatQuantity,
  inventoryCategories,
  inventoryLocations,
  inventoryUnits,
  parseQuantity,
} from '@/lib/inventory'
import { parseAmountToMinor } from '@/lib/money'
import {
  expensePaymentMethods,
  incomePaymentMethods,
} from '@/lib/payments'
import { cn } from '@/lib/utils'
import type {
  Category,
  Expense,
  Income,
  IncomePaymentMethod,
  StockPurchaseInput,
} from '@/types/db'

export type EntryType = 'expense' | 'income'
export type Entry = Expense | Income

const inventoryCategoryValues = [
  'kitchen',
  'cleaning',
  'bathroom',
  'food',
  'furniture',
  'electronics',
  'other',
] as const

interface EntrySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: EntryType
  categories: Category[]
  initial?: Entry | null
}

const entrySchema = z.object({
  amount: z
    .string()
    .min(1)
    .refine((value) => {
      const minor = parseAmountToMinor(value)
      return minor !== null && minor > 0
    }, 'Enter an amount greater than zero'),
  categoryId: z.string(),
  date: z.string().min(1),
  note: z.string().max(140),
  paymentMethod: z.enum(['cash', 'bkash', 'nagad', 'card', 'bank']),
  addToStock: z.boolean(),
  stockMode: z.enum(['existing', 'new']),
  stockItemId: z.string(),
  stockQuantity: z.string(),
  stockName: z.string(),
  stockCategory: z.enum(inventoryCategoryValues),
  stockUnitChoice: z.string(),
  stockCustomUnit: z.string(),
  stockLocationChoice: z.string(),
  stockCustomLocation: z.string(),
  stockThreshold: z.string(),
  stockShare: z.boolean(),
})

type EntryValues = z.infer<typeof entrySchema>

export function EntrySheet({
  open,
  onOpenChange,
  type,
  categories,
  initial,
}: EntrySheetProps) {
  const { t } = useTranslation()
  const myHome = useMyHome()
  const home = myHome.data?.home
  const inventory = useInventoryItems()
  const inventoryItems = useMemo(() => inventory.data ?? [], [inventory.data])
  const createExpense = useCreateExpense()
  const createExpenseWithStock = useCreateExpenseWithStock()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()
  const createIncome = useCreateIncome()
  const updateIncome = useUpdateIncome()
  const deleteIncome = useDeleteIncome()
  const confirm = useConfirm()

  const isExpense = type === 'expense'
  const paymentOptions = isExpense
    ? expensePaymentMethods
    : incomePaymentMethods
  const typeCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    setError,
    formState: { errors },
  } = useForm<EntryValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      amount: '',
      categoryId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      note: '',
      paymentMethod: 'cash',
      addToStock: false,
      stockMode: 'new',
      stockItemId: '',
      stockQuantity: '',
      stockName: '',
      stockCategory: 'other',
      stockUnitChoice: 'pcs',
      stockCustomUnit: '',
      stockLocationChoice: '',
      stockCustomLocation: '',
      stockThreshold: '0',
      stockShare: true,
    },
  })

  const selectedCategory = useWatch({ control, name: 'categoryId' })
  const addToStock = useWatch({ control, name: 'addToStock' })
  const stockMode = useWatch({ control, name: 'stockMode' })
  const stockItemId = useWatch({ control, name: 'stockItemId' })
  const stockUnitChoice = useWatch({ control, name: 'stockUnitChoice' })
  const stockLocationChoice = useWatch({ control, name: 'stockLocationChoice' })
  const stockShareValue = useWatch({ control, name: 'stockShare' })
  const selectedStockItem = useMemo(
    () => inventoryItems.find((item) => item.id === stockItemId),
    [inventoryItems, stockItemId],
  )
  const stockShare = selectedStockItem?.is_common ? true : stockShareValue

  useEffect(() => {
    if (!open) return

    if (initial) {
      reset({
        amount: (initial.amount / 100).toString(),
        categoryId: initial.category_id ?? '',
        date: initial.date,
        note: initial.note,
        paymentMethod:
          'payment_method' in initial ? initial.payment_method : 'cash',
        addToStock: false,
        stockMode: 'new',
        stockItemId: '',
        stockQuantity: '',
        stockName: '',
        stockCategory: 'other',
        stockUnitChoice: 'pcs',
        stockCustomUnit: '',
        stockLocationChoice: '',
        stockCustomLocation: '',
        stockThreshold: '0',
        stockShare: true,
      })
      return
    }

    reset({
      amount: '',
      categoryId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      note: '',
      paymentMethod: 'cash',
      addToStock: false,
      stockMode: 'new',
      stockItemId: '',
      stockQuantity: '',
      stockName: '',
      stockCategory: 'other',
      stockUnitChoice: 'pcs',
      stockCustomUnit: '',
      stockLocationChoice: '',
      stockCustomLocation: '',
      stockThreshold: '0',
      stockShare: true,
    })
  }, [open, initial, reset])

  useEffect(() => {
    if (!open || initial || selectedCategory) return
    const first = typeCategories[0]
    if (first) setValue('categoryId', first.id)
  }, [open, initial, selectedCategory, typeCategories, setValue])

  const isPending =
    createExpense.isPending ||
    createExpenseWithStock.isPending ||
    updateExpense.isPending ||
    createIncome.isPending ||
    updateIncome.isPending ||
    deleteExpense.isPending ||
    deleteIncome.isPending

  function buildStockPurchase(values: EntryValues): StockPurchaseInput {
    const quantity = parseQuantity(values.stockQuantity)
    if (quantity === null || quantity <= 0) {
      throw new Error(t('entries.stock.quantityError'))
    }

    const share = home
      ? selectedStockItem?.is_common
        ? true
        : values.stockShare
      : false
    const stockHomeId = share ? home?.id ?? null : null

    if (values.stockMode === 'existing') {
      if (!selectedStockItem) {
        throw new Error(t('entries.stock.itemError'))
      }

      return {
        item_id: selectedStockItem.id,
        name: selectedStockItem.name,
        category: selectedStockItem.category,
        quantity,
        unit: selectedStockItem.unit,
        min_threshold: selectedStockItem.min_threshold,
        location: selectedStockItem.location,
        is_common: share,
        home_id: stockHomeId,
      }
    }

    const name = values.stockName.trim()
    if (name.length < 2) {
      throw new Error(t('entries.stock.nameError'))
    }

    const unit =
      values.stockUnitChoice === '__other'
        ? values.stockCustomUnit.trim()
        : values.stockUnitChoice
    if (!unit) {
      throw new Error(t('entries.stock.unitError'))
    }

    const location =
      values.stockLocationChoice === '__other'
        ? values.stockCustomLocation.trim()
        : values.stockLocationChoice
    if (values.stockLocationChoice === '__other' && !location) {
      throw new Error(t('entries.stock.locationError'))
    }

    const threshold = parseQuantity(values.stockThreshold)
    if (threshold === null) {
      throw new Error(t('entries.stock.thresholdError'))
    }

    return {
      item_id: null,
      name,
      category: values.stockCategory,
      quantity,
      unit,
      min_threshold: threshold,
      location,
      is_common: share,
      home_id: stockHomeId,
    }
  }

  async function onSubmit(values: EntryValues) {
    const amount = parseAmountToMinor(values.amount)
    if (amount === null) return

    const payload = {
      amount,
      category_id: values.categoryId || null,
      date: values.date,
      note: values.note.trim(),
    }

    try {
      if (initial) {
        if (isExpense) {
          await updateExpense.mutateAsync({
            id: initial.id,
            ...payload,
            payment_method: values.paymentMethod,
          })
        } else {
          await updateIncome.mutateAsync({
            id: initial.id,
            ...payload,
            payment_method: values.paymentMethod as IncomePaymentMethod,
          })
        }
      } else if (isExpense) {
        if (values.addToStock) {
          const stock = buildStockPurchase(values)
          await createExpenseWithStock.mutateAsync({
            expense: {
              ...payload,
              payment_method: values.paymentMethod,
              home_id: stock.home_id,
              is_common: stock.is_common,
            },
            stock,
          })
        } else {
          await createExpense.mutateAsync({
            ...payload,
            payment_method: values.paymentMethod,
          })
        }
      } else {
        await createIncome.mutateAsync({
          ...payload,
          payment_method: values.paymentMethod as IncomePaymentMethod,
        })
      }

      onOpenChange(false)
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Could not save',
      })
    }
  }

  async function onDelete() {
    if (!initial) return
    const confirmed = await confirm({
      title: t('entries.delete'),
      description: t('entries.confirmDelete'),
      confirmLabel: t('entries.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    })
    if (!confirmed) return

    try {
      if (isExpense) {
        await deleteExpense.mutateAsync(initial.id)
      } else {
        await deleteIncome.mutateAsync(initial.id)
      }
      onOpenChange(false)
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Could not delete',
      })
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        initial
          ? t(isExpense ? 'entries.editExpense' : 'entries.editIncome')
          : t(isExpense ? 'entries.addExpense' : 'entries.addIncome')
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <label htmlFor="entry-amount" className="text-sm font-medium">
            {t('entries.amount')}
          </label>
          <Input
            id="entry-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            className="h-14 text-2xl font-semibold tabular-nums"
            aria-invalid={Boolean(errors.amount)}
            {...register('amount')}
          />
          {errors.amount ? (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">{t('entries.category')}</span>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {typeCategories.map((category) => {
              const Icon = getCategoryIcon(category.icon)
              const active = selectedCategory === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setValue('categoryId', category.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                    active
                      ? 'border-transparent text-white'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                  style={active ? { backgroundColor: category.color } : undefined}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {category.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="entry-date" className="text-sm font-medium">
              {t('entries.date')}
            </label>
            <Input id="entry-date" type="date" {...register('date')} />
          </div>

          <div className="space-y-2">
            <label htmlFor="entry-payment" className="text-sm font-medium">
              {t(isExpense ? 'entries.paidWith' : 'entries.receivedIn')}
            </label>
            <Select id="entry-payment" {...register('paymentMethod')}>
              {paymentOptions.map((method) => (
                <option key={method} value={method}>
                  {t(`entries.payment.${method}`)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="entry-note" className="text-sm font-medium">
            {t('entries.note')}
          </label>
          <Input
            id="entry-note"
            autoComplete="off"
            placeholder={t('entries.notePlaceholder')}
            {...register('note')}
          />
        </div>

        {isExpense && !initial ? (
          <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
            <label className="flex items-start gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={addToStock}
                onChange={(event) =>
                  setValue('addToStock', event.target.checked)
                }
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>
                <span className="block">{t('entries.stock.addToStock')}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {t('entries.stock.addToStockHint')}
                </span>
              </span>
            </label>

            {addToStock ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="stock-target" className="text-sm font-medium">
                    {t('entries.stock.target')}
                  </label>
                  <Select
                    id="stock-target"
                    value={stockMode}
                    onChange={(event) => {
                      setValue(
                        'stockMode',
                        event.target.value as 'existing' | 'new',
                      )
                      setValue('stockItemId', '')
                    }}
                  >
                    <option value="new">{t('entries.stock.newItem')}</option>
                    <option value="existing" disabled={inventoryItems.length === 0}>
                      {t('entries.stock.existingItem')}
                    </option>
                  </Select>
                </div>

                {stockMode === 'existing' ? (
                  inventoryItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t('entries.stock.noItems')}
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label
                          htmlFor="stock-item"
                          className="text-sm font-medium"
                        >
                          {t('entries.stock.item')}
                        </label>
                        <Select
                          id="stock-item"
                          value={stockItemId}
                          onChange={(event) =>
                            setValue('stockItemId', event.target.value)
                          }
                        >
                          <option value="">
                            {t('entries.stock.chooseItem')}
                          </option>
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({formatQuantity(item.quantity)}{' '}
                              {item.unit})
                            </option>
                          ))}
                        </Select>
                      </div>

                      {selectedStockItem ? (
                        <p className="text-xs text-muted-foreground">
                          {t('entries.stock.current', {
                            quantity: formatQuantity(selectedStockItem.quantity),
                            unit: selectedStockItem.unit,
                          })}
                        </p>
                      ) : null}

                      <div className="space-y-2">
                        <label
                          htmlFor="stock-quantity"
                          className="text-sm font-medium"
                        >
                          {t('entries.stock.quantityToAdd')}
                        </label>
                        <Input
                          id="stock-quantity"
                          inputMode="decimal"
                          autoComplete="off"
                          className="tabular-nums"
                          {...register('stockQuantity')}
                        />
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <div className="space-y-2">
                      <label
                        htmlFor="stock-name"
                        className="text-sm font-medium"
                      >
                        {t('inventory.name')}
                      </label>
                      <Input
                        id="stock-name"
                        autoComplete="off"
                        placeholder={t('inventory.namePlaceholder')}
                        {...register('stockName')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="stock-category"
                        className="text-sm font-medium"
                      >
                        {t('inventory.category')}
                      </label>
                      <Select
                        id="stock-category"
                        {...register('stockCategory')}
                      >
                        {inventoryCategories.map((option) => (
                          <option key={option.value} value={option.value}>
                            {t(option.labelKey)}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label
                          htmlFor="stock-new-quantity"
                          className="text-sm font-medium"
                        >
                          {t('inventory.quantity')}
                        </label>
                        <Input
                          id="stock-new-quantity"
                          inputMode="decimal"
                          autoComplete="off"
                          className="tabular-nums"
                          {...register('stockQuantity')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="stock-unit"
                          className="text-sm font-medium"
                        >
                          {t('inventory.unit')}
                        </label>
                        <Select
                          id="stock-unit"
                          value={stockUnitChoice}
                          onChange={(event) =>
                            setValue('stockUnitChoice', event.target.value)
                          }
                        >
                          {inventoryUnits.map((option) => (
                            <option key={option.value} value={option.value}>
                              {t(option.labelKey)}
                            </option>
                          ))}
                          <option value="__other">
                            {t('inventory.unitOther')}
                          </option>
                        </Select>
                        {stockUnitChoice === '__other' ? (
                          <Input
                            aria-label={t('inventory.customUnit')}
                            placeholder={t('inventory.customUnit')}
                            {...register('stockCustomUnit')}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="stock-threshold"
                        className="text-sm font-medium"
                      >
                        {t('inventory.minThreshold')}
                      </label>
                      <Input
                        id="stock-threshold"
                        inputMode="decimal"
                        autoComplete="off"
                        className="tabular-nums"
                        {...register('stockThreshold')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="stock-location"
                        className="text-sm font-medium"
                      >
                        {t('inventory.location')}
                      </label>
                      <Select
                        id="stock-location"
                        value={stockLocationChoice}
                        onChange={(event) =>
                          setValue('stockLocationChoice', event.target.value)
                        }
                      >
                        {inventoryLocations.map((option) => (
                          <option
                            key={option.value || 'none'}
                            value={option.value}
                          >
                            {t(option.labelKey)}
                          </option>
                        ))}
                        <option value="__other">
                          {t('inventory.locationOther')}
                        </option>
                      </Select>
                      {stockLocationChoice === '__other' ? (
                        <Input
                          aria-label={t('inventory.customLocation')}
                          placeholder={t('inventory.customLocation')}
                          {...register('stockCustomLocation')}
                        />
                      ) : null}
                    </div>
                  </>
                )}

                {home ? (
                  <div className="space-y-1.5 rounded-md border border-border bg-card p-3">
                    <label className="flex items-start gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={stockShare}
                        disabled={Boolean(selectedStockItem?.is_common)}
                        onChange={(event) =>
                          setValue('stockShare', event.target.checked)
                        }
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span>{t('entries.stock.shareWithHome')}</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {selectedStockItem?.is_common
                        ? t('entries.stock.alreadyShared', { home: home.name })
                        : t('entries.stock.shareHint', { home: home.name })}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {errors.root ? (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {errors.root.message}
          </p>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {initial ? t('entries.save') : t('entries.add')}
          </Button>
          {initial ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isPending}
              onClick={() => void onDelete()}
              aria-label={t('entries.delete')}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          ) : null}
        </div>

      </form>
    </Sheet>
  )
}
