import { useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories'
import {
  categoryColors,
  categoryIconNames,
  getCategoryIcon,
} from '@/lib/category-icons'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/lib/confirm-context'
import type { Category, CategoryType } from '@/types/db'

export function CategoryManager() {
  const { t } = useTranslation()
  const categories = useCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const confirm = useConfirm()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('tag')
  const [color, setColor] = useState(categoryColors[0])
  const [type, setType] = useState<CategoryType>('expense')
  const [error, setError] = useState<string | null>(null)

  const list = categories.data ?? []

  function openAdd() {
    setEditing(null)
    setName('')
    setIcon('tag')
    setColor(categoryColors[0])
    setType('expense')
    setError(null)
    setSheetOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setName(category.name)
    setIcon(category.icon)
    setColor(category.color)
    setType(category.type)
    setError(null)
    setSheetOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError(t('categories.nameError'))
      return
    }

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, name: trimmed, icon, color })
      } else {
        await create.mutateAsync({ name: trimmed, icon, color, type })
      }
      setSheetOpen(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t('categories.saveError'),
      )
    }
  }

  async function onDelete() {
    if (!editing) return
    const confirmed = await confirm({
      title: t('categories.delete'),
      description: t('categories.confirmDelete', { name: editing.name }),
      confirmLabel: t('categories.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    })
    if (!confirmed) return

    try {
      await remove.mutateAsync(editing.id)
      setSheetOpen(false)
    } catch {
      setError(t('categories.inUse'))
    }
  }

  const sameType = list.filter((category) => category.type === type)
  const isPending = create.isPending || update.isPending || remove.isPending

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{t('categories.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('categories.subtitle')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus aria-hidden="true" />
          {t('categories.add')}
        </Button>
      </div>

      {(['expense', 'income'] as const).map((groupType) => {
        const group = list.filter((category) => category.type === groupType)
        return (
          <div key={groupType} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(groupType === 'expense' ? 'categories.expense' : 'categories.income')}
            </p>
            {group.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('categories.none')}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {group.map((category) => {
                  const Icon = getCategoryIcon(category.icon)
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        className="flex w-full items-center gap-3 py-2 text-left"
                      >
                        <span
                          className="flex size-8 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="flex-1 truncate text-sm">{category.name}</span>
                        <Pencil
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? t('categories.edit') : t('categories.add')}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="category-name" className="text-sm font-medium">
              {t('categories.name')}
            </label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </div>

          {!editing ? (
            <div className="space-y-2">
              <label htmlFor="category-type" className="text-sm font-medium">
                {t('categories.type')}
              </label>
              <Select
                id="category-type"
                value={type}
                onChange={(event) => setType(event.target.value as CategoryType)}
              >
                <option value="expense">{t('categories.expense')}</option>
                <option value="income">{t('categories.income')}</option>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <span className="text-sm font-medium">{t('categories.icon')}</span>
            <div className="grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto rounded-md border border-border p-2">
              {categoryIconNames.map((iconName) => {
                const Icon = getCategoryIcon(iconName)
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    aria-pressed={icon === iconName}
                    aria-label={iconName}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-md border',
                      icon === iconName
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">{t('categories.color')}</span>
            <div className="flex flex-wrap gap-2">
              {categoryColors.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  aria-pressed={color === option}
                  aria-label={option}
                  className={cn(
                    'size-8 rounded-full border-2',
                    color === option ? 'border-foreground' : 'border-transparent',
                  )}
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
          </div>

          {error ? (
            <p
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              {t('categories.save')}
            </Button>
            {editing ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={sameType.length <= 1 || remove.isPending}
                onClick={() => void onDelete()}
                aria-label={t('categories.delete')}
                title={
                  sameType.length <= 1 ? t('categories.keepOne') : t('categories.delete')
                }
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </form>
      </Sheet>
    </section>
  )
}
