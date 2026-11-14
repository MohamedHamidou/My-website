export interface Profile {
  id: string
  email: string | null
  name: string
  currency: string
  locale: string
  month_start_day: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export type CategoryType = 'expense' | 'income'

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  type: CategoryType
  is_default: boolean
  position: number
  created_at: string
}

export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'card' | 'bank'
export type IncomePaymentMethod = Extract<
  PaymentMethod,
  'cash' | 'bkash' | 'bank'
>

export interface Expense {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  date: string
  note: string
  payment_method: PaymentMethod
  home_id?: string | null
  is_common?: boolean
  paid_by?: string | null
  split_rule?: string
  created_at: string
  updated_at: string
}

export interface Income {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  date: string
  note: string
  payment_method: IncomePaymentMethod
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  limit_amount: number
  created_at: string
  updated_at: string
}

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  saved_amount: number
  deadline: string | null
  created_at: string
  updated_at: string
}

export type InventoryCategory =
  | 'kitchen'
  | 'cleaning'
  | 'bathroom'
  | 'food'
  | 'furniture'
  | 'electronics'
  | 'other'

export interface InventoryItem {
  id: string
  user_id: string
  home_id?: string | null
  is_common?: boolean
  name: string
  category: InventoryCategory
  quantity: number
  unit: string
  min_threshold: number
  location: string
  created_at: string
  updated_at: string
}

export interface ShoppingItem {
  id: string
  user_id: string
  home_id?: string | null
  is_common?: boolean
  name: string
  quantity: string
  checked: boolean
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: string
  user_id: string
  expense_id: string
  inventory_item_id: string
  quantity: number
  home_id?: string | null
  is_common?: boolean
  created_at: string
}

export interface StockPurchaseInput {
  item_id: string | null
  name: string
  category: InventoryCategory
  quantity: number
  unit: string
  min_threshold: number
  location: string
  is_common: boolean
  home_id: string | null
}

export type HomeRole = 'owner' | 'member'

export interface Home {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface HomeMember {
  id: string
  home_id: string
  user_id: string
  role: HomeRole
  joined_at: string
  profile?: Profile
}

export type InvitationStatus = 'pending' | 'accepted' | 'cancelled'

export interface HomeInvitation {
  id: string
  home_id: string
  invited_by: string
  email: string | null
  token: string
  status: InvitationStatus
  created_at: string
  expires_at: string
}

