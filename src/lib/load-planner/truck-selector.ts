/**
 * Truck Selector Algorithm for Load Planner
 *
 * CRITICAL CALCULATION:
 * Total Height = Cargo Height + Trailer Deck Height
 * This must be <= 13.5 feet to be legal without permits
 *
 * The algorithm scores each truck type based on:
 * 1. Whether cargo fits within legal limits
 * 2. How well the truck matches the cargo size
 * 3. Required permits and their costs
 */

import type {
  TruckType,
  TruckRecommendation,
  FitAnalysis,
  PermitRequired,
  ParsedLoad,
  ScoreBreakdown,
  FitOptimization,
  ItemPlacement3D,
} from './types'
import { trucks, LEGAL_LIMITS, SUPERLOAD_THRESHOLDS } from './trucks'
import { DEFAULT_AXLE_CONFIGS } from './types'
import {
  hasSeasonalRestrictions,
  getSeasonalRestriction,
  calculateAdjustedWeightLimits,
  type SeasonalRestriction,
} from './seasonal-restrictions'
import { calculateAxleWeights } from './weight-distribution'
import { validateBridgeFormula } from './bridge-formula'
import { validateKPRA } from './kpra-validator'

// =============================================================================
// TRUCK AVAILABILITY TIERS
// Tier 1 = common/readily available, Tier 4 = rare superload equipment
// =============================================================================

const TRUCK_TIERS: Record<string, number> = {
  // Tier 1: Common, readily available (bonus +10)
  'flatbed-48': 1, 'flatbed-53': 1, 'step-deck-48': 1, 'step-deck-53': 1,
  'dry-van-53': 1, 'dry-van-48': 1, 'hotshot-40': 1, 'step-deck-ramps': 1,
  'aluminum-flatbed': 1,
  // Tier 2: Available with coordination (no modifier)
  'rgn-2axle': 2, 'rgn-3axle': 2, 'lowboy-2axle': 2,
  'conestoga': 2, 'landoll': 2, 'landoll-50': 2, 'double-drop': 2,
  'stretch-flatbed': 2, 'stretch-step-deck': 2, 'low-pro-step-deck': 2,
  'flatbed-moffett': 2, 'combo-flatbed': 2, 'drop-deck-combo': 2,
  'detach-lowboy': 2, 'mini-rgn': 2, 'curtain-side': 2,
  'hopper-bottom': 2, 'end-dump': 2, 'side-dump': 2,
  'auto-carrier-8': 2, 'auto-carrier-wedge': 2,
  // Tier 3: Specialty, requires advance booking (penalty -15)
  'rgn-4axle': 3, 'lowboy-3axle': 3, 'lowboy-4axle': 3,
  'stretch-rgn': 3, 'stretch-lowboy': 3, 'stretch-double-drop': 3,
  'reefer-53': 3, 'reefer-48': 3, 'hydraulic-lowboy': 3,
  'double-drop-beavertail': 3, 'extendable-rgn-80': 3,
  'heavy-equipment-float': 3, 'oil-field-lowboy': 3,
  'expandable-flatbed': 3, 'tanker-liquid': 3, 'pneumatic-tanker': 3,
  'jeep-dolly': 3, 'flatbed-piggyback': 3, 'double-wide-flatbed': 3,
  'pole-trailer': 3, 'beam-hauler': 3, 'livestock-trailer': 3,
  // Tier 4: Rare superload equipment — filtered out for normal cargo (penalty -30)
  'multi-axle-9': 4, 'multi-axle-13': 4, 'multi-axle-19': 4,
  'schnabel': 4, 'spmt': 4, 'perimeter-beam': 4,
  'blade-trailer': 4, 'steerable-dolly': 4,
  'tower-trailer': 4, 'nacelle-trailer': 4,
}

function getTruckTier(truckId: string): number {
  return TRUCK_TIERS[truckId] || 2
}

function getTierScoreModifier(tier: number): number {
  switch (tier) {
    case 1: return 10   // bonus for common trucks
    case 2: return 0
    case 3: return -15
    case 4: return -30
    default: return 0
  }
}

// =============================================================================
// EQUIPMENT MATCHING PROFILES
// Enhanced cargo-to-truck matching based on equipment type keywords
// =============================================================================

interface EquipmentMatchProfile {
  keywords: string[]
  preferredCategories: string[]
  avoidCategories: string[]
  loadingPreference: 'drive-on' | 'crane' | 'forklift' | 'any'
  heightSensitive: boolean
  widthSensitive: boolean
}

