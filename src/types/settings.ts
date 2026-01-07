// Settings domain types

export interface CompanySettings {
  id: string

  // Company info
  company_name: string
  company_logo_url?: string
  logo_size_percentage: number

  // Contact info
  company_address?: string
  company_city?: string
  company_state?: string
  company_zip?: string
  company_phone?: string
  company_email?: string
  company_website?: string

  // Branding
  primary_color: string
  secondary_color?: string

  // Quote settings
  default_payment_terms: string
  quote_validity_days: number
  default_margin_percentage: number
  quote_prefix: string

  // Fuel surcharge
  fuel_surcharge_enabled: boolean
  fuel_surcharge_percentage: number
  doe_price_threshold: number // cents per gallon

  // Notifications
  email_notifications_enabled: boolean
  notification_email?: string

  // Timestamps
  created_at: string
  updated_at: string
}

export interface FuelSurchargeSettings {
  id: string
  base_price: number // cents per gallon
  current_doe_price: number // cents per gallon
  surcharge_percentage: number
  is_auto_update_enabled: boolean
  last_updated_at: string
}

export interface RateTierConfig {
  id: string
  name: string
  min_miles: number
  max_miles: number
  rate_per_mile: number // cents
  is_active: boolean
  sort_order: number
}

export interface PermitType {
  id: string
  code: string // OW, OS, SL, ESC, BAN, RSV
  name: string
  description?: string
  default_cost: number // cents
  is_active: boolean
}

export const PERMIT_TYPES = [
  { code: 'OW', name: 'Overweight', description: 'For loads exceeding legal weight limits' },
  { code: 'OS', name: 'Oversize', description: 'For loads exceeding legal dimension limits' },
  { code: 'SL', name: 'Superload', description: 'For extremely large/heavy loads' },
  { code: 'ESC', name: 'Escort', description: 'Pilot car requirements' },
  { code: 'BAN', name: 'Banner', description: 'Oversize load signage' },
  { code: 'RSV', name: 'Route Survey', description: 'Route analysis for special loads' },
] as const

// Dimension parsing thresholds (for smart dimension input)
export interface DimensionThresholds {
  length_threshold: number // inches - above this, input is likely inches
  width_threshold: number
  height_threshold: number
}

export const DEFAULT_DIMENSION_THRESHOLDS: DimensionThresholds = {
  length_threshold: 70, // 70 inches = ~5'10"
  width_threshold: 16, // 16 inches
  height_threshold: 18, // 18 inches
}
