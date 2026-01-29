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
  HEIGHT_PERMIT_TIERS_CENTS,
  getRouteMaxMultiplier,
  getDieselPriceForDate,
  calculateFuelSurchargeDetailed,
  DEFAULT_FUEL_SURCHARGE_CONFIG,
  type FuelSurchargeConfig,
} from './types'
import {
  calculateAdjustedWeightLimits,
  checkRouteSeasonalRestrictions,
} from './seasonal-restrictions'

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_FUEL_PRICE_CENTS = 400 // cents per gallon ($4.00 - 2026 baseline)

// ============================================================================
// SEASONAL RESTRICTION TYPES
// ============================================================================

/**
 * Result of seasonal restriction check for cost calculations
 */
export interface SeasonalCostImpact {
  /** Whether any seasonal restrictions are active on the route */
  hasRestrictions: boolean
  /** Additional permit cost in cents if seasonal permits are available */
  seasonalPermitCost: number
  /** Whether load exceeds seasonal weight limits */
  exceedsSeasonalLimit: boolean
  /** Adjusted max weight during seasonal restrictions (lbs) */
  adjustedMaxWeight: number
  /** Most restrictive state on the route */
  mostRestrictiveState: string | null
  /** Weight reduction percentage */
  reductionPercent: number
  /** Warnings for the user */
  warnings: string[]
  /** Recommendations for handling seasonal restrictions */
  recommendations: string[]
}

// All cost constants imported from shared ESCORT_COSTS and PERMIT_BASE_COSTS_CENTS in types.ts

/**
 * Calculate the number of escort days required for a route.
 * Oversize loads average ~35 mph (daylight travel, escort restrictions, scale stops)
 * with ~10 driving hours per day (daylight only).
 */
export function calculateEscortDays(distanceMiles: number, avgSpeedMph?: number): number {
  if (distanceMiles <= 0) return 1
  const speed = avgSpeedMph ?? ESCORT_COSTS.OVERSIZE_AVG_SPEED_MPH
  const milesPerDay = speed * ESCORT_COSTS.OVERSIZE_DRIVING_HOURS_PER_DAY
  return Math.max(1, Math.ceil(distanceMiles / milesPerDay))
}

/**
 * Calculate the cost impact of seasonal weight restrictions on a route.
 * Spring thaw restrictions in northern states can reduce allowed weight by 20-50%.
 */