const EQUIPMENT_PROFILES: Record<string, EquipmentMatchProfile> = {
  excavator: {
    keywords: ['excavator', 'backhoe', 'digger', 'cat 320', 'cat 330', 'cat 336', 'hitachi', 'komatsu pc', 'volvo ec', 'deere 350', 'deere 470'],
    preferredCategories: ['RGN', 'LOWBOY', 'STEP_DECK'],
    avoidCategories: ['DRY_VAN', 'FLATBED', 'CONESTOGA'],
    loadingPreference: 'drive-on',
    heightSensitive: true,
    widthSensitive: false,
  },
  dozer: {
    keywords: ['dozer', 'bulldozer', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'cat d', 'deere 850', 'komatsu d'],
    preferredCategories: ['RGN', 'LOWBOY'],
    avoidCategories: ['DRY_VAN', 'FLATBED', 'STEP_DECK'],
    loadingPreference: 'drive-on',
    heightSensitive: true,
    widthSensitive: true,
  },
  loader: {
    keywords: ['loader', 'wheel loader', 'front loader', 'cat 950', 'cat 966', 'cat 980', 'volvo l', 'deere 544', 'deere 644', 'deere 844'],
    preferredCategories: ['RGN', 'LOWBOY', 'STEP_DECK'],
    avoidCategories: ['DRY_VAN', 'FLATBED'],
    loadingPreference: 'drive-on',
    heightSensitive: true,
    widthSensitive: false,
  },
  crane: {
    keywords: ['crane', 'crawler crane', 'lattice crane', 'rough terrain crane', 'rt crane', 'grove', 'liebherr', 'manitowoc', 'link-belt'],
    preferredCategories: ['LOWBOY', 'MULTI_AXLE', 'RGN'],
    avoidCategories: ['DRY_VAN', 'FLATBED', 'STEP_DECK'],
    loadingPreference: 'crane',
    heightSensitive: true,
    widthSensitive: true,
  },
  forklift: {
    keywords: ['forklift', 'telehandler', 'reach stacker', 'toyota forklift', 'hyster', 'yale', 'crown forklift', 'cat forklift'],
    preferredCategories: ['FLATBED', 'STEP_DECK', 'LANDOLL'],
    avoidCategories: ['DRY_VAN'],
    loadingPreference: 'drive-on',
    heightSensitive: false,
    widthSensitive: false,
  },
  tractor: {
    keywords: ['tractor', 'farm tractor', 'agricultural', 'john deere', 'case ih', 'new holland', 'kubota', 'massey ferguson'],
    preferredCategories: ['STEP_DECK', 'RGN', 'FLATBED'],
    avoidCategories: ['DRY_VAN'],
    loadingPreference: 'drive-on',
    heightSensitive: false,
    widthSensitive: false,
  },
  skidsteer: {
    keywords: ['skid steer', 'skidsteer', 'bobcat', 'compact loader', 'cat 259', 'cat 299', 'deere 333'],
    preferredCategories: ['FLATBED', 'STEP_DECK', 'LANDOLL'],
    avoidCategories: [],
    loadingPreference: 'drive-on',
    heightSensitive: false,
    widthSensitive: false,
  },
  transformer: {
    keywords: ['transformer', 'power transformer', 'substation', 'electrical transformer'],
    preferredCategories: ['MULTI_AXLE', 'SCHNABEL', 'LOWBOY'],
    avoidCategories: ['FLATBED', 'DRY_VAN', 'STEP_DECK'],
    loadingPreference: 'crane',
    heightSensitive: false,
    widthSensitive: true,
  },
  windTurbine: {
    keywords: ['wind turbine', 'blade', 'nacelle', 'tower section', 'wind tower'],
    preferredCategories: ['BLADE', 'SPECIALIZED', 'MULTI_AXLE'],
    avoidCategories: ['DRY_VAN', 'FLATBED'],
    loadingPreference: 'crane',
    heightSensitive: true,
    widthSensitive: true,
  },
  boat: {
    keywords: ['boat', 'yacht', 'vessel', 'watercraft', 'sailboat', 'powerboat'],
    preferredCategories: ['STEP_DECK', 'RGN', 'SPECIALIZED'],
    avoidCategories: ['DRY_VAN', 'FLATBED'],
    loadingPreference: 'crane',
    heightSensitive: true,
    widthSensitive: true,
  },
  modularBuilding: {
    keywords: ['modular', 'portable building', 'office trailer', 'mobile office', 'construction trailer'],
    preferredCategories: ['STEP_DECK', 'RGN', 'SPECIALIZED'],
    avoidCategories: ['DRY_VAN', 'FLATBED'],
    loadingPreference: 'crane',
    heightSensitive: true,
    widthSensitive: true,
  },
  tank: {
    keywords: ['tank', 'pressure vessel', 'storage tank', 'propane tank', 'fuel tank'],
    preferredCategories: ['STEP_DECK', 'RGN', 'FLATBED'],
    avoidCategories: ['DRY_VAN'],
    loadingPreference: 'crane',
    heightSensitive: false,
    widthSensitive: true,
  },
}

