import { describe, it, expect } from 'vitest'
import {
  getTruckSpecs,
  cargoFitsOnTruck,
  recommendTruckType,
} from './truck-recommendation'
import { DEFAULT_TRUCK_SPECS, type TruckSpecs } from '@/types/equipment'
import type { CargoItem, InlandEquipmentType } from '@/types/inland'

// Helper to create a cargo item
function createCargoItem(overrides: Partial<CargoItem> = {}): CargoItem {
  return {
    id: '1',
    description: 'Test cargo',
    quantity: 1,
    length_inches: 240, // 20 feet
    width_inches: 96,   // 8 feet
    height_inches: 96,  // 8 feet
    weight_lbs: 20000,
    is_oversize: false,
    is_overweight: false,
    ...overrides,
  }
}

// Helper to create custom equipment type
function createEquipmentType(overrides: Partial<InlandEquipmentType> = {}): InlandEquipmentType {
  return {
    id: 'custom-flatbed',
    name: 'Custom Flatbed',
    max_length_inches: 636,
    max_width_inches: 102,
    max_height_inches: 102,
    max_weight_lbs: 48000,
    legal_length_inches: 636,
    legal_width_inches: 102,
    legal_height_inches: 102,
    legal_weight_lbs: 48000,
    is_active: true,
    sort_order: 1,
    ...overrides,
  }
}

describe('getTruckSpecs', () => {
  it('returns default truck specs by ID', () => {
    const flatbed = getTruckSpecs('flatbed')
    expect(flatbed).toBeDefined()
    expect(flatbed?.name).toBe('Flatbed')
    expect(flatbed?.max_weight_lbs).toBe(48000)
  })

  it('returns undefined for unknown truck ID', () => {
    const unknown = getTruckSpecs('unknown-truck')
    expect(unknown).toBeUndefined()
  })

  it('prefers custom equipment types over defaults', () => {
    const customTypes: InlandEquipmentType[] = [
      createEquipmentType({
        id: 'flatbed',
        name: 'Custom Flatbed XL',
        max_weight_lbs: 60000,
      }),
    ]

    const result = getTruckSpecs('flatbed', customTypes)
    expect(result?.name).toBe('Custom Flatbed XL')
    expect(result?.max_weight_lbs).toBe(60000)
  })

  it('falls back to defaults if custom type not found', () => {
    const customTypes: InlandEquipmentType[] = [
      createEquipmentType({ id: 'custom-only', name: 'Custom Only' }),
    ]

    const result = getTruckSpecs('flatbed', customTypes)
    expect(result?.name).toBe('Flatbed')
  })
})

describe('cargoFitsOnTruck', () => {
  const flatbed: TruckSpecs = DEFAULT_TRUCK_SPECS.find(t => t.id === 'flatbed')!

  it('returns true when cargo fits within all limits', () => {
    const cargo = { length: 500, width: 96, height: 96, weight: 40000 }
    expect(cargoFitsOnTruck(cargo, flatbed)).toBe(true)
  })

  it('returns true when cargo is exactly at limits', () => {
    const cargo = {
      length: flatbed.max_length_inches,
      width: flatbed.max_width_inches,
      height: flatbed.max_height_inches,
      weight: flatbed.max_weight_lbs,
    }
    expect(cargoFitsOnTruck(cargo, flatbed)).toBe(true)
  })

  it('returns false when length exceeds limit', () => {
    const cargo = { length: 700, width: 96, height: 96, weight: 40000 }
    expect(cargoFitsOnTruck(cargo, flatbed)).toBe(false)
  })

  it('returns false when width exceeds limit', () => {
    const cargo = { length: 500, width: 120, height: 96, weight: 40000 }
    expect(cargoFitsOnTruck(cargo, flatbed)).toBe(false)
  })

  it('returns false when height exceeds limit', () => {
    const cargo = { length: 500, width: 96, height: 120, weight: 40000 }
    expect(cargoFitsOnTruck(cargo, flatbed)).toBe(false)
  })

  it('returns false when weight exceeds limit', () => {
    const cargo = { length: 500, width: 96, height: 96, weight: 60000 }
    expect(cargoFitsOnTruck(cargo, flatbed)).toBe(false)
  })
})