export function calculateSeasonalCostImpact(
  grossWeight: number,
  routeStates: string[],
  shipDate?: Date
): SeasonalCostImpact {
  const checkDate = shipDate || new Date()

  // Check for seasonal restrictions on the route
  const routeCheck = checkRouteSeasonalRestrictions(routeStates, checkDate)

  if (!routeCheck.hasRestrictions) {
    return {
      hasRestrictions: false,
      seasonalPermitCost: 0,
      exceedsSeasonalLimit: false,
      adjustedMaxWeight: LEGAL_LIMITS.GROSS_WEIGHT,
      mostRestrictiveState: null,
      reductionPercent: 0,
      warnings: [],
      recommendations: [],
    }
  }

  // Calculate adjusted weight limits
  const adjustedLimits = calculateAdjustedWeightLimits(
    routeStates,
    LEGAL_LIMITS.GROSS_WEIGHT,
    checkDate
  )

  const exceedsSeasonalLimit = grossWeight > adjustedLimits.adjustedMaxWeight
  const warnings: string[] = [...routeCheck.warnings]
  const recommendations: string[] = [...routeCheck.recommendations]

  // Calculate seasonal permit costs if load exceeds limits
  let seasonalPermitCost = 0

  if (exceedsSeasonalLimit) {
    // Check each affected state for permit availability
    for (const restriction of routeCheck.affectedStates) {
      if (restriction.permitAvailable && restriction.permitFee) {
        seasonalPermitCost += restriction.permitFee * 100 // Convert to cents
      }
    }

    // Add specific warning about weight exceedance
    const excessLbs = grossWeight - adjustedLimits.adjustedMaxWeight
    warnings.unshift(
      `Gross weight ${grossWeight.toLocaleString()} lbs exceeds seasonal limit of ${adjustedLimits.adjustedMaxWeight.toLocaleString()} lbs by ${excessLbs.toLocaleString()} lbs`
    )

    // Add recommendation about splitting load if significantly over
    if (excessLbs > 10000) {
      recommendations.unshift(
        'Consider splitting load across multiple trucks to comply with seasonal restrictions'
      )
    }
  }

  return {
    hasRestrictions: true,
    seasonalPermitCost,
    exceedsSeasonalLimit,
    adjustedMaxWeight: adjustedLimits.adjustedMaxWeight,
    mostRestrictiveState: adjustedLimits.mostRestrictiveState,
    reductionPercent: adjustedLimits.reductionPercent,
    warnings,
    recommendations,
  }
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
 * @param routeStates - Optional array of state codes for regional escort pricing
 */
export function calculatePermitCosts(
  cargoHeight: number,
  cargoWidth: number,
  cargoWeight: number,
  truck: TruckType,
  statesCount: number = 1,
  distanceMiles: number = 0,
  routeStates?: string[]
): SmartPermitCostEstimate {
  const costs: SmartPermitCostEstimate = {
    heightPermit: 0,
    widthPermit: 0,
    weightPermit: 0,
    escorts: 0,
  }

  const totalHeight = truck.deckHeight + cargoHeight
  const escortDays = calculateEscortDays(distanceMiles)

  // Get regional escort cost multiplier (1.0 if no states provided)
  const escortMultiplier = routeStates && routeStates.length > 0
    ? getRouteMaxMultiplier(routeStates)
    : 1.0

  // Height permit (over 13.5 ft) — severity tiers based on real-world permit costs
  // Costs escalate dramatically with height due to route surveys, bridge clearance
  // analysis, utility coordination, and engineering reviews.
  if (totalHeight > LEGAL_LIMITS.HEIGHT) {
    costs.heightPermit = PERMIT_BASE_COSTS_CENTS.HEIGHT * statesCount

    if (totalHeight > 16.5) {
      // Tier 4 (16.6'+): Superload — route survey + utility coordination + engineering
      costs.heightPermit += HEIGHT_PERMIT_TIERS_CENTS.TIER_4_SURCHARGE * statesCount
    } else if (totalHeight > 15.5) {
      // Tier 3 (15.6'-16.5'): Route survey — bridge clearance analysis
      costs.heightPermit += HEIGHT_PERMIT_TIERS_CENTS.TIER_3_SURCHARGE * statesCount
    } else if (totalHeight > 14.5) {
      // Tier 2 (14.6'-15.5'): Enhanced permit — route review, possible pole car
      costs.heightPermit += HEIGHT_PERMIT_TIERS_CENTS.TIER_2_SURCHARGE * statesCount
    }
    // Tier 1 (13.6'-14.5'): base fee only — already included above

    // Utility coordination for loads >16': wire lifting at overhead crossings
    if (totalHeight > 16 && distanceMiles > 0) {
      const estimatedCrossings = Math.ceil(
        distanceMiles / HEIGHT_PERMIT_TIERS_CENTS.UTILITY_CROSSING_INTERVAL_MILES
      )
      costs.heightPermit += estimatedCrossings * HEIGHT_PERMIT_TIERS_CENTS.UTILITY_CROSSING_COST_CENTS
    }
  }

  // Width permit (over 8.5 ft)
  let escortVehicles = 0
  if (cargoWidth > LEGAL_LIMITS.WIDTH) {
    costs.widthPermit = PERMIT_BASE_COSTS_CENTS.WIDTH * statesCount
    // Additional surcharge for extreme overwidth
    if (cargoWidth > 12) {
      costs.widthPermit += 5_000 * statesCount  // $50
      // Escort required — scales with trip duration and regional rates
      costs.escorts += Math.round(ESCORT_COSTS.PILOT_CAR_PER_DAY_CENTS * escortDays * escortMultiplier)
      escortVehicles++
    }
    if (cargoWidth > 14) {
      costs.widthPermit += 10_000 * statesCount  // $100
      // Second escort required — scales with trip duration and regional rates
      costs.escorts += Math.round(ESCORT_COSTS.PILOT_CAR_PER_DAY_CENTS * escortDays * escortMultiplier)
      escortVehicles++
    }
    if (cargoWidth > 16) {
      // Police escort may be required — 8-hour shifts per day
      costs.escorts += Math.round(ESCORT_COSTS.POLICE_ESCORT_PER_HOUR_CENTS * 8 * escortDays * escortMultiplier)
      escortVehicles++
    }
  }

  // Mobilization/demobilization fee per escort vehicle (one-time)
  // Mobilization fees are less variable by region, use base rate
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
    /** States the route traverses (for seasonal restriction checks) */
    routeStates?: string[]
    /** Ship date for seasonal restriction checks and fuel price lookup (defaults to today) */
    shipDate?: Date
    /** Fuel surcharge configuration (uses industry default if not provided) */
    fuelSurchargeConfig?: FuelSurchargeConfig
  } = {}
): SmartLoadCostBreakdown {
  const costData = getTruckCostData(truck)
  const {
    distanceMiles = 500,
    statesCount = 1,
    tripDays = 1,
    routeStates,
    shipDate = new Date(),
    fuelSurchargeConfig = DEFAULT_FUEL_SURCHARGE_CONFIG,
  } = options

  // Get fuel price: use provided price, or look up by date
  const fuelPrice = options.fuelPrice ?? getDieselPriceForDate(shipDate, DEFAULT_FUEL_PRICE_CENTS)

  // Base truck cost (cents)
  const truckCost = Math.round(costData.dailyCostCents * costData.specializedPremium * tripDays)

  // Fuel cost (cents)
  const fuelCost = calculateFuelCost(truck, distanceMiles, fuelPrice)

  // Permit costs (cents) — includes distance-scaled escort costs with regional pricing
  const permitCosts = calculatePermitCosts(
    cargo.height,
    cargo.width,
    cargo.weight,
    truck,
    statesCount,
    distanceMiles,
    routeStates
  )

  // Check seasonal restrictions if route states are provided
  let seasonalCost = 0
  const warnings: string[] = []

  if (routeStates && routeStates.length > 0) {
    const grossWeight = cargo.weight + truck.tareWeight + truck.powerUnitWeight
    const seasonalImpact = calculateSeasonalCostImpact(grossWeight, routeStates, shipDate)

    if (seasonalImpact.hasRestrictions) {
      seasonalCost = seasonalImpact.seasonalPermitCost
      warnings.push(...seasonalImpact.warnings)

      // Add recommendations as warnings for visibility
      if (seasonalImpact.exceedsSeasonalLimit && seasonalImpact.recommendations.length > 0) {
        warnings.push(...seasonalImpact.recommendations)
      }
    }
  }

  // Calculate fuel surcharge on linehaul costs (truckCost + permits, excluding fuel)
  // FSC is typically applied to base freight rates, not the fuel cost itself
  const lineHaulCost = truckCost + permitCosts.heightPermit + permitCosts.widthPermit +
    permitCosts.weightPermit + permitCosts.escorts + seasonalCost
  const fuelSurchargeResult = calculateFuelSurchargeDetailed(lineHaulCost, fuelPrice, fuelSurchargeConfig)

  // Add fuel surcharge warning if significant
  if (fuelSurchargeResult.surchargePercent >= 5) {
    warnings.push(
      `Fuel surcharge: ${fuelSurchargeResult.surchargePercent.toFixed(1)}% (+$${(fuelSurchargeResult.surchargeAmountCents / 100).toFixed(2)}) based on diesel at $${(fuelPrice / 100).toFixed(2)}/gal`
    )
  }

  const totalCost =
    truckCost +
    fuelCost +
    fuelSurchargeResult.surchargeAmountCents +
    permitCosts.heightPermit +
    permitCosts.widthPermit +
    permitCosts.weightPermit +
    permitCosts.escorts +
    seasonalCost

  return {
    truckCost,
    fuelCost,
    fuelSurcharge: fuelSurchargeResult.surchargeAmountCents > 0 ? fuelSurchargeResult.surchargeAmountCents : undefined,
    fuelSurchargePercent: fuelSurchargeResult.surchargePercent > 0 ? fuelSurchargeResult.surchargePercent : undefined,
    permitCosts,
    seasonalCost: seasonalCost > 0 ? seasonalCost : undefined,
    totalCost,
    warnings: warnings.length > 0 ? warnings : undefined,
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
    routeStates?: string[]
    shipDate?: Date
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
    routeStates?: string[]
    shipDate?: Date
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
    routeStates?: string[]
    shipDate?: Date
  } = {}
): {
  perTruckCosts: SmartLoadCostBreakdown[]
  totalCost: number
  averageCostPerItem: number
  /** Aggregated warnings from all trucks */
  warnings?: string[]
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

  // Aggregate warnings from all trucks (deduplicated)
  const allWarnings = perTruckCosts.flatMap(c => c.warnings || [])
  const uniqueWarnings = [...new Set(allWarnings)]

  return {
    perTruckCosts,
    totalCost: Math.round(totalCost),
    averageCostPerItem: totalItems > 0
      ? Math.round(totalCost / totalItems)
      : 0,
    warnings: uniqueWarnings.length > 0 ? uniqueWarnings : undefined,
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
    routeStates?: string[]
    shipDate?: Date
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