/**
 * Get equipment match bonus based on cargo description
 */
function getEquipmentMatchBonus(cargo: ParsedLoad, truck: TruckType): { bonus: number; matchedProfile: string | null } {
  const description = cargo.description?.toLowerCase() || ''
  const itemDescriptions = cargo.items?.map(i => i.description?.toLowerCase() || '').join(' ') || ''
  const combinedText = `${description} ${itemDescriptions}`

  for (const [profileName, profile] of Object.entries(EQUIPMENT_PROFILES)) {
    // Check if any keyword matches
    const keywordMatch = profile.keywords.some(kw => combinedText.includes(kw))
    if (!keywordMatch) continue

    let bonus = 0

    // Check if truck category is preferred
    if (profile.preferredCategories.includes(truck.category)) {
      bonus += 15
    }

    // Check if truck category should be avoided
    if (profile.avoidCategories.includes(truck.category)) {
      bonus -= 20
    }

    // Check loading method preference
    if (profile.loadingPreference !== 'any') {
      if (truck.loadingMethod === profile.loadingPreference) {
        bonus += 10
      } else if (profile.loadingPreference === 'drive-on' && truck.loadingMethod !== 'drive-on') {
        bonus -= 10
      }
    }

    return { bonus, matchedProfile: profileName }
  }

  return { bonus: 0, matchedProfile: null }
}

/**
 * Analyze how cargo fits on a specific truck
 * For multi-zone trailers (step deck, double drop, RGN), uses the lowest deck height
 * (best case for height legality). Zone-specific placement is handled by the placement algorithm.
 */
function analyzeFit(cargo: ParsedLoad, truck: TruckType): FitAnalysis {
  // For multi-zone trailers, find the lowest deck height (most cargo clearance)
  // This gives us the "best case" for legality - actual placement may be more restrictive
  let effectiveDeckHeight = truck.deckHeight
  if (truck.deckZones && truck.deckZones.length > 0) {
    effectiveDeckHeight = Math.min(...truck.deckZones.map(z => z.deckHeight))
  }

  // CRITICAL: Total height = cargo height + deck height
  const totalHeight = cargo.height + effectiveDeckHeight

  // Calculate total weight (cargo + trailer tare + tractor)
  const totalWeight =
    cargo.weight + truck.tareWeight + truck.powerUnitWeight

  // Check against legal limits
  const exceedsHeight = totalHeight > LEGAL_LIMITS.HEIGHT
  const exceedsWidth = cargo.width > LEGAL_LIMITS.WIDTH
  const exceedsWeight = totalWeight > LEGAL_LIMITS.GROSS_WEIGHT
  const exceedsLength = cargo.length > truck.deckLength

  // Calculate clearances
  const heightClearance = LEGAL_LIMITS.HEIGHT - totalHeight
  const widthClearance = LEGAL_LIMITS.WIDTH - cargo.width
  const weightClearance = LEGAL_LIMITS.GROSS_WEIGHT - totalWeight

  // Does it physically fit?
  const fits =
    cargo.length <= truck.deckLength &&
    cargo.width <= truck.deckWidth &&
    cargo.weight <= truck.maxCargoWeight

  return {
    fits,
    totalHeight,
    heightClearance,
    widthClearance,
    totalWeight,
    weightClearance,
    isLegal: !exceedsHeight && !exceedsWidth && !exceedsWeight && !exceedsLength,
    exceedsHeight,
    exceedsWidth,
    exceedsWeight,
    exceedsLength,
  }
}

/**
 * Determine required permits based on cargo and fit analysis
 */
