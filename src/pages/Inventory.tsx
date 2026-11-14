import { useCallback, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Minus,
  Package,
  Plus,
  ShoppingBasket,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ItemSheet } from '@/components/inventory/ItemSheet'
import { RestockSheet } from '@/components/inventory/RestockSheet'
import { ShoppingItemSheet } from '@/components/inventory/ShoppingItemSheet'
import { Button } from '@/components/ui/button'
import { useCategories } from '@/hooks/useCategories'
import {
  useInventoryItems,
  useUpdateInventoryItem,
} from '@/hooks/useInventoryItems'
import {
  useClearBoughtShoppingItems,
  useDeleteShoppingItem,
  useShoppingItems,
  useToggleShoppingItem,
} from '@/hooks/useShoppingItems'
import {
  formatQuantity,
  getInventoryLocationLabelKey,
  getInventoryUnitLabelKey,
  inventoryCategories,
  isLowStock,
} from '@/lib/inventory'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/lib/confirm-context'
import type { InventoryItem, ShoppingItem } from '@/types/db'

type View = 'stock' | 'shopping'

export function InventoryPage() {
  const { t } = useTranslation()
  const items = useInventoryItems()
  const shopping = useShoppingItems()
  const categories = useCategories()
  const updateItem = useUpdateInventoryItem()
  const toggleShopping = useToggleShoppingItem()
  const deleteShopping = useDeleteShoppingItem()
  const clearBought = useClearBoughtShoppingItems()
  const confirm = useConfirm()

  const [view, setView] = useState<View>('stock')
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null)
  const [shoppingSheetOpen, setShoppingSheetOpen] = useState(false)

  const closeRestock = useCallback((open: boolean) => {
    if (!open) setRestockItem(null)
  }, [])

  const allItems = useMemo(() => items.data ?? [], [items.data])
  const shoppingList = shopping.data ?? []
  const activeShopping = shoppingList.filter((item) => !item.checked)
  const boughtShopping = shoppingList.filter((item) => item.checked)

  const lowItems = useMemo(
    () =>
      allItems
        .filter(isLowStock)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allItems],
  )

  const groups = useMemo(
    () =>
      inventoryCategories
        .map((category) => ({
          category,
          items: allItems.filter((item) => item.category === category.value),
        }))
        .filter((group) => group.items.length > 0),
    [allItems],
  )

  const expenseCategories = useMemo(
    () =>
      (categories.data ?? []).filter((category) => category.type === 'expense'),
    [categories.data],
  )

  const shoppingCount = lowItems.length + activeShopping.length
  const itemsLoading = items.isLoading
  const shoppingLoading = shopping.isLoading || items.isLoading

  function openAddItem() {
    setEditingItem(null)
    setItemSheetOpen(true)
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item)
    setItemSheetOpen(true)
  }

  function adjustQuantity(item: InventoryItem, delta: number) {
    const next = Math.round((item.quantity + delta) * 100) / 100
    if (next < 0 || next === item.quantity) return
    updateItem.mutate({ id: item.id, quantity: next })
  }

  async function onRemoveShopping(item: ShoppingItem) {
    const confirmed = await confirm({
      title: t('inventory.shopping.removeTitle'),
      description: t('inventory.shopping.confirmDelete', { name: item.name }),
      confirmLabel: t('inventory.shopping.remove', { name: item.name }),
      cancelLabel: t('common.cancel'),
      destructive: true,
    })
    if (!confirmed) return
    deleteShopping.mutate(item.id)
  }

  async function onClearBought() {
    const confirmed = await confirm({
      title: t('inventory.shopping.clearBought'),
      description: t('inventory.shopping.confirmClearBought'),
      confirmLabel: t('inventory.shopping.clearBought'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    })
    if (!confirmed) return
    clearBought.mutate()
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{t('inventory.title')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('inventory.subtitle')}
          </p>
        </div>
        {view === 'stock' ? (
          <Button size="sm" onClick={openAddItem}>
            <Plus aria-hidden="true" />
            {t('inventory.addItem')}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setShoppingSheetOpen(true)}>
            <Plus aria-hidden="true" />
            {t('inventory.shopping.add')}
          </Button>
        )}
      </header>

      <div
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
        role="tablist"
        aria-label={t('inventory.title')}
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === 'stock'}
          onClick={() => setView('stock')}
          className={cn(
            'flex h-9 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors',
            view === 'stock'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground',
          )}
        >
          {t('inventory.stockTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'shopping'}
          onClick={() => setView('shopping')}
          className={cn(
            'flex h-9 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors',
            view === 'shopping'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground',
          )}
        >
          {t('inventory.shoppingTab')}
          {shoppingCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold tabular-nums text-primary">
              {shoppingCount}
            </span>
          ) : null}
        </button>
      </div>

      {view === 'stock' ? (
        itemsLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </p>
        ) : allItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t('inventory.emptyTitle')}
            description={t('inventory.empty')}
            action={{ label: t('inventory.emptyAction'), onClick: openAddItem }}
          />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {t('inventory.itemsCount', { count: allItems.length })}
              </span>
              {lowItems.length > 0 ? (
                <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                  {t('inventory.lowCount', { count: lowItems.length })}
                </span>
              ) : null}
            </div>

            {groups.map((group) => {
              const CategoryIcon = group.category.icon

              return (
                <section key={group.category.value}>
                  <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(group.category.labelKey)}
                    <span className="font-normal tabular-nums">
                      {group.items.length}
                    </span>
                  </h2>
                  <ul className="space-y-2">
                    {group.items.map((item) => {
                      const low = isLowStock(item)
                      const out = item.quantity <= 0
                      const unitLabelKey = getInventoryUnitLabelKey(item.unit)
                      const unitLabel = unitLabelKey
                        ? t(unitLabelKey)
                        : item.unit
                      const locationLabelKey = getInventoryLocationLabelKey(
                        item.location,
                      )
                      const locationLabel = locationLabelKey
                        ? t(locationLabelKey)
                        : item.location || t('inventory.noLocation')

                      return (
                        <li
                          key={item.id}
                          className="rounded-xl border border-border bg-card px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditItem(item)}
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                            >
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <CategoryIcon className="size-5" aria-hidden="true" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="truncate text-sm font-medium">
                                    {item.name}
                                  </span>
                                  {item.is_common ? (
                                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                      {t('inventory.shared')}
                                    </span>
                                  ) : null}
                                  {low ? (
                                    <span
                                      className={cn(
                                        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                        out
                                          ? 'bg-destructive/10 text-destructive'
                                          : 'bg-warning/10 text-warning',
                                      )}
                                    >
                                      {out
                                        ? t('inventory.outOfStock')
                                        : t('inventory.low')}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="mt-0.5 block truncate text-xs tabular-nums text-muted-foreground">
                                  {formatQuantity(item.quantity)} {unitLabel}
                                  {' · '}
                                  {locationLabel}
                                </span>
                              </span>
                            </button>

                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-9"
                                aria-label={t('inventory.decrease', {
                                  name: item.name,
                                })}
                                disabled={updateItem.isPending || item.quantity <= 0}
                                onClick={() => adjustQuantity(item, -1)}
                              >
                                <Minus aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-9"
                                aria-label={t('inventory.increase', {
                                  name: item.name,
                                })}
                                disabled={updateItem.isPending}
                                onClick={() => adjustQuantity(item, 1)}
                              >
                                <Plus aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        )
      ) : shoppingLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t('common.loading')}
        </p>
      ) : shoppingList.length === 0 && lowItems.length === 0 ? (
        <EmptyState
          icon={ShoppingBasket}
          title={t('inventory.shopping.emptyTitle')}
          description={t('inventory.shopping.empty')}
          action={{
            label: t('inventory.shopping.add'),
            onClick: () => setShoppingSheetOpen(true),
          }}
        />
      ) : (
        <div className="space-y-6">
          <section className="space-y-2">
            <div>
              <h2 className="text-base font-semibold">
                {t('inventory.shopping.lowTitle')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('inventory.shopping.lowHint')}
              </p>
            </div>

            {lowItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                {t('inventory.shopping.nothingLow')}
              </p>
            ) : (
              <ul className="space-y-2">
                {lowItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                      <AlertTriangle className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        {item.is_common ? (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {t('inventory.shared')}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {t('inventory.shopping.lowMeta', {
                          quantity: formatQuantity(item.quantity),
                          unit: item.unit,
                          min: formatQuantity(item.min_threshold),
                        })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRestockItem(item)}
                    >
                      {t('inventory.shopping.boughtAction')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  {t('inventory.shopping.manualTitle')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t('inventory.shopping.manualHint')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShoppingSheetOpen(true)}
              >
                <Plus aria-hidden="true" />
                {t('inventory.shopping.add')}
              </Button>
            </div>

            {activeShopping.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                {t('inventory.shopping.nothingManual')}
              </p>
            ) : (
              <ul className="space-y-2">
                {activeShopping.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-1 rounded-xl border border-border bg-card pr-1"
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() =>
                          toggleShopping.mutate({
                            id: item.id,
                            checked: true,
                          })
                        }
                        disabled={toggleShopping.isPending}
                        className="size-5 shrink-0 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {item.name}
                        </span>
                        {item.quantity || item.is_common ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.quantity}
                            {item.quantity && item.is_common ? ' · ' : null}
                            {item.is_common ? t('inventory.shared') : null}
                          </span>
                        ) : null}
                      </span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      aria-label={t('inventory.shopping.remove', {
                        name: item.name,
                      })}
                      disabled={deleteShopping.isPending}
                      onClick={() => void onRemoveShopping(item)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {boughtShopping.length > 0 ? (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">
                  {t('inventory.shopping.bought')}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={clearBought.isPending}
                  onClick={() => void onClearBought()}
                >
                  {t('inventory.shopping.clearBought')}
                </Button>
              </div>
              <ul className="space-y-2">
                {boughtShopping.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-1 rounded-xl border border-border bg-card pr-1"
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() =>
                          toggleShopping.mutate({
                            id: item.id,
                            checked: false,
                          })
                        }
                        disabled={toggleShopping.isPending}
                        className="size-5 shrink-0 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-muted-foreground line-through">
                          {item.name}
                        </span>
                        {item.quantity || item.is_common ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.quantity}
                            {item.quantity && item.is_common ? ' · ' : null}
                            {item.is_common ? t('inventory.shared') : null}
                          </span>
                        ) : null}
                      </span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      aria-label={t('inventory.shopping.remove', {
                        name: item.name,
                      })}
                      disabled={deleteShopping.isPending}
                      onClick={() => void onRemoveShopping(item)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      {itemSheetOpen ? (
        <ItemSheet
          open
          onOpenChange={setItemSheetOpen}
          item={editingItem}
        />
      ) : null}

      {restockItem ? (
        <RestockSheet
          open
          onOpenChange={closeRestock}
          item={restockItem}
          expenseCategories={expenseCategories}
        />
      ) : null}

      {shoppingSheetOpen ? (
        <ShoppingItemSheet
          open
          onOpenChange={setShoppingSheetOpen}
        />
      ) : null}
    </div>
  )
}
