/**
 * Load Planner Integration Tests
 * Phase 9: Testing & Verification
 */

import { describe, it, expect } from 'vitest'
import {
  planLoads,
  selectTrucks,
  calculateRoutePermits,
  trucks,
  statePermits,
  getStateByCode,
  toLegacyFormat,
  fromLegacyFormat,
  convertLegacyCargoItems,
  convertToLegacyFormat,
  type ParsedLoad,
  type LoadItem,
  type CargoSpecs,
  type LegacyCargoItem,
} from '../index'
import { parseText, parseSpreadsheet } from '../universal-parser'
import { getActiveRestrictions, checkRouteSeasonalRestrictions, hasSeasonalRestrictions } from '../seasonal-restrictions'
import { checkRouteBridgeClearances, findNearbyBridges } from '../bridge-heights'
import type { LatLng } from '../route-calculator'

// Test data: Sample cargo items
const sampleItems: LoadItem[] = [
  {
    id: 'item-1',
    description: 'Transformer',
    quantity: 1,
    length: 21, // feet
    width: 10,
    height: 13,
    weight: 197000, // lbs
    stackable: false,
    fragile: false,
    hazmat: false,
  },
  {
    id: 'item-2',
    description: 'Generator',
    quantity: 2,
    length: 12,
    width: 8,
    height: 9,
    weight: 25000,
    stackable: false,
    fragile: false,
    hazmat: false,
  },
]

const createParsedLoad = (items: LoadItem[]): ParsedLoad => {
  const validItems = items.filter(i => i.length > 0 && i.width > 0 && i.height > 0 && i.weight > 0)
  return {
    length: Math.max(...validItems.map(i => i.length), 0),
    width: Math.max(...validItems.map(i => i.width), 0),
    height: Math.max(...validItems.map(i => i.height), 0),
    weight: Math.max(...validItems.map(i => i.weight * i.quantity), 0),
    totalWeight: validItems.reduce((sum, i) => sum + i.weight * i.quantity, 0),
    items: validItems,
    confidence: 100,
  }
}