function determinePermits(
  cargo: ParsedLoad,
  fit: FitAnalysis
): PermitRequired[] {
  const permits: PermitRequired[] = []

  // Check width permit
  if (fit.exceedsWidth) {
    const isSuperload = cargo.width > SUPERLOAD_THRESHOLDS.WIDTH
    permits.push({
      type: isSuperload ? 'SUPERLOAD' : 'OVERSIZE_WIDTH',
      reason: `Width of ${cargo.width.toFixed(1)}' exceeds ${LEGAL_LIMITS.WIDTH}' legal limit`,
      estimatedCost: isSuperload ? 500 : 100,
    })
  }

  // Check height permit
  if (fit.exceedsHeight) {
    const isSuperload = fit.totalHeight > SUPERLOAD_THRESHOLDS.HEIGHT
    permits.push({
      type: isSuperload ? 'SUPERLOAD' : 'OVERSIZE_HEIGHT',
      reason: `Total height of ${fit.totalHeight.toFixed(1)}' exceeds ${LEGAL_LIMITS.HEIGHT}' legal limit`,
      estimatedCost: isSuperload ? 500 : 100,
    })
  }

  // Check weight permit
  if (fit.exceedsWeight) {
    const isSuperload = fit.totalWeight > SUPERLOAD_THRESHOLDS.WEIGHT
    permits.push({
      type: isSuperload ? 'SUPERLOAD' : 'OVERWEIGHT',
      reason: `GVW of ${fit.totalWeight.toLocaleString()} lbs exceeds ${LEGAL_LIMITS.GROSS_WEIGHT.toLocaleString()} lbs limit`,
      estimatedCost: isSuperload ? 750 : 150,
    })
  }

  // Check length permit
  if (fit.exceedsLength) {
    permits.push({
      type: 'OVERSIZE_LENGTH',
      reason: `Length of ${cargo.length.toFixed(1)}' may require permits in some states`,
      estimatedCost: 75,
    })
  }

  return permits
}

/**
 * Calculate recommendation score for a truck with detailed breakdown
 *
 * Score breakdown:
 * - Base score: 100
 * - Deductions for exceeded limits (proportional to severity)
 * - Deductions for overkill (using lowboy for short cargo)
 * - Cost-weighted permit penalties (expensive permits penalized more)
 * - Bonuses for ideal fit and equipment matching
 *
 * @param cargo - Parsed cargo information
 * @param truck - Truck type being scored
 * @param fit - Fit analysis results
 * @param permits - Required permits
 * @param historicalBonus - Optional bonus from historical success data (0-15)
 * @returns Object with final score and detailed breakdown
 */
/**
 * Context for seasonal weight restriction calculations
 */
export interface SeasonalContext {
  routeStates: string[]
  shipDate: Date
  adjustedMaxWeight: number
  mostRestrictiveState: string | null
  reductionPercent: number
}

