import {
  Bath,
  Boxes,
  CookingPot,
  Plug,
  Sofa,
  SprayCan,
  Wheat,
  type LucideIcon,
} from 'lucide-react'

import type { InventoryCategory, InventoryItem } from '@/types/db'

export interface InventoryCategoryOption {
  value: InventoryCategory
  labelKey: string
  icon: LucideIcon
}

export const inventoryCategories: InventoryCategoryOption[] = [
  { value: 'kitchen', labelKey: 'inventory.categories.kitchen', icon: CookingPot },
  { value: 'cleaning', labelKey: 'inventory.categories.cleaning', icon: SprayCan },
  { value: 'bathroom', labelKey: 'inventory.categories.bathroom', icon: Bath },
  { value: 'food', labelKey: 'inventory.categories.food', icon: Wheat },
  { value: 'furniture', labelKey: 'inventory.categories.furniture', icon: Sofa },
  { value: 'electronics', labelKey: 'inventory.categories.electronics', icon: Plug },
  { value: 'other', labelKey: 'inventory.categories.other', icon: Boxes },
]

export function getInventoryCategory(
  value: InventoryCategory,
): InventoryCategoryOption {
  return (
    inventoryCategories.find((category) => category.value === value) ??
    inventoryCategories[inventoryCategories.length - 1]
  )
}

export interface InventoryUnitOption {
  value: string
  labelKey: string
}

export const inventoryUnits: InventoryUnitOption[] = [
  { value: 'pcs', labelKey: 'inventory.units.pcs' },
  { value: 'kg', labelKey: 'inventory.units.kg' },
  { value: 'g', labelKey: 'inventory.units.g' },
  { value: 'L', labelKey: 'inventory.units.l' },
  { value: 'mL', labelKey: 'inventory.units.ml' },
  { value: 'pack', labelKey: 'inventory.units.pack' },
  { value: 'box', labelKey: 'inventory.units.box' },
  { value: 'bottle', labelKey: 'inventory.units.bottle' },
  { value: 'can', labelKey: 'inventory.units.can' },
  { value: 'bag', labelKey: 'inventory.units.bag' },
  { value: 'roll', labelKey: 'inventory.units.roll' },
  { value: 'pair', labelKey: 'inventory.units.pair' },
  { value: 'dozen', labelKey: 'inventory.units.dozen' },
]

export interface InventoryLocationOption {
  value: string
  labelKey: string
}

export const inventoryLocations: InventoryLocationOption[] = [
  { value: '', labelKey: 'inventory.noLocation' },
  { value: 'pantry', labelKey: 'inventory.locations.pantry' },
  { value: 'fridge', labelKey: 'inventory.locations.fridge' },
  { value: 'freezer', labelKey: 'inventory.locations.freezer' },
  { value: 'kitchen_shelf', labelKey: 'inventory.locations.kitchenShelf' },
  { value: 'kitchen_cabinet', labelKey: 'inventory.locations.kitchenCabinet' },
  { value: 'countertop', labelKey: 'inventory.locations.countertop' },
  { value: 'under_sink', labelKey: 'inventory.locations.underSink' },
  { value: 'bathroom_cabinet', labelKey: 'inventory.locations.bathroomCabinet' },
  { value: 'laundry', labelKey: 'inventory.locations.laundry' },
  { value: 'storage', labelKey: 'inventory.locations.storage' },
  { value: 'garage', labelKey: 'inventory.locations.garage' },
]

export function getInventoryUnitLabelKey(value: string): string | null {
  return inventoryUnits.find((option) => option.value === value)?.labelKey ?? null
}

export function getInventoryLocationLabelKey(value: string): string | null {
  return (
    inventoryLocations.find((option) => option.value === value)?.labelKey ?? null
  )
}

export function isLowStock(
  item: Pick<InventoryItem, 'quantity' | 'min_threshold'>,
): boolean {
  return item.quantity <= item.min_threshold
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value)
}

export function parseQuantity(input: string): number | null {
  const normalized = input.replace(/,/g, '.').trim()
  if (!normalized) return 0

  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return null

  return Math.round(value * 100) / 100
}
