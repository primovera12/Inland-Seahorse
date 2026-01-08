// Quote domain types
import type { LocationName, CostField } from './equipment'

export const QUOTE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
] as const

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
}

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'text-gray-600 bg-gray-50 dark:bg-gray-900 dark:text-gray-400',
  sent: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  viewed: 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400',
  accepted: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
  rejected: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
  expired: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400',
}

export interface QuoteStatusHistory {
  id: string
  quote_id: string
  quote_type: 'dismantle' | 'inland'
  previous_status: QuoteStatus | null
  new_status: QuoteStatus
  changed_by: string
  changed_by_name?: string
  notes?: string
  created_at: string
}

export interface QuoteData {
  id?: string
  quote_number: string
  status: QuoteStatus

  // Customer info
  customer_id?: string
  company_id?: string
  contact_id?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  customer_company?: string

  // Billing info
  billing_address?: string
  billing_city?: string
  billing_state?: string
  billing_zip?: string
  payment_terms?: string

  // Equipment
  make_id?: string
  model_id?: string
  make_name: string
  model_name: string
  location: LocationName

  // Dimensions
  length_inches?: number
  width_inches?: number
  height_inches?: number
  weight_lbs?: number

  // Images
  front_image_url?: string
  side_image_url?: string

  // Costs (all in cents)
  costs: Record<CostField, number>
  enabled_costs: Record<CostField, boolean>
  cost_overrides: Record<CostField, number | null>
  cost_descriptions: Record<CostField, string>

  // Pricing
  subtotal: number // cents
  margin_percentage: number
  margin_amount: number // cents
  total: number // cents

  // Miscellaneous fees
  miscellaneous_fees: MiscellaneousFee[]

  // Notes
  internal_notes?: string
  quote_notes?: string

  // Multi-equipment mode
  is_multi_equipment: boolean
  equipment_blocks?: EquipmentBlock[]

  // Custom quote mode (equipment not in DB)
  is_custom_quote: boolean
  custom_make?: string
  custom_model?: string

  // Timestamps
  created_at: string
  updated_at: string
  sent_at?: string
  expires_at?: string

  // Versioning
  version: number
  parent_quote_id?: string
  is_latest_version: boolean
}

export interface QuoteVersion {
  id: string
  quote_number: string
  version: number
  parent_quote_id?: string
  is_latest_version: boolean
  status: QuoteStatus
  total: number
  created_at: string
  created_by_name?: string
  change_notes?: string
}

export interface EquipmentBlock {
  id: string
  make_id?: string
  model_id?: string
  make_name: string
  model_name: string
  location: LocationName
  quantity: number

  // Dimensions
  length_inches?: number
  width_inches?: number
  height_inches?: number
  weight_lbs?: number

  // Images
  front_image_url?: string
  side_image_url?: string

  // Costs
  costs: Record<CostField, number>
  enabled_costs: Record<CostField, boolean>
  cost_overrides: Record<CostField, number | null>

  // Calculated
  subtotal: number
  total_with_quantity: number
}

export interface MiscellaneousFee {
  id: string
  title: string
  description?: string
  amount: number // cents
  is_percentage: boolean
}

export interface QuoteHistory {
  id: string
  quote_id: string
  quote_number: string
  status: QuoteStatus
  customer_name: string
  customer_email?: string
  customer_company?: string
  make_name: string
  model_name: string
  location: LocationName
  total: number // cents
  quote_data: QuoteData
  created_at: string
  updated_at: string
}

export interface QuoteDraft {
  id: string
  user_id: string
  quote_data: Partial<QuoteData>
  last_saved_at: string
  created_at: string
}