function calculateScore(
  cargo: ParsedLoad,
  truck: TruckType,
  fit: FitAnalysis,
  permits: PermitRequired[],
  historicalBonus: number = 0,
  seasonalContext?: SeasonalContext,
  routeStates?: string[]
): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    baseScore: 100,
    fitPenalty: 0,
    heightPenalty: 0,
    widthPenalty: 0,
    weightPenalty: 0,
    overkillPenalty: 0,
    permitPenalty: 0,
    idealFitBonus: 0,
    equipmentMatchBonus: 0,
    historicalBonus: 0,
    seasonalPenalty: 0,
    bridgePenalty: 0,
    kpraPenalty: 0,
    escortProximityWarning: false,
    finalScore: 0,
  }

  let score = 100

  // Major deductions for exceeded limits
  if (!fit.fits) {
    breakdown.fitPenalty = 50
    score -= 50 // Cargo physically doesn't fit
  }

  if (fit.exceedsHeight) {
    // Deduct based on how much it exceeds
    const excess = fit.totalHeight - LEGAL_LIMITS.HEIGHT
    breakdown.heightPenalty = Math.min(40, Math.round(excess * 10)) // Up to 40 points
    score -= breakdown.heightPenalty
  }

  if (fit.exceedsWidth) {
    const excess = cargo.width - LEGAL_LIMITS.WIDTH
    breakdown.widthPenalty = Math.min(25, Math.round(excess * 5)) // Up to 25 points
    score -= breakdown.widthPenalty
  }

  if (fit.exceedsWeight) {
    const excessPercent =
      ((fit.totalWeight - LEGAL_LIMITS.GROSS_WEIGHT) / LEGAL_LIMITS.GROSS_WEIGHT) * 100
    breakdown.weightPenalty = Math.min(30, Math.round(excessPercent)) // Up to 30 points
    score -= breakdown.weightPenalty
  }

  // Deduction for overkill trailer choice
  // Height overkill: using a low-deck trailer when not needed
  if (fit.heightClearance > 3) {
    breakdown.overkillPenalty = 10
    score -= 10
  }

  // Weight capacity overkill: using a truck with 3× more capacity than needed
  if (truck.maxCargoWeight > cargo.weight * 3 && cargo.weight > 0) {
    const capacityRatio = truck.maxCargoWeight / cargo.weight
    const weightOverkillPenalty = Math.min(20, Math.round(capacityRatio * 2))
    breakdown.overkillPenalty += weightOverkillPenalty
    score -= weightOverkillPenalty
  }

  // Truck availability tier penalty/bonus
  const tierModifier = getTierScoreModifier(getTruckTier(truck.id))
  score += tierModifier

  // OPTIMIZATION #1: Cost-weighted permit penalty
  // Instead of flat -5 per permit, use actual estimated costs
  // A $500 superload permit should penalize more than a $75 basic permit
  const totalPermitCost = permits.reduce((sum, p) => sum + (p.estimatedCost || 100), 0)
  // Scale: $50 = 1 point, max 30 points
  breakdown.permitPenalty = Math.min(30, Math.round(totalPermitCost / 50))
  score -= breakdown.permitPenalty

  // Bonus for ideal deck height match
  if (fit.heightClearance >= 0 && fit.heightClearance <= 1) {
    // Perfect height fit (within 1 foot of limit)
    breakdown.idealFitBonus = 5
    score += 5
  }

  // OPTIMIZATION #4: Enhanced equipment matching
  const { bonus: equipmentBonus } = getEquipmentMatchBonus(cargo, truck)
  breakdown.equipmentMatchBonus = equipmentBonus
  score += equipmentBonus

  // OPTIMIZATION #3: Historical data bonus (passed in from external query)
  if (historicalBonus > 0) {
    breakdown.historicalBonus = Math.min(15, historicalBonus)
    score += breakdown.historicalBonus
  }

  // OPTIMIZATION #6: Seasonal restriction penalty
  // If route traverses states with active seasonal weight restrictions,
  // penalize trucks that would be overweight under the reduced limits
  if (seasonalContext && seasonalContext.adjustedMaxWeight < LEGAL_LIMITS.GROSS_WEIGHT) {
    const truckGrossWeight = cargo.weight + truck.tareWeight + truck.powerUnitWeight
    if (truckGrossWeight > seasonalContext.adjustedMaxWeight) {
      // Calculate how much over the seasonal limit
      const excessPercent = ((truckGrossWeight - seasonalContext.adjustedMaxWeight) / seasonalContext.adjustedMaxWeight) * 100
      // Penalty based on severity: 10-25 points
      breakdown.seasonalPenalty = Math.min(25, Math.max(10, Math.round(excessPercent / 2)))
      score -= breakdown.seasonalPenalty
    }
  }

  // Bridge Formula B penalty
  // Estimate axle weights assuming cargo CG at deck center, then validate
  if (cargo.weight > 0 && truck.powerUnitWeight > 0) {
    const syntheticItem = {
      id: '_scoring', description: '', quantity: 1,
      length: cargo.length, width: cargo.width, height: cargo.height,
      weight: cargo.weight,
    }
    const syntheticPlacement: ItemPlacement3D = {
      itemId: '_scoring',
      x: Math.max(0, truck.deckLength / 2 - cargo.length / 2),
      y: 0, z: 0, rotated: false, layer: 0,
    }
    const axleConfig = DEFAULT_AXLE_CONFIGS[truck.category]
    const estimatedAxleWeights = calculateAxleWeights(
      [syntheticItem], [syntheticPlacement], truck, axleConfig
    )
    const bridgeResult = validateBridgeFormula(estimatedAxleWeights, truck, axleConfig)
    if (!bridgeResult.passes) {
      // Penalty: 15-30 points based on severity
      breakdown.bridgePenalty = Math.min(30, 15 + bridgeResult.violations.length * 5)
      score -= breakdown.bridgePenalty
    } else if (bridgeResult.worstMarginPercent < 5) {
      // Near-limit: small penalty
      breakdown.bridgePenalty = 5
      score -= 5
    }
  }

  // KPRA (Kingpin-to-Rear-Axle) penalty for CA/OR/WA routes
  if (routeStates && routeStates.length > 0) {
    const kpraResult = validateKPRA(truck, routeStates)
    if (!kpraResult.passes) {
      // Penalty: 15-25 points based on severity
      const worstExcess = Math.max(...kpraResult.stateResults.map(r => r.excess))
      breakdown.kpraPenalty = Math.min(25, 15 + Math.round(worstExcess * 2))
      score -= breakdown.kpraPenalty
    }
  }

  // OPTIMIZATION #7: Escort proximity warning
  // Flag when cargo dimensions are within 6 inches of common escort thresholds
  // This helps users know they're close to incurring significant additional costs
  const escortWidthThresholds = [12, 14, 16] // feet - common escort requirement triggers
  const escortHeightThreshold = 14.5 // feet - height requiring route survey

  for (const threshold of escortWidthThresholds) {
    if (cargo.width > threshold - 0.5 && cargo.width <= threshold) {
      breakdown.escortProximityWarning = true
      break
    }
  }
  if (fit.totalHeight > escortHeightThreshold - 0.5 && fit.totalHeight <= escortHeightThreshold) {
    breakdown.escortProximityWarning = true
  }

  // Ensure score is within bounds
  breakdown.finalScore = Math.max(0, Math.min(100, Math.round(score)))

  return { score: breakdown.finalScore, breakdown }
}