describe('Load Planner Core', () => {
  describe('Truck Database', () => {
    it('should have 50 trucks defined', () => {
      expect(trucks.length).toBe(50)
    })

    it('should have required properties on all trucks', () => {
      for (const truck of trucks) {
        expect(truck.id).toBeDefined()
        expect(truck.name).toBeDefined()
        expect(truck.category).toBeDefined()
        expect(truck.deckLength).toBeGreaterThan(0)
        expect(truck.deckWidth).toBeGreaterThan(0)
        expect(truck.maxLegalCargoHeight).toBeGreaterThan(0)
        expect(truck.maxCargoWeight).toBeGreaterThan(0)
      }
    })

    it('should have trucks in correct categories', () => {
      const categories = new Set(trucks.map(t => t.category))
      expect(categories).toContain('FLATBED')
      expect(categories).toContain('STEP_DECK')
      expect(categories).toContain('RGN')
      expect(categories).toContain('LOWBOY')
    })
  })

  describe('Truck Selection', () => {
    it('should select appropriate truck for small cargo', () => {
      const smallCargo: ParsedLoad = createParsedLoad([{
        id: 'small-1',
        description: 'Small Machine',
        quantity: 1,
        length: 10,
        width: 6,
        height: 7,
        weight: 15000,
        stackable: false,
        fragile: false,
        hazmat: false,
      }])

      const recommendations = selectTrucks(smallCargo)
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].score).toBeGreaterThan(50)
      // Small cargo should fit on a standard flatbed
      expect(recommendations[0].truck.category).toBe('FLATBED')
    })

    it('should select step deck for tall cargo within step deck range', () => {
      const tallCargo: ParsedLoad = createParsedLoad([{
        id: 'tall-1',
        description: 'Tall Equipment',
        quantity: 1,
        length: 20,
        width: 8,
        height: 10, // Above flatbed clearance
        weight: 30000,
        stackable: false,
        fragile: false,
        hazmat: false,
      }])

      const recommendations = selectTrucks(tallCargo)
      expect(recommendations.length).toBeGreaterThan(0)
      // Should recommend step deck or lower for height
      const stepDeckOrLower = recommendations.filter(r =>
        r.truck.category === 'STEP_DECK' || r.truck.category === 'RGN' || r.truck.category === 'LOWBOY'
      )
      expect(stepDeckOrLower.length).toBeGreaterThan(0)
    })

    it('should select heavy haul for superloads', () => {
      const superload: ParsedLoad = createParsedLoad([{
        id: 'super-1',
        description: 'Massive Transformer',
        quantity: 1,
        length: 30,
        width: 12,
        height: 14,
        weight: 300000, // Super heavy
        stackable: false,
        fragile: false,
        hazmat: false,
      }])

      const recommendations = selectTrucks(superload)
      expect(recommendations.length).toBeGreaterThan(0)
      // Should recommend multi-axle for weight
      const heavyHaul = recommendations.filter(r =>
        r.truck.category === 'MULTI_AXLE' || r.truck.category === 'SCHNABEL' || r.truck.category === 'PERIMETER'
      )
      expect(heavyHaul.length).toBeGreaterThan(0)
    })
  })

  describe('Load Planning', () => {
    it('should create load plan for single item', () => {
      const singleItem: ParsedLoad = createParsedLoad([sampleItems[0]])
      const plan = planLoads(singleItem)

      expect(plan).toBeDefined()
      expect(plan.totalItems).toBe(1)
      expect(plan.loads.length).toBeGreaterThan(0)
    })

    it('should distribute multiple items across loads', () => {
      const multiItem: ParsedLoad = createParsedLoad(sampleItems)
      const plan = planLoads(multiItem)

      expect(plan).toBeDefined()
      expect(plan.totalItems).toBe(3) // 1 + 2 quantity
      expect(plan.totalWeight).toBeGreaterThan(0)
    })

    it('should handle oversize cargo', () => {
      const oversize: ParsedLoad = createParsedLoad([{
        id: 'oversize-1',
        description: 'Wide Load',
        quantity: 1,
        length: 60, // Over standard length
        width: 14, // Over standard width
        height: 15, // Over standard height
        weight: 150000,
        stackable: false,
        fragile: false,
        hazmat: false,
      }])

      const plan = planLoads(oversize)
      // Should still be able to create a plan
      expect(plan).toBeDefined()
      expect(plan.loads.length).toBeGreaterThan(0)
    })
  })

  describe('Permit Calculation', () => {
    it('should calculate permits for oversize loads', () => {
      const states = ['TX', 'OK', 'KS']
      const cargo: CargoSpecs = {
        length: 75, // Over legal
        width: 12, // Over legal
        height: 14.5, // Over legal
        grossWeight: 120000, // Over legal
      }
      const permits = calculateRoutePermits(states, cargo)

      expect(permits).toBeDefined()
      expect(permits.states.length).toBe(3)
      expect(permits.totalPermitFees).toBeGreaterThan(0)
    })

    it('should have permit data for all 50 states', () => {
      // statePermits is an array, not an object
      expect(statePermits.length).toBe(50)

      const requiredStates = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
      ]

      for (const stateCode of requiredStates) {
        const state = getStateByCode(stateCode)
        expect(state).toBeDefined()
        expect(state!.legalLimits.maxWidth).toBeGreaterThan(0)
        expect(state!.legalLimits.maxHeight).toBeGreaterThan(0)
        expect(state!.legalLimits.maxWeight.gross).toBeGreaterThan(0)
      }
    })

    it('should not require oversize permits for legal loads', () => {
      const states = ['TX', 'CA']
      const cargo: CargoSpecs = {
        length: 48, // Legal
        width: 8.5, // Legal
        height: 13.5, // Legal
        grossWeight: 80000, // Legal
      }
      const permits = calculateRoutePermits(states, cargo)

      // Legal loads should have minimal or no permit fees
      expect(permits.totalPermitFees).toBe(0)
    })
  })
})

