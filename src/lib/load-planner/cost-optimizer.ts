/**
 * Cost Optimizer Module
 * Calculates and optimizes total transport costs including:
 * - Truck daily costs
 * - Fuel costs
 * - Permit costs
 * - Escort costs
 */

import {
  LoadItem,
  TruckType,
  SmartLoadCostBreakdown,
  SmartPermitCostEstimate,
  TruckCostData,
  DEFAULT_COST_DATA,
  LEGAL_LIMITS,
  ESCORT_COSTS,
  PERMIT_BASE_COSTS_CENTS,
} from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_FUEL_PRICE_CENTS = 450 // cents per gallon ($4.50)

// All cost constants imported from shared ESCORT_COSTS and PERMIT_BASE_COSTS_CENTS in types.ts

/**
 * Calculate the number of escort days required for a route.
 * Oversize loads average ~35 mph (daylight travel, escort restrictions, scale stops)
 * with ~10 driving hours per day (daylight only).
 */
export function calculateEscortDays(distanceMiles: number): number {
  if (distanceMiles <= 0) return 1
  const milesPerDay = ESCORT_COSTS.OVERSIZE_AVG_SPEED_MPH * ESCORT_COSTS.OVERSIZE_DRIVING_HOURS_PER_DAY
  return Math.max(1, Math.ceil(distanceMiles / milesPerDay))
}

// ============================================================================
// COST DATA HELPERS
// ============================================================================

/**
 * Get cost data for a truck (uses defaults if not specified)
 */
export function getTruckCostData(truck: TruckType): TruckCostData {
  return DEFAULT_COST_DATA[truck.category] || {
    dailyCostCents: 50_000,
    fuelEfficiency: 5.0,
    specializedPremium: 1.5,
  }
}

// ============================================================================
// PERMIT COST CALCULATION
// ============================================================================

/**
 * Calculate estimated permit costs based on cargo dimensions
 */
export function calculatePermitCosts(
  cargoHeight: number,
  cargoWidth: number,
  cargoWeight: number,
  truck: TruckType,
  statesCount: number = 1,
  distanceMiles: number = 0
): SmartPermitCostEstimate {
  const costs: SmartPermitCostEstimate = {
    heightPermit: 0,
    widthPermit: 0,
    weightPermit: 0,
    escorts: 0,
  }

  const totalHeight = truck.deckHeight + cargoHeight
  const escortDays = calculateEscortDays(distanceMiles)

  // Height permit (over 13.5 ft)
  if (totalHeight > LEGAL_LIMITS.HEIGHT) {
    costs.heightPermit = PERMIT_BASE_COSTS_CENTS.HEIGHT * statesCount
    // Additional surcharge for extreme overheight
    if (totalHeight > 15) {
      costs.heightPermit += 5_000 * statesCount  // $50
    }
    if (totalHeight > 16) {
      costs.heightPermit += 10_000 * statesCount  // $100
    }
  }

  // Width permit (over 8.5 ft)
  let escortVehicles = 0
  if (cargoWidth > LEGAL_LIMITS.WIDTH) {
    costs.widthPermit = PERMIT_BASE_COSTS_CENTS.WIDTH * statesCount
    // Additional surcharge for extreme overwidth
    if (cargoWidth > 12) {
      costs.widthPermit += 5_000 * statesCount  // $50
      // Escort required — scales with trip duration
      costs.escorts += ESCORT_COSTS.PILOT_CAR_PER_DAY_CENTS * escortDays
      escortVehicles++
    }
    if (cargoWidth > 14) {
      costs.widthPermit += 10_000 * statesCount  // $100
      // Second escort required — scales with trip duration
      costs.escorts += ESCORT_COSTS.PILOT_CAR_PER_DAY_CENTS * escortDays
      escortVehicles++
    }
    if (cargoWidth > 16) {
      // Police escort may be required — 8-hour shifts per day
      costs.escorts += ESCORT_COSTS.POLICE_ESCORT_PER_HOUR_CENTS * 8 * escortDays
      escortVehicles++
    }
  }

  // Mobilization/demobilization fee per escort vehicle (one-time)
  if (escortVehicles > 0) {
    costs.escorts += ESCORT_COSTS.MOBILIZATION_PER_VEHICLE_CENTS * escortVehicles
  }

  // Weight permit (over 80,000 lbs gross)
  const grossWeight = cargoWeight + truck.tareWeight + truck.powerUnitWeight
  if (grossWeight > LEGAL_LIMITS.GROSS_WEIGHT) {
    costs.weightPermit = PERMIT_BASE_COSTS_CENTS.WEIGHT * statesCount
    // Additional weight surcharges
    const overweightLbs = grossWeight - LEGAL_LIMITS.GROSS_WEIGHT
    if (overweightLbs > 20000) {
      costs.weightPermit += 10_000 * statesCount  // $100
    }
    if (overweightLbs > 50000) {
      costs.weightPermit += 20_000 * statesCount  // $200
    }
  }

  return costs
}

