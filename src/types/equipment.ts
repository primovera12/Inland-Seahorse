// Equipment domain types

export interface Make {
  id: string
  name: string
  popularity_rank?: number
  created_at: string
  updated_at: string
}

export interface Model {
  id: string
  make_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface EquipmentDimensions {
  id: string
  model_id: string
  length_inches: number
  width_inches: number
  height_inches: number
  weight_lbs: number
  front_image_url?: string
  side_image_url?: string
  created_at: string
  updated_at: string
}

export interface Rate {
  id: string
  make_id: string
  model_id: string
  location: LocationName
  dismantling_loading_cost: number // stored in cents
  loading_cost: number
  blocking_bracing_cost: number
  rigging_cost: number
  storage_cost: number
  transport_cost: number
  equipment_cost: number
  labor_cost: number
  permit_cost: number
  escort_cost: number
  miscellaneous_cost: number
  created_at: string
  updated_at: string
}

// 6 company locations
export const LOCATIONS = [
  'New Jersey',
  'Savannah',
  'Houston',
  'Chicago',
  'Oakland',
  'Long Beach',
] as const

export type LocationName = (typeof LOCATIONS)[number]

// Cost fields for rate management
export const COST_FIELDS = [
  'dismantling_loading_cost',
  'loading_cost',
  'blocking_bracing_cost',
  'rigging_cost',
  'storage_cost',
  'transport_cost',
  'equipment_cost',
  'labor_cost',
  'permit_cost',
  'escort_cost',
  'miscellaneous_cost',
] as const

export type CostField = (typeof COST_FIELDS)[number]

// For truck recommendations
export interface TruckSpecs {
  id: string
  name: string
  max_length_inches: number
  max_width_inches: number
  max_height_inches: number
  max_weight_lbs: number
  legal_length_inches: number
  legal_width_inches: number
  legal_height_inches: number
  legal_weight_lbs: number
}

export const DEFAULT_TRUCK_SPECS: TruckSpecs[] = [
  {
    id: 'flatbed',
    name: 'Flatbed',
    max_length_inches: 636,
    max_width_inches: 102,
    max_height_inches: 102,
    max_weight_lbs: 48000,
    legal_length_inches: 636,
    legal_width_inches: 102,
    legal_height_inches: 102,
    legal_weight_lbs: 48000,
  },
  {
    id: 'step-deck',
    name: 'Step Deck',
    max_length_inches: 612,
    max_width_inches: 102,
    max_height_inches: 120,
    max_weight_lbs: 48000,
    legal_length_inches: 612,
    legal_width_inches: 102,
    legal_height_inches: 120,
    legal_weight_lbs: 48000,
  },
  {
    id: 'rgn',
    name: 'RGN (Removable Gooseneck)',
    max_length_inches: 600,
    max_width_inches: 102,
    max_height_inches: 140,
    max_weight_lbs: 150000,
    legal_length_inches: 600,
    legal_width_inches: 102,
    legal_height_inches: 140,
    legal_weight_lbs: 42000,
  },
  {
    id: 'lowboy',
    name: 'Lowboy',
    max_length_inches: 576,
    max_width_inches: 102,
    max_height_inches: 156,
    max_weight_lbs: 150000,
    legal_length_inches: 576,
    legal_width_inches: 102,
    legal_height_inches: 144,
    legal_weight_lbs: 40000,
  },
]