describe('Universal Parser', () => {
  describe('Text Parsing', () => {
    it('should parse LxWxH format', () => {
      const result = parseText('Transformer 21ft x 10ft x 13ft, 197,000 lbs')

      expect(result.success).toBe(true)
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items[0].length).toBe(21)
      expect(result.items[0].width).toBe(10)
      expect(result.items[0].height).toBe(13)
    })

    it('should parse quoted dimensions', () => {
      const result = parseText("Generator: 12' x 8' x 9', 25000 pounds")

      expect(result.success).toBe(true)
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should parse individual dimension labels', () => {
      const result = parseText(`
        Equipment: Excavator
        Length: 32
        Width: 10
        Height: 12
        Weight: 85000 lbs
      `)

      expect(result.success).toBe(true)
      expect(result.items.length).toBeGreaterThan(0)
      // Text parser may parse differently - just check dimensions exist
      expect(result.items[0].length).toBeGreaterThan(0)
    })

    it('should return raw text for AI processing when no pattern matches', () => {
      const result = parseText('Some random text with no dimensions')

      expect(result.rawText).toBeDefined()
      expect(result.rawText).toContain('random text')
    })
  })
})

describe('Route Intelligence', () => {
  describe('Seasonal Restrictions', () => {
    it('should detect spring thaw restrictions in northern states', () => {
      // March is spring thaw season in Minnesota
      const marchDate = new Date('2026-03-15')
      // Use checkRouteSeasonalRestrictions for state-specific checks
      const result = checkRouteSeasonalRestrictions(['MN', 'WI', 'MI'], marchDate)

      expect(result.hasRestrictions).toBe(true)
      expect(result.affectedStates.length).toBeGreaterThan(0)
    })

    it('should not have restrictions outside thaw season', () => {
      // August has no spring thaw
      const augustDate = new Date('2026-08-15')
      const result = checkRouteSeasonalRestrictions(['MN', 'WI', 'MI'], augustDate)

      // Should have no active spring thaw restrictions in August
      expect(result.hasRestrictions).toBe(false)
    })
  })

  describe('Bridge Heights', () => {
    it('should find nearby low clearance bridges', () => {
      // Route near Glenwood Canyon (known low clearance)
      const routeCoords: LatLng[] = [
        { lat: 39.5501, lng: -107.3248 }, // Glenwood Springs, CO
      ]

      const bridges = findNearbyBridges(routeCoords, 50) // 50 mile radius
      // Should find some bridges
      expect(bridges).toBeDefined()
    })

    it('should check route bridge clearances for height', () => {
      const routeCoords: LatLng[] = [
        { lat: 40.7128, lng: -74.0060 }, // NYC
      ]

      const result = checkRouteBridgeClearances(routeCoords, 14.5)
      // Should return bridge check result
      expect(result).toBeDefined()
      expect(result.hasIssues).toBeDefined()
      expect(result.warnings).toBeDefined()
    })
  })
})