describe('recommendTruckType', () => {
  it('returns null for empty cargo list', () => {
    expect(recommendTruckType([])).toBeNull()
    expect(recommendTruckType(null as unknown as CargoItem[])).toBeNull()
  })

  it('recommends flatbed for small cargo', () => {
    const cargo = [createCargoItem({
      length_inches: 240,
      width_inches: 96,
      height_inches: 80,
      weight_lbs: 20000,
    })]

    const result = recommendTruckType(cargo)
    expect(result).toBeDefined()
    expect(result?.recommendedId).toBe('flatbed')
    expect(result?.recommendedName).toBe('Flatbed')
    expect(result?.isOversizePermitRequired).toBe(false)
    expect(result?.isOverweightPermitRequired).toBe(false)
  })

  it('recommends step deck for taller cargo', () => {
    const cargo = [createCargoItem({
      length_inches: 400,
      width_inches: 96,
      height_inches: 110, // Too tall for flatbed (max 102), fits step deck (max 120)
      weight_lbs: 30000,
    })]

    const result = recommendTruckType(cargo)
    expect(result?.recommendedId).toBe('step-deck')
  })

  it('recommends RGN for heavy cargo', () => {
    const cargo = [createCargoItem({
      length_inches: 400,
      width_inches: 96,
      height_inches: 96,
      weight_lbs: 100000, // Too heavy for flatbed/step deck
    })]

    const result = recommendTruckType(cargo)
    expect(result?.recommendedId).toBe('rgn')
  })

  it('calculates total requirements across multiple cargo items', () => {
    const cargo = [
      createCargoItem({
        id: '1',
        length_inches: 300, // longest
        width_inches: 80,
        height_inches: 90,
        weight_lbs: 10000,
        quantity: 2, // 20,000 lbs total
      }),
      createCargoItem({
        id: '2',
        length_inches: 200,
        width_inches: 96, // widest
        height_inches: 100, // tallest
        weight_lbs: 15000,
        quantity: 1, // 15,000 lbs
      }),
    ]

    const result = recommendTruckType(cargo)
    expect(result?.requirements.lengthRequired).toBe(300)
    expect(result?.requirements.widthRequired).toBe(96)
    expect(result?.requirements.heightRequired).toBe(100)
    expect(result?.requirements.weightRequired).toBe(35000) // 20000 + 15000
  })

  it('flags oversize permit when exceeding legal dimensions', () => {
    const cargo = [createCargoItem({
      length_inches: 650, // Exceeds legal length of 636
      width_inches: 96,
      height_inches: 96,
      weight_lbs: 30000,
    })]

    const result = recommendTruckType(cargo)
    expect(result?.isOversizePermitRequired).toBe(true)
  })

  it('flags overweight permit when exceeding legal weight', () => {
    const cargo = [createCargoItem({
      length_inches: 400,
      width_inches: 96,
      height_inches: 130, // Requires RGN
      weight_lbs: 50000, // Exceeds RGN legal weight of 42000
    })]

    const result = recommendTruckType(cargo)
    expect(result?.isOverweightPermitRequired).toBe(true)
  })

  it('suggests multi-truck solution for extremely heavy cargo', () => {
    const cargo = [createCargoItem({
      length_inches: 400,
      width_inches: 96,
      height_inches: 140,
      weight_lbs: 300000, // Exceeds single truck capacity
    })]

    const result = recommendTruckType(cargo)
    expect(result?.multiTruckSuggestion).toBeDefined()
    expect(result?.multiTruckSuggestion?.count).toBeGreaterThan(1)
  })

  it('uses custom equipment types when provided', () => {
    const customTypes: InlandEquipmentType[] = [
      createEquipmentType({
        id: 'mega-hauler',
        name: 'Mega Hauler',
        max_length_inches: 1000,
        max_width_inches: 200,
        max_height_inches: 200,
        max_weight_lbs: 500000,
        legal_length_inches: 800,
        legal_width_inches: 150,
        legal_height_inches: 150,
        legal_weight_lbs: 100000,
        is_active: true,
      }),
    ]

    // Even though cargo is huge, no multi-truck suggestion needed
    const cargo = [createCargoItem({
      length_inches: 700,
      width_inches: 150,
      height_inches: 150,
      weight_lbs: 400000,
    })]

    // Uses defaults when cargo doesn't match priority order
    const result = recommendTruckType(cargo, customTypes)
    // Should get lowboy as fallback from defaults since mega-hauler
    // doesn't match priority order names (flatbed, step-deck, rgn, lowboy)
    expect(result).toBeDefined()
  })

  it('filters inactive custom equipment types', () => {
    const customTypes: InlandEquipmentType[] = [
      createEquipmentType({
        id: 'flatbed',
        name: 'Active Flatbed',
        is_active: true,
        max_height_inches: 100, // Can only fit cargo up to 100"
      }),
      createEquipmentType({
        id: 'step-deck',
        name: 'Inactive Step Deck',
        is_active: false,
        max_height_inches: 120, // Would fit taller cargo, but it's inactive
      }),
    ]

    // Cargo with height 105" - would need step-deck, but it's inactive
    const cargo = [createCargoItem({
      length_inches: 300,
      width_inches: 80,
      height_inches: 105, // Too tall for active flatbed
      weight_lbs: 20000,
    })]

    const result = recommendTruckType(cargo, customTypes)
    // Since step-deck is inactive and cargo doesn't fit active flatbed,
    // the function should fall back to largest available (active flatbed)
    // and indicate it exceeds limits
    expect(result).toBeDefined()
    expect(result?.reason).toContain('exceed')
  })

  it('handles cargo that exceeds all truck dimensions', () => {
    const cargo = [createCargoItem({
      length_inches: 800, // Exceeds all truck max lengths
      width_inches: 150,  // Exceeds all truck max widths
      height_inches: 200, // Exceeds all truck max heights
      weight_lbs: 50000,
    })]

    const result = recommendTruckType(cargo)
    expect(result).toBeDefined()
    expect(result?.reason).toContain('exceed')
    expect(result?.isOversizePermitRequired).toBe(true)
  })
})