/**
 * Generate recommendation reason text
 */
function generateReason(
  truck: TruckType,
  fit: FitAnalysis,
  permits: PermitRequired[]
): string {
  const reasons: string[] = []

  if (fit.isLegal && fit.fits) {
    reasons.push(`Cargo fits legally with ${fit.heightClearance.toFixed(1)}' height clearance`)
  } else if (fit.fits && !fit.isLegal) {
    reasons.push(`Cargo fits but requires ${permits.length} permit(s)`)
  } else {
    reasons.push('Cargo may not fit optimally on this trailer')
  }

  // Add deck height context
  reasons.push(
    `${truck.deckHeight}' deck height allows up to ${truck.maxLegalCargoHeight}' cargo`
  )

  return reasons.join('. ')
}

/**
 * Generate warnings for the recommendation
 */
function generateWarnings(
  cargo: ParsedLoad,
  truck: TruckType,
  fit: FitAnalysis,
  permits: PermitRequired[]
): string[] {
  const warnings: string[] = []

  if (fit.exceedsHeight) {
    warnings.push(
      `Total height ${fit.totalHeight.toFixed(1)}' exceeds 13.5' legal limit - oversize permit required`
    )
  }

  if (fit.exceedsWidth) {
    warnings.push(
      `Width ${cargo.width.toFixed(1)}' exceeds 8.5' legal limit - oversize permit required`
    )
  }

  if (fit.exceedsWeight) {
    warnings.push(
      `GVW ${fit.totalWeight.toLocaleString()} lbs exceeds 80,000 lbs - overweight permit required`
    )
  }

  if (cargo.width > 12) {
    warnings.push('Width over 12\' may require escort vehicles in most states')
  }

  if (cargo.width > 14) {
    warnings.push('Width over 14\' typically requires multiple escorts')
  }

  if (fit.totalHeight > 14) {
    warnings.push('Height over 14\' may require route survey for bridges')
  }

  // Multi-zone trailer warnings
  if (truck.deckZones && truck.deckZones.length > 0) {
    // Find zones where cargo height would be illegal
    const illegalZones = truck.deckZones.filter(zone => {
      const totalHeightInZone = cargo.height + zone.deckHeight
      return totalHeightInZone > LEGAL_LIMITS.HEIGHT
    })

    if (illegalZones.length > 0 && illegalZones.length < truck.deckZones.length) {
      // Some zones are legal, some are not
      const legalZones = truck.deckZones.filter(zone => {
        const totalHeightInZone = cargo.height + zone.deckHeight
        return totalHeightInZone <= LEGAL_LIMITS.HEIGHT
      })
      const legalZoneNames = legalZones.map(z => z.name).join(', ')
      const illegalZoneNames = illegalZones.map(z => z.name).join(', ')
      warnings.push(
        `Cargo must be placed on ${legalZoneNames} deck (not ${illegalZoneNames}) to stay legal`
      )
    }
  }

  // Superload warnings
  const hasSuperload = permits.some(p => p.type === 'SUPERLOAD')
  if (hasSuperload) {
    warnings.push(
      'SUPERLOAD: This load exceeds superload thresholds - expect extended permit processing and route restrictions'
    )
  }

  return warnings
}

// =============================================================================
// SMART FIT ALTERNATIVES (OPTIMIZATION #5)
// Suggest modifications for borderline loads to avoid permits
// =============================================================================

/**
 * Analyze fit alternatives for borderline loads
 * When cargo is within 1-2 feet of legal limits, suggest practical modifications
 */