// ============================================================================
// FUEL COST CALCULATION
// ============================================================================

/**
 * Calculate fuel cost for a route
 */
export function calculateFuelCost(
  truck: TruckType,
  distanceMiles: number,
  fuelPriceCentsPerGallon: number = DEFAULT_FUEL_PRICE_CENTS
): number {
  const costData = getTruckCostData(truck)
  const gallonsNeeded = distanceMiles / costData.fuelEfficiency
  return Math.round(gallonsNeeded * fuelPriceCentsPerGallon)
}

// ============================================================================
// TOTAL COST CALCULATION
// ============================================================================

/**
 * Calculate total cost breakdown for a load
 */
export function calculateTruckCost(
  truck: TruckType,
  cargo: { width: number; height: number; weight: number },
  options: {
    distanceMiles?: number
    fuelPrice?: number
    statesCount?: number
    tripDays?: number
  } = {}
): SmartLoadCostBreakdown {
  const costData = getTruckCostData(truck)
  const {
    distanceMiles = 500,
    fuelPrice = DEFAULT_FUEL_PRICE_CENTS,
    statesCount = 1,
    tripDays = 1,
  } = options

  // Base truck cost (cents)
  const truckCost = Math.round(costData.dailyCostCents * costData.specializedPremium * tripDays)

  // Fuel cost (cents)
  const fuelCost = calculateFuelCost(truck, distanceMiles, fuelPrice)

  // Permit costs (cents) — includes distance-scaled escort costs
  const permitCosts = calculatePermitCosts(
    cargo.height,
    cargo.width,
    cargo.weight,
    truck,
    statesCount,
    distanceMiles
  )

  const totalCost =
    truckCost +
    fuelCost +
    permitCosts.heightPermit +
    permitCosts.widthPermit +
    permitCosts.weightPermit +
    permitCosts.escorts

  return {
    truckCost,
    fuelCost,
    permitCosts,
    totalCost,
  }
}

// ============================================================================
// TRUCK SCORING FOR COST
// ============================================================================

/**
 * Score a truck based on cost efficiency for given cargo
 * Returns a score from 0-100, higher = more cost efficient
 */
