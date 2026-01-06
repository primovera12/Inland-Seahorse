import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create client with fallback to avoid build-time errors
// Will show proper error message at runtime if credentials are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// TypeScript types for our database tables
export interface EquipmentType {
  id: string
  name: string
  created_at: string
}

export interface Make {
  id: string
  name: string
  created_at: string
}

export interface Model {
  id: string
  make_id: string
  name: string
  created_at: string
}

export interface Rate {
  id: string
  make_id: string
  model_id: string
  price: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RateLookup {
  id: string
  make: string
  model: string
  price: number | null
  notes: string | null
  updated_at: string
  make_id: string
  model_id: string
}

// Location-based costs for quotes
export const LOCATIONS = [
  'New Jersey',
  'Savannah',
  'Houston',
  'Chicago',
  'Oakland',
  'Long Beach'
] as const

export type Location = typeof LOCATIONS[number]

// Standard cost fields (excluding miscellaneous which is handled separately)
export const COST_FIELDS = [
  { key: 'dismantling_loading_cost', label: 'Dismantling & Loading' },
  { key: 'loading_cost', label: 'Loading' },
  { key: 'blocking_bracing_cost', label: 'Blocking & Bracing' },
  { key: 'ncb_survey_cost', label: 'NCB Survey' },
  { key: 'local_drayage_cost', label: 'Local Drayage' },
  { key: 'chassis_cost', label: 'Chassis' },
  { key: 'tolls_cost', label: 'Tolls' },
  { key: 'escorts_cost', label: 'Escorts' },
  { key: 'power_wash_cost', label: 'Power Wash' },
  { key: 'waste_fluids_disposal_fee', label: 'Waste Fluids Disposal Fee' }
] as const

// All cost fields including miscellaneous (for database/settings)
export const ALL_COST_FIELDS = [
  ...COST_FIELDS,
  { key: 'miscellaneous_costs', label: 'Miscellaneous' }
] as const

export type CostField = typeof ALL_COST_FIELDS[number]['key']

// Dynamic miscellaneous fee for quotes
export interface MiscellaneousFee {
  id: string
  title: string
  description: string
  cost: number
}

export interface LocationCost {
  id: string
  rate_id: string
  location: Location
  dismantling_loading_cost: number | null
  loading_cost: number | null
  blocking_bracing_cost: number | null
  ncb_survey_cost: number | null
  local_drayage_cost: number | null
  chassis_cost: number | null
  tolls_cost: number | null
  escorts_cost: number | null
  power_wash_cost: number | null
  waste_fluids_disposal_fee: number | null
  miscellaneous_costs: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Equipment block for multi-equipment quotes
export interface EquipmentBlock {
  id: string
  // Equipment selection
  make: string
  model: string
  rate: RateLookup | null
  isCustom: boolean // true for custom equipment not in database
  // Location and costs
  location: Location | null
  costs: LocationCost | null
  costDescriptions: Record<string, string>
  enabledCosts: Record<string, boolean>
  costOverrides: Record<string, number | null>
  miscellaneousFees: MiscellaneousFee[]
  // Dimensions
  dimensions: QuoteDimensions | null
  // Images
  frontImageBase64: string | null
  sideImageBase64: string | null
  // Quantity and notes
  quantity: number
  notes: string
}

// Quote data for PDF generation
export interface QuoteData {
  equipment: RateLookup
  location: Location
  costs: LocationCost | null
  costDescriptions?: Record<string, string>
  enabledCosts?: Record<string, boolean>
  costOverrides?: Record<string, number | null>
  miscellaneousFees?: MiscellaneousFee[]
  customerName?: string
  customerEmail?: string
  customerCompany?: string
  customerPhone?: string
  billingAddress?: string
  billingCity?: string
  billingState?: string
  billingZip?: string
  paymentTerms?: string
  quoteDate: string
  quoteNumber: string
  marginPercentage?: number
  companySettings?: CompanySettings
  dimensions?: QuoteDimensions
  inlandTransportation?: InlandTransportationData
  // Multi-equipment support
  equipmentBlocks?: EquipmentBlock[]
}

// Quote History
export interface QuoteHistory {
  id: string
  quote_number: string
  rate_id: string | null
  equipment_make: string
  equipment_model: string
  location: string
  dismantling_loading_cost: number | null
  loading_cost: number | null
  blocking_bracing_cost: number | null
  ncb_survey_cost: number | null
  local_drayage_cost: number | null
  chassis_cost: number | null
  tolls_cost: number | null
  escorts_cost: number | null
  power_wash_cost: number | null
  waste_fluids_disposal_fee: number | null
  miscellaneous_costs: number | null
  miscellaneous_fees_json: string | null  // JSON array of MiscellaneousFee objects
  margin_percentage: number
  margin_amount: number
  subtotal: number
  total_with_margin: number
  customer_name: string | null
  customer_company: string | null
  customer_email: string | null
  created_at: string
  updated_at: string
  notes: string | null
  internal_notes: string | null
  status: QuoteStatus
  expiration_date: string | null
  // Version tracking
  version: number
  parent_quote_id: string | null
  original_quote_id: string | null
}

// Extended QuoteHistory alias for compatibility
export type QuoteHistoryExtended = QuoteHistory

// Company Settings for branding
export interface CompanySettings {
  id: string
  company_name: string
  company_address: string | null
  company_phone: string | null
  company_email: string | null
  company_website: string | null
  logo_base64: string | null
  logo_width: number
  logo_height: number | null
  logo_width_percent: number
  primary_color: string
  secondary_color: string
  accent_color: string
  show_company_address: boolean
  show_company_phone: boolean
  show_company_email: boolean
  quote_validity_days: number
  footer_text: string | null
  terms_and_conditions: string | null
  // Dimension auto-conversion thresholds (values above these are treated as inches)
  dimension_threshold_length: number | null
  dimension_threshold_width: number | null
  dimension_threshold_height: number | null
  created_at: string
  updated_at: string
}

// Quote Templates for default costs
export interface QuoteTemplate {
  id: string
  name: string
  location: Location
  dismantling_loading_cost: number | null
  loading_cost: number | null
  blocking_bracing_cost: number | null
  ncb_survey_cost: number | null
  local_drayage_cost: number | null
  chassis_cost: number | null
  tolls_cost: number | null
  escorts_cost: number | null
  power_wash_cost: number | null
  waste_fluids_disposal_fee: number | null
  miscellaneous_costs: number | null
  default_margin_percentage: number
  is_default: boolean
  created_at: string
  updated_at: string
}

// Equipment Dimensions
export interface EquipmentDimensions {
  id: string
  model_id: string
  // Weight (lbs)
  operating_weight: number | null
  shipping_weight: number | null
  // Transport dimensions (inches)
  transport_length: number | null
  transport_width: number | null
  transport_height: number | null
  // Overall dimensions (inches)
  overall_length: number | null
  overall_width: number | null
  overall_height: number | null
  // Additional specs
  track_width: number | null
  ground_clearance: number | null
  engine_power_hp: number | null
  bucket_capacity_cu_yd: number | null
  // Images
  front_image_base64: string | null
  side_image_base64: string | null
  // Equipment classification
  equipment_type: EquipmentSilhouetteType | null
  // Metadata
  data_source: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Extended model with dimensions for display
export interface ModelWithDimensions extends Model {
  make_name?: string
  dimensions?: EquipmentDimensions | null
}

// Parsed Address (for Google Places)
export interface ParsedAddress {
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  formatted_address: string | null
  place_id: string | null
  lat: number
  lng: number
}

// Route Result (for distance calculations)
export interface RouteResult {
  distance_meters: number
  distance_miles: number
  duration_seconds: number
  duration_minutes: number
  duration_text: string
  polyline: string
}

// Equipment Silhouette Types
export type EquipmentSilhouetteType =
  | 'excavator'
  | 'wheel_loader'
  | 'bulldozer'
  | 'skid_steer'
  | 'compact_track_loader'
  | 'backhoe'
  | 'forklift'
  | 'crane'
  | 'dump_truck'
  | 'motor_grader'
  | 'roller'
  | 'telehandler'
  | 'other'

// =============================================
// Activity Log Types
// =============================================

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'quote_sent' | 'quote_accepted' | 'quote_rejected' | 'follow_up' | 'status_change'

export type ActivityOutcome = 'completed' | 'no_answer' | 'voicemail' | 'callback_requested' | 'interested' | 'not_interested' | 'pending'

export const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'call', label: 'Phone Call', icon: '📞' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'meeting', label: 'Meeting', icon: '🤝' },
  { value: 'note', label: 'Note', icon: '📝' },
  { value: 'task', label: 'Task', icon: '✅' },
  { value: 'quote_sent', label: 'Quote Sent', icon: '📤' },
  { value: 'quote_accepted', label: 'Quote Accepted', icon: '✔️' },
  { value: 'quote_rejected', label: 'Quote Rejected', icon: '❌' },
  { value: 'follow_up', label: 'Follow Up', icon: '🔔' },
  { value: 'status_change', label: 'Status Change', icon: '🔄' },
]

export interface ActivityLog {
  id: string
  activity_type: ActivityType
  title: string
  description: string | null
  company_id: string | null
  contact_id: string | null
  quote_id: string | null
  quote_type: 'dismantling' | 'inland' | null
  duration_minutes: number | null
  outcome: ActivityOutcome | null
  follow_up_date: string | null
  follow_up_completed: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// =============================================
// Company and Contact Types
// =============================================

export type CompanyStatus = 'active' | 'inactive' | 'prospect' | 'lead' | 'vip'
export type ContactRole = 'primary' | 'billing' | 'operations' | 'sales' | 'other' | 'general' | 'decision_maker' | 'technical'

export interface Company {
  id: string
  name: string
  industry: string | null
  website: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  billing_address: string | null
  billing_city: string | null
  billing_state: string | null
  billing_zip: string | null
  payment_terms: string | null
  tax_id: string | null
  tags: string[]
  status: CompanyStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  company_id: string | null
  first_name: string
  last_name: string | null
  title: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  role: ContactRole
  is_primary: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CompanyWithContacts extends Company {
  contacts?: Contact[]
  contact_count?: number
  quote_count?: number
  total_quote_value?: number
  last_quote_date?: string | null
}

// =============================================
// Customer Type (for quote management)
// =============================================

export interface Customer {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  address: string | null
  billing_address: string | null
  billing_city: string | null
  billing_state: string | null
  billing_zip: string | null
  payment_terms: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// =============================================
// Follow-up Reminder Types
// =============================================

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ReminderStatus = 'pending' | 'completed' | 'snoozed' | 'cancelled'

export const REMINDER_PRIORITIES: { value: ReminderPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

export interface FollowUpReminder {
  id: string
  title: string
  description: string | null
  company_id: string | null
  contact_id: string | null
  quote_id: string | null
  quote_type: 'dismantling' | 'inland' | null
  due_date: string
  reminder_date: string
  reminder_time: string | null
  priority: ReminderPriority
  status: ReminderStatus
  completed_at: string | null
  snoozed_until: string | null
  snooze_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// =============================================
// Quote Status Types
// =============================================

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export type InlandQuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

export const QUOTE_STATUSES: { value: QuoteStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'expired', label: 'Expired', color: 'bg-orange-100 text-orange-700' },
]

// Inland Accessorial Types
export type AccessorialBillingUnit = 'flat' | 'hour' | 'day' | 'way' | 'week' | 'month' | 'stop'

export interface InlandAccessorialType {
  id: string
  name: string
  description: string | null
  default_amount: number
  is_percentage: boolean
  billing_unit: AccessorialBillingUnit
  condition_text: string | null
  free_time_hours: number | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface InlandEquipmentType {
  id: string
  name: string
  description: string | null
  max_weight_lbs: number | null
  max_length_inches: number | null
  max_width_inches: number | null
  max_height_inches: number | null
  rate_multiplier: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface InlandRateSettings {
  id: string
  default_rate_per_mile: number
  fuel_surcharge_percent: number
  default_margin_percent: number
  minimum_charge: number
  default_validity_days: number
  created_at: string
  updated_at: string
}

export interface InlandSavedLane {
  id: string
  name: string
  origin_address: string
  origin_city: string | null
  origin_state: string | null
  origin_zip: string | null
  origin_lat: number | null
  origin_lng: number | null
  origin_place_id: string | null
  destination_address: string
  destination_city: string | null
  destination_state: string | null
  destination_zip: string | null
  destination_lat: number | null
  destination_lng: number | null
  destination_place_id: string | null
  distance_miles: number | null
  typical_rate_per_mile: number | null
  use_count: number
  created_at: string
  updated_at: string
}

export interface InlandServiceItem {
  id: string
  name: string
  description: string
  price: number
  quantity: number
}

export interface InlandCargoItem {
  id: string
  description: string
  cargo_type: string
  quantity: number
  weight_lbs: number | null
  length_inches: number | null
  width_inches: number | null
  height_inches: number | null
  image_base64: string | null // Per-load image
  // Equipment mode fields
  is_equipment?: boolean // Toggle for equipment mode
  equipment_make?: string | null // Equipment make name
  equipment_model?: string | null // Equipment model name
  equipment_model_id?: string | null // Model ID for database lookup
  is_custom_equipment?: boolean // If true, user entered custom equipment data
  front_image_base64?: string | null // Equipment front image
  side_image_base64?: string | null // Equipment side image
}

// Load type for managing cargo types
export interface InlandLoadType {
  id: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Service type for rates dropdown (line haul, drayage, etc.)
export interface InlandServiceType {
  id: string
  name: string
  description: string | null
  default_price: number | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Load block - groups truck, cargo, rates, accessorials
export interface InlandLoadBlock {
  id: string
  truck_type_id: string
  cargo_items: InlandCargoItem[]
  service_items: InlandServiceItem[]
  accessorial_charges: InlandAccessorialCharge[]
  load_image_base64: string | null
  notes: string
}

export interface InlandAccessorialCharge {
  id?: string
  type_id: string
  type_name: string
  name?: string
  amount: number
  is_percentage: boolean
  billing_unit: AccessorialBillingUnit
  quantity: number
  condition_text: string | null
}

// Destination block - contains route, loads, and notes for one destination
export interface InlandDestinationBlock {
  id: string
  name: string // e.g., "Destination A", "Destination B"
  pickup: ParsedAddress | null
  dropoff: ParsedAddress | null
  stops: ParsedAddress[]
  route: RouteResult | null
  map_image_base64: string | null // Map screenshot for this destination's route
  load_blocks: InlandLoadBlock[]
  internal_notes: string
  customer_notes: string
  special_instructions: string
  // Pricing settings per destination
  rate_per_mile: number
  base_rate: number
  fuel_surcharge_percent: number
  margin_percentage: number
  manual_total: number | null
  use_manual_pricing: boolean
}

export interface InlandQuoteFormData {
  // Client Information (single, shared across all destinations)
  client_name: string
  client_company: string
  client_email: string
  client_phone: string
  client_address: string
  billing_address: string
  billing_city: string
  billing_state: string
  billing_zip: string
  payment_terms: string
  work_order_number: string
  // Multiple destination blocks
  destination_blocks: InlandDestinationBlock[]
  // Legacy fields for backward compatibility with old quotes
  pickup: ParsedAddress | null
  dropoff: ParsedAddress | null
  route: RouteResult | null
  rate_per_mile: number
  base_rate: number
  fuel_surcharge_percent: number
  margin_percentage: number
  manual_total: number | null
  use_manual_pricing: boolean
  equipment_type_id: string
  equipment_description: string
  weight_lbs: number | null
  internal_notes: string
  customer_notes: string
  special_instructions: string
  accessorial_charges: InlandAccessorialCharge[]
  stops: ParsedAddress[]
  service_items: InlandServiceItem[]
  cargo_items: InlandCargoItem[]
  load_image_base64: string | null
  // New load blocks system for multiple trucks
  load_blocks: InlandLoadBlock[]
}

export interface InlandQuote {
  id: string
  quote_number: string
  // Client info
  client_name: string
  client_company: string | null
  client_email: string | null
  client_phone: string | null
  // Billing info
  billing_address: string | null
  billing_city: string | null
  billing_state: string | null
  billing_zip: string | null
  payment_terms: string | null
  // Pickup location
  pickup_address: string | null
  pickup_city: string | null
  pickup_state: string | null
  pickup_zip: string | null
  pickup_country: string | null
  pickup_lat: number | null
  pickup_lng: number | null
  pickup_place_id: string | null
  pickup_formatted_address: string | null
  // Dropoff location
  dropoff_address: string | null
  dropoff_city: string | null
  dropoff_state: string | null
  dropoff_zip: string | null
  dropoff_country: string | null
  dropoff_lat: number | null
  dropoff_lng: number | null
  dropoff_place_id: string | null
  dropoff_formatted_address: string | null
  // Route info
  distance_miles: number | null
  distance_meters: number | null
  duration_minutes: number | null
  duration_text: string | null
  route_polyline: string | null
  // Pricing
  rate_per_mile: number | null
  base_rate: number | null
  fuel_surcharge_percent: number | null
  fuel_surcharge_amount: number | null
  margin_percentage: number | null
  margin_amount: number | null
  line_haul_total: number | null
  accessorial_total: number | null
  subtotal: number | null
  total_amount: number
  // Equipment
  equipment_type_id: string | null
  equipment_type: string | null
  equipment_description: string | null
  weight_lbs: number | null
  // Notes
  internal_notes: string | null
  customer_notes: string | null
  special_instructions: string | null
  // Status
  status: InlandQuoteStatus
  valid_until: string | null
  created_at: string
  updated_at: string
  // Stored JSON data for load blocks, services, cargo, etc.
  load_blocks: InlandLoadBlock[] | null
  service_items: InlandServiceItem[] | null
  cargo_items: InlandCargoItem[] | null
  accessorial_charges: InlandAccessorialCharge[] | null
  load_image_base64: string | null
}

export interface QuoteComparison {
  id: string
  name: string
  description: string | null
  quote_ids: string[]
  inland_quote_ids: string[]
  created_at: string
  updated_at: string
}

// =============================================
// Quote Dimensions (for PDF generation)
// =============================================

export interface QuoteDimensions {
  transportLength: number | null
  transportWidth: number | null
  transportHeight: number | null
  operatingWeight: number | null
  frontImageBase64: string | null
  sideImageBase64: string | null
}

// =============================================
// Recent Equipment (for quick selection)
// =============================================

export interface RecentEquipment {
  id: string
  rate_id: string
  equipment_make: string
  equipment_model: string
  last_used_at: string
  use_count: number
  created_at: string
}

// =============================================
// Quote Draft (auto-save)
// =============================================

export interface QuoteDraft {
  id: string
  rate_id: string | null
  equipment_make: string | null
  equipment_model: string | null
  location: string | null
  customer_id: string | null
  customer_name: string | null
  customer_email: string | null
  cost_overrides: Record<string, number | null>
  enabled_costs: Record<string, boolean>
  cost_descriptions: Record<string, string>
  miscellaneous_fees: MiscellaneousFee[]
  margin_percentage: number
  expiration_days: number
  internal_notes: string | null
  created_at: string
  updated_at: string
  last_accessed_at: string
}

// =============================================
// Inland Transportation Data (for PDF generation)
// =============================================

export interface InlandTotals {
  lineHaul: number
  fuelSurcharge: number
  accessorialTotal: number
  serviceItemsTotal: number
  total: number
}

export interface InlandTransportationData {
  pickup: ParsedAddress | null
  dropoff: ParsedAddress | null
  route: RouteResult | null
  ratePerMile: number
  baseRate: number
  fuelSurchargePercent: number
  equipmentTypeName?: string
  accessorialCharges: InlandAccessorialCharge[]
  serviceItems: InlandServiceItem[]
  cargoItems: InlandCargoItem[]
  loadImageBase64: string | null
  mapImage?: string | null  // Base64 encoded map screenshot for PDF
  notes: string
  totals: InlandTotals
  // Load blocks for multi-truck/multi-cargo quotes
  load_blocks?: InlandLoadBlock[]
  // Destination blocks for multi-destination quotes
  destination_blocks?: InlandDestinationBlock[]
}

// =============================================
// Permit Types
// =============================================

export type PermitTypeName = 'overweight' | 'oversize' | 'superload' | 'pilot_car' | 'escort' | 'route_survey' | 'other'

export interface PermitType {
  id: string
  name: string
  code: PermitTypeName
  description: string | null
  required_for_overweight: boolean
  required_for_oversize: boolean
  base_cost: number | null
  typical_cost: number | null
  typical_processing_days: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PermitStatus = 'pending' | 'applied' | 'approved' | 'rejected'

export interface QuotePermit {
  id: string
  quote_id: string | null
  inland_quote_id: string | null
  quote_type: 'dismantling' | 'inland' | null
  permit_type: PermitTypeName
  permit_type_id: string | null
  permit_code: PermitTypeName | null
  state: string
  cost: number
  estimated_cost: number | null
  status: PermitStatus
  notes: string | null
  required: boolean
  created_at: string
  updated_at: string
}

// =============================================
// Rate Tier & Fuel Surcharge Types
// =============================================

export interface RateTierConfig {
  id: string
  name: string
  min_weight: number | null
  max_weight: number | null
  min_distance: number | null
  max_distance: number | null
  min_miles: number
  max_miles: number | null
  rate_multiplier: number
  rate_per_mile: number
  base_rate: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FuelSurchargeSettings {
  id: string
  base_fuel_price: number
  current_fuel_price: number
  surcharge_per_gallon_increase: number
  increment_per_cent: number
  min_surcharge: number
  max_surcharge: number
  update_frequency: 'daily' | 'weekly' | 'monthly'
  last_updated: string
  created_at: string
  updated_at: string
}

export interface FuelSurchargeIndex {
  id: string
  effective_date: string
  fuel_price: number
  doe_price_per_gallon: number
  surcharge_percentage: number
  surcharge_percent: number
  source: string | null
  created_at: string
}

// =============================================
// Ticket/Feature Request Types
// =============================================

export type TicketType = 'feature' | 'update' | 'error'
export type TicketStatus = 'new' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export const TICKET_TYPES: { value: TicketType; label: string; color: string }[] = [
  { value: 'feature', label: 'New Feature', color: 'bg-green-100 text-green-700' },
  { value: 'update', label: 'Update/Enhancement', color: 'bg-blue-100 text-blue-700' },
  { value: 'error', label: 'Error/Bug Report', color: 'bg-red-100 text-red-700' },
]

export const TICKET_STATUSES: { value: TicketStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-700' },
  { value: 'wont_fix', label: "Won't Fix", color: 'bg-orange-100 text-orange-700' },
]

export const TICKET_PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

// Pages/services where tickets can be related to
export const TICKET_PAGES = [
  { value: 'price_entry', label: 'Data Entry' },
  { value: 'search', label: 'Search' },
  { value: 'quote', label: 'Generate Quote' },
  { value: 'history', label: 'Quote History' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'add_new', label: 'Add New Make' },
  { value: 'manage', label: 'Manage Data' },
  { value: 'inland_quote', label: 'Inland Quote' },
  { value: 'inland_history', label: 'Inland History' },
  { value: 'companies', label: 'Companies' },
  { value: 'clients', label: 'Contacts' },
  { value: 'settings', label: 'Settings' },
  { value: 'dismantle_settings', label: 'Dismantle Settings' },
  { value: 'inland_settings', label: 'Inland Settings' },
  { value: 'new_page', label: 'New Page/Feature' },
  { value: 'general', label: 'General/System-wide' },
]

export interface Ticket {
  id: string
  ticket_number: string
  title: string
  description: string
  type: TicketType
  status: TicketStatus
  priority: TicketPriority
  page: string
  screenshot_base64: string | null
  submitted_by: string | null
  submitted_email: string | null
  admin_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}