function analyzeFitAlternatives(
  cargo: ParsedLoad,
  truck: TruckType,
  fit: FitAnalysis,
  permits: PermitRequired[]
): FitOptimization[] {
  const alternatives: FitOptimization[] = []

  // Only suggest alternatives if there are permits to avoid
  if (permits.length === 0) return alternatives

  // Check height - can we avoid permit with slight reduction?
  if (fit.exceedsHeight && fit.totalHeight <= LEGAL_LIMITS.HEIGHT + 2) {
    const reduction = fit.totalHeight - LEGAL_LIMITS.HEIGHT + 0.1 // Add buffer
    const heightPermitCost = permits.find(p => p.type === 'OVERSIZE_HEIGHT' || p.type === 'SUPERLOAD')?.estimatedCost || 100

    // Find a lower-deck truck that would work
    const lowerTrucks = trucks.filter(t =>
      t.deckHeight < truck.deckHeight &&
      cargo.weight <= t.maxCargoWeight &&
      cargo.length <= t.deckLength &&
      cargo.width <= t.deckWidth
    )

    if (lowerTrucks.length > 0) {
      const bestLowerTruck = lowerTrucks.sort((a, b) => a.deckHeight - b.deckHeight)[0]
      const newTotalHeight = cargo.height + bestLowerTruck.deckHeight

      if (newTotalHeight <= LEGAL_LIMITS.HEIGHT) {
        alternatives.push({
          type: 'as-is',
          modification: `Use ${bestLowerTruck.name} instead (${bestLowerTruck.deckHeight}' deck vs ${truck.deckHeight}' deck)`,
          resultingTruck: bestLowerTruck,
          permitsSaved: permits.filter(p => p.type === 'OVERSIZE_HEIGHT' || p.type === 'SUPERLOAD').length,
          costSavings: heightPermitCost,
          feasibility: 'easy',
        })
      }
    }

    // Suggest disassembly if reduction is small
    if (reduction <= 1.5) {
      alternatives.push({
        type: 'reduced-height',
        modification: `Reduce cargo height by ${reduction.toFixed(1)}' (remove attachments, lower boom, etc.)`,
        dimensionChange: {
          dimension: 'height',
          currentValue: cargo.height,
          targetValue: cargo.height - reduction,
          reduction,
        },
        permitsSaved: 1,
        costSavings: heightPermitCost,
        feasibility: reduction <= 0.5 ? 'easy' : reduction <= 1 ? 'moderate' : 'difficult',
      })
    }
  }

  // Check width - can we avoid permit with slight reduction?
  if (fit.exceedsWidth && cargo.width <= LEGAL_LIMITS.WIDTH + 2) {
    const reduction = cargo.width - LEGAL_LIMITS.WIDTH + 0.1
    const widthPermitCost = permits.find(p => p.type === 'OVERSIZE_WIDTH' || p.type === 'SUPERLOAD')?.estimatedCost || 100

    if (reduction <= 1) {
      alternatives.push({
        type: 'reduced-width',
        modification: `Reduce width by ${(reduction * 12).toFixed(0)}" (remove mirrors, fold attachments, etc.)`,
        dimensionChange: {
          dimension: 'width',
          currentValue: cargo.width,
          targetValue: cargo.width - reduction,
          reduction,
        },
        permitsSaved: 1,
        costSavings: widthPermitCost,
        feasibility: reduction <= 0.5 ? 'easy' : 'moderate',
      })
    }
  }

  // Check if tilt transport could help (for tracked equipment)
  const description = (cargo.description || '').toLowerCase()
  const itemDescriptions = cargo.items?.map(i => i.description?.toLowerCase() || '').join(' ') || ''
  const isTiltable = /excavator|trackhoe|dozer|bulldozer|loader/.test(`${description} ${itemDescriptions}`)

  if (isTiltable && fit.exceedsHeight && cargo.height > 10) {
    const tiltReduction = cargo.height * 0.15 // ~15% height reduction when tilted
    const tiltedHeight = cargo.height - tiltReduction + truck.deckHeight

    if (tiltedHeight <= LEGAL_LIMITS.HEIGHT) {
      alternatives.push({
        type: 'tilt-transport',
        modification: `Transport tilted on angled blocks (reduces height by ~${(tiltReduction * 12).toFixed(0)}")`,
        dimensionChange: {
          dimension: 'height',
          currentValue: cargo.height,
          targetValue: cargo.height - tiltReduction,
          reduction: tiltReduction,
        },
        permitsSaved: 1,
        costSavings: permits.find(p => p.type === 'OVERSIZE_HEIGHT')?.estimatedCost || 100,
        feasibility: 'moderate',
      })
    }
  }

  return alternatives
}

/**
 * Options for truck selection
 */
export interface TruckSelectionOptions {
  /** Historical bonus data by truck category (from load_history queries) */
  historicalBonuses?: Record<string, number>
  /** Include fit alternatives for borderline loads */
  includeFitAlternatives?: boolean
  /** States that the route will traverse (for seasonal restrictions) */
  routeStates?: string[]
  /** Ship date for checking seasonal restrictions (defaults to today) */
  shipDate?: Date
}

/**
 * Main function: Select and rank trucks for a given cargo
 *
 * @param cargo - Parsed load information
 * @param options - Optional configuration for enhanced features
 * @returns Array of truck recommendations sorted by score (best first)
 */