export function scoreTruckForCost(
  truck: TruckType,
  cargo: { width: number; height: number; weight: number; length: number },
  options: {
    distanceMiles?: number
    fuelPrice?: number
    statesCount?: number
  } = {}
): number {
  // Calculate total cost
  const costBreakdown = calculateTruckCost(truck, cargo, options)

  // Base score from inverse of cost (cheaper = higher score)
  // Normalize to roughly 0-100 range assuming $500-$5000 typical cost range (50000-500000 cents)
  let score = Math.max(0, 100 - (costBreakdown.totalCost / 5000))

  // Bonus for not needing permits
  if (costBreakdown.permitCosts.heightPermit === 0) {
    score += 5
  }
  if (costBreakdown.permitCosts.widthPermit === 0) {
    score += 5
  }
  if (costBreakdown.permitCosts.weightPermit === 0) {
    score += 5
  }
  if (costBreakdown.permitCosts.escorts === 0) {
    score += 10
  }

  // Penalty for specialized equipment (harder to find)
  const costData = getTruckCostData(truck)
  if (costData.specializedPremium > 1.5) {
    score -= 10
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ============================================================================
// COST COMPARISON
// ============================================================================

/**
 * Compare costs between different loading options
 */
export function compareLoadingOptions(
  trucks: TruckType[],
  cargo: { width: number; height: number; weight: number; length: number },
  options: {
    distanceMiles?: number
    fuelPrice?: number
    statesCount?: number
  } = {}
): Array<{
  truck: TruckType
  costBreakdown: SmartLoadCostBreakdown
  score: number
  fits: boolean
}> {
  const results = trucks.map(truck => {
    const costBreakdown = calculateTruckCost(truck, cargo, options)
    const score = scoreTruckForCost(truck, cargo, options)

    // Check if cargo physically fits
    const fits =
      cargo.length <= truck.deckLength &&
      cargo.width <= truck.deckWidth &&
      cargo.weight <= truck.maxCargoWeight

    return {
      truck,
      costBreakdown,
      score,
      fits,
    }
  })

  // Sort by cost (lowest first), but prioritize trucks where cargo fits
  return results.sort((a, b) => {
    if (a.fits && !b.fits) return -1
    if (!a.fits && b.fits) return 1
    return a.costBreakdown.totalCost - b.costBreakdown.totalCost
  })
}

// ============================================================================
// MULTI-TRUCK COST OPTIMIZATION
// ============================================================================

/**
 * Calculate cost for multiple trucks
 */
export function calculateMultiTruckCost(
  loads: Array<{
    truck: TruckType
    items: LoadItem[]
  }>,
  options: {
    distanceMiles?: number
    fuelPrice?: number
    statesCount?: number
    tripDays?: number
  } = {}
): {
  perTruckCosts: SmartLoadCostBreakdown[]
  totalCost: number
  averageCostPerItem: number
} {
  const perTruckCosts = loads.map(load => {
    const cargo = {
      width: Math.max(...load.items.map(i => i.width)),
      height: Math.max(...load.items.map(i => i.height)),
      weight: load.items.reduce((sum, i) => sum + i.weight * (i.quantity || 1), 0),
    }
    return calculateTruckCost(load.truck, cargo, options)
  })

  const totalCost = perTruckCosts.reduce((sum, c) => sum + c.totalCost, 0)
  const totalItems = loads.reduce(
    (sum, l) => sum + l.items.reduce((s, i) => s + (i.quantity || 1), 0),
    0
  )

  return {
    perTruckCosts,
    totalCost: Math.round(totalCost),
    averageCostPerItem: totalItems > 0
      ? Math.round(totalCost / totalItems)
      : 0,
  }
}

/**
 * Determine if using fewer specialized trucks is cheaper than more standard trucks
 */
export function shouldUseSpecializedTruck(
  items: LoadItem[],
  standardTruck: TruckType,
  specializedTruck: TruckType,
  standardTrucksNeeded: number,
  options: {
    distanceMiles?: number
    fuelPrice?: number
    statesCount?: number
  } = {}
): {
  recommendation: 'standard' | 'specialized'
  standardCost: number
  specializedCost: number
  savings: number
} {
  const cargo = {
    width: Math.max(...items.map(i => i.width)),
    height: Math.max(...items.map(i => i.height)),
    weight: items.reduce((sum, i) => sum + i.weight * (i.quantity || 1), 0),
  }

  // Cost for multiple standard trucks
  const standardCostEach = calculateTruckCost(standardTruck, cargo, options)
  const standardTotal = standardCostEach.totalCost * standardTrucksNeeded

  // Cost for one specialized truck
  const specializedCostBreakdown = calculateTruckCost(specializedTruck, cargo, options)
  const specializedTotal = specializedCostBreakdown.totalCost

  const savings = standardTotal - specializedTotal

  return {
    recommendation: savings > 0 ? 'specialized' : 'standard',
    standardCost: Math.round(standardTotal),
    specializedCost: Math.round(specializedTotal),
    savings: Math.round(Math.abs(savings)),
  }
}