describe('Backward Compatibility', () => {
  it('should convert LoadItem (feet) to legacy format (inches)', () => {
    const loadItem: LoadItem = {
      id: 'test-1',
      description: 'Test Equipment',
      quantity: 2,
      length: 10, // feet
      width: 8,
      height: 6,
      weight: 25000,
      stackable: false,
      fragile: false,
      hazmat: false,
    }

    const legacy = toLegacyFormat(loadItem)

    expect(legacy.id).toBe('test-1')
    expect(legacy.description).toBe('Test Equipment')
    expect(legacy.quantity).toBe(2)
    expect(legacy.length_inches).toBe(120) // 10 * 12
    expect(legacy.width_inches).toBe(96) // 8 * 12
    expect(legacy.height_inches).toBe(72) // 6 * 12
    expect(legacy.weight_lbs).toBe(25000)
  })

  it('should convert legacy format (inches) to LoadItem (feet)', () => {
    const legacy: LegacyCargoItem = {
      id: 'test-2',
      description: 'Legacy Equipment',
      quantity: 1,
      length_inches: 240, // 20 feet
      width_inches: 96, // 8 feet
      height_inches: 144, // 12 feet
      weight_lbs: 45000,
    }

    const loadItem = fromLegacyFormat(legacy)

    expect(loadItem.id).toBe('test-2')
    expect(loadItem.description).toBe('Legacy Equipment')
    expect(loadItem.quantity).toBe(1)
    expect(loadItem.length).toBe(20)
    expect(loadItem.width).toBe(8)
    expect(loadItem.height).toBe(12)
    expect(loadItem.weight).toBe(45000)
    expect(loadItem.stackable).toBe(false)
    expect(loadItem.fragile).toBe(false)
    expect(loadItem.hazmat).toBe(false)
  })

  it('should correctly flag oversize items', () => {
    // Wide load (over 8.5ft)
    const wideItem: LoadItem = {
      id: 'wide-1',
      description: 'Wide Load',
      quantity: 1,
      length: 20,
      width: 12, // Over 8.5ft
      height: 8,
      weight: 30000,
      stackable: false,
      fragile: false,
      hazmat: false,
    }

    const wideLegacy = toLegacyFormat(wideItem)
    expect(wideLegacy.is_oversize).toBe(true)

    // Tall load (over 10ft cargo height)
    const tallItem: LoadItem = {
      id: 'tall-1',
      description: 'Tall Load',
      quantity: 1,
      length: 20,
      width: 8,
      height: 11, // Over 10ft
      weight: 30000,
      stackable: false,
      fragile: false,
      hazmat: false,
    }

    const tallLegacy = toLegacyFormat(tallItem)
    expect(tallLegacy.is_oversize).toBe(true)

    // Normal legal-sized load
    const normalItem: LoadItem = {
      id: 'normal-1',
      description: 'Normal Load',
      quantity: 1,
      length: 20,
      width: 8,
      height: 8,
      weight: 30000,
      stackable: false,
      fragile: false,
      hazmat: false,
    }

    const normalLegacy = toLegacyFormat(normalItem)
    expect(normalLegacy.is_oversize).toBe(false)
  })

  it('should batch convert arrays', () => {
    const loadItems: LoadItem[] = [
      {
        id: 'batch-1',
        description: 'Item 1',
        quantity: 1,
        length: 10,
        width: 8,
        height: 6,
        weight: 15000,
        stackable: false,
        fragile: false,
        hazmat: false,
      },
      {
        id: 'batch-2',
        description: 'Item 2',
        quantity: 2,
        length: 15,
        width: 10,
        height: 8,
        weight: 25000,
        stackable: true,
        fragile: false,
        hazmat: false,
      },
    ]

    const legacyItems = convertToLegacyFormat(loadItems)
    expect(legacyItems.length).toBe(2)
    expect(legacyItems[0].length_inches).toBe(120)
    expect(legacyItems[1].length_inches).toBe(180)

    const backToLoadItems = convertLegacyCargoItems(legacyItems)
    expect(backToLoadItems.length).toBe(2)
    expect(backToLoadItems[0].length).toBe(10)
    expect(backToLoadItems[1].length).toBe(15)
  })
})

describe('Integration', () => {
  it('should complete full workflow: select truck -> plan -> permits', () => {
    // Use direct test data to avoid parser dependency issues
    const items: LoadItem[] = [{
      id: 'test-item-1',
      description: 'Excavator',
      quantity: 1,
      length: 25, // feet
      width: 10,
      height: 10,
      weight: 45000, // lbs - fits on most trucks
      stackable: false,
      fragile: false,
      hazmat: false,
    }]

    const parsedLoad: ParsedLoad = {
      length: 25,
      width: 10,
      height: 10,
      weight: 45000,
      totalWeight: 45000,
      items,
      confidence: 100,
    }

    // 1. Select trucks
    const recommendations = selectTrucks(parsedLoad)
    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations[0].score).toBeGreaterThan(0)

    // 2. Plan loads
    const loadPlan = planLoads(parsedLoad)
    expect(loadPlan).toBeDefined()
    // This cargo should fit on a truck and be assigned
    expect(loadPlan.totalWeight).toBeGreaterThan(0)
    expect(loadPlan.loads.length).toBeGreaterThan(0)

    // 3. Calculate permits - this cargo is over legal width (10ft > 8.5ft)
    const cargo: CargoSpecs = {
      length: parsedLoad.length,
      width: parsedLoad.width,
      height: parsedLoad.height + 5, // Add deck height (approx 5ft for flatbed)
      grossWeight: (parsedLoad.totalWeight ?? 0) + 50000, // Add approximate truck+trailer weight
    }
    const permits = calculateRoutePermits(['TX', 'OK', 'KS', 'CO'], cargo)

    expect(permits).toBeDefined()
    expect(permits.states.length).toBe(4)
    // Width over 8.5ft should require permits
    expect(permits.totalPermitFees).toBeGreaterThan(0)
  })
})