export function selectTrucks(cargo: ParsedLoad, options?: TruckSelectionOptions): TruckRecommendation[] {
  const recommendations: TruckRecommendation[] = []
  const historicalBonuses = options?.historicalBonuses || {}

  // Filter out Tier 4 (superload) trucks unless cargo actually needs them
  const needsSuperload = cargo.weight > 100000
  const availableTrucks = needsSuperload
    ? trucks
    : trucks.filter(t => getTruckTier(t.id) < 4)

  // Calculate seasonal restriction context if route states are provided
  let seasonalContext: SeasonalContext | undefined
  if (options?.routeStates && options.routeStates.length > 0) {
    const shipDate = options.shipDate || new Date()
    const adjustedLimits = calculateAdjustedWeightLimits(options.routeStates, LEGAL_LIMITS.GROSS_WEIGHT, shipDate)

    // Only create seasonal context if there are active restrictions
    if (adjustedLimits.reductionPercent > 0) {
      seasonalContext = {
        routeStates: options.routeStates,
        shipDate,
        adjustedMaxWeight: adjustedLimits.adjustedMaxWeight,
        mostRestrictiveState: adjustedLimits.mostRestrictiveState,
        reductionPercent: adjustedLimits.reductionPercent,
      }
    }
  }

  for (const truck of availableTrucks) {
    const fit = analyzeFit(cargo, truck)
    const permits = determinePermits(cargo, fit)

    // Get historical bonus for this truck category (if available)
    const historicalBonus = historicalBonuses[truck.category] || 0

    const { score, breakdown } = calculateScore(cargo, truck, fit, permits, historicalBonus, seasonalContext, options?.routeStates)
    const reason = generateReason(truck, fit, permits)
    let warnings = generateWarnings(cargo, truck, fit, permits)

    // Add seasonal restriction warning if applicable
    if (seasonalContext && breakdown.seasonalPenalty > 0) {
      warnings = [
        `Spring weight restrictions active in ${seasonalContext.mostRestrictiveState} - max ${(seasonalContext.adjustedMaxWeight / 1000).toFixed(0)}k lbs (${seasonalContext.reductionPercent}% reduction)`,
        ...warnings,
      ]
    }

    // Add KPRA violation warning if applicable
    if (breakdown.kpraPenalty > 0 && options?.routeStates) {
      const kpraResult = validateKPRA(truck, options.routeStates)
      for (const violation of kpraResult.violations) {
        warnings = [violation, ...warnings]
      }
      if (kpraResult.suggestions.length > 0) {
        warnings = [...warnings, ...kpraResult.suggestions]
      }
    }

    // Add escort proximity warning if applicable
    if (breakdown.escortProximityWarning) {
      warnings = [
        `Cargo dimensions are near escort thresholds - consider slight reduction to avoid escort costs`,
        ...warnings,
      ]
    }

    // OPTIMIZATION #5: Analyze fit alternatives for borderline loads
    const fitAlternatives = options?.includeFitAlternatives
      ? analyzeFitAlternatives(cargo, truck, fit, permits)
      : undefined

    recommendations.push({
      truck,
      score,
      scoreBreakdown: breakdown,
      fit,
      permitsRequired: permits,
      fitAlternatives,
      reason,
      warnings,
      isBestChoice: false, // Will be set after sorting
    })
  }

  // Sort by score (highest first)
  recommendations.sort((a, b) => b.score - a.score)

  // Mark the best choice
  if (recommendations.length > 0) {
    recommendations[0].isBestChoice = true
  }

  return recommendations
}

/**
 * Get only trucks that can legally haul the cargo (no permits)
 */
export function getLegalTrucks(cargo: ParsedLoad): TruckRecommendation[] {
  return selectTrucks(cargo).filter(rec => rec.fit.isLegal)
}

/**
 * Get the single best truck recommendation
 */
export function getBestTruck(cargo: ParsedLoad): TruckRecommendation | null {
  const recommendations = selectTrucks(cargo)
  return recommendations.length > 0 ? recommendations[0] : null
}

/**
 * Quick check if cargo can be transported legally on any truck
 */
export function canTransportLegally(cargo: ParsedLoad): boolean {
  return getLegalTrucks(cargo).length > 0
}

/**
 * Select best trucks for multiple cargo items
 */
export function selectTrucksForMultipleCargo(
  cargoItems: ParsedLoad[]
): Map<string, TruckRecommendation[]> {
  const results = new Map<string, TruckRecommendation[]>()

  for (const cargo of cargoItems) {
    const key = cargo.id || `cargo-${cargoItems.indexOf(cargo)}`
    results.set(key, selectTrucks(cargo))
  }

  return results
}

/**
 * Public export: Calculate fit analysis for cargo on a specific truck
 */
export function calculateFitAnalysis(cargo: ParsedLoad, truck: TruckType): FitAnalysis {
  return analyzeFit(cargo, truck)
}

/**
 * Public export: Get required permits for cargo on a specific truck
 */
export function getRequiredPermits(cargo: ParsedLoad, truck: TruckType): PermitRequired[] {
  const fit = analyzeFit(cargo, truck)
  return determinePermits(cargo, fit)
}
