/**
 * KPRA (Kingpin-to-Rear-Axle) Validation Module
 *
 * Several western states enforce maximum KPRA distance limits:
 *   - California: 40 ft (CVC §35400) — strictly enforced at weigh stations
 *   - Oregon:     43 ft (ORS 818.060)
 *   - Washington: 43 ft (RCW 46.44.036)
 *
 * KPRA is the distance from the kingpin (fifth wheel connection point)
 * to the center of the rearmost trailer axle group. Longer KPRA distances
 * increase turning radius and bridge stress.
 *
 * 53' trailers with tandems in the rear position typically have ~43' KPRA,
 * violating California's 40' limit. Sliding tandems forward can reduce
 * KPRA to ~40' but decreases rear overhang.
 */

import type {
  TruckType,
  TrailerCategory,
  StatePermitData,
  KPRALimit,
} from './types'
import { DEFAULT_AXLE_CONFIGS } from './types'
import { getStateByCode } from './state-permits'

// ============================================================================
// TYPES
// ============================================================================

export interface KPRAValidation {
  /** Whether the truck passes KPRA limits for all route states */
  passes: boolean
  /** Effective KPRA distance for this truck (feet) */
  effectiveKPRA: number
  /** Per-state results (only for states with KPRA limits) */
  stateResults: KPRAStateResult[]
  /** All violations across route states */
  violations: string[]
  /** Suggestions for resolving violations */
  suggestions: string[]
}

export interface KPRAStateResult {
  stateCode: string
  stateName: string
  limit: number           // feet
  effectiveKPRA: number   // feet
  passes: boolean
  excess: number          // feet over limit (0 if passes)
}

// ============================================================================
// KPRA DISTANCE DERIVATION
// ============================================================================

/**
 * Reference deck length per category — the deck length that corresponds
 * to the DEFAULT_AXLE_CONFIGS trailerAxlePosition for each category.
 *
 * Used to derive KPRA for trucks of different lengths within the same category:
 *   rearOverhang = referenceDeckLength - categoryTrailerAxlePosition
 *   effectiveKPRA = truck.deckLength - rearOverhang
 */
const CATEGORY_REFERENCE_DECK_LENGTH: Record<TrailerCategory, number> = {
  FLATBED: 48,
  STEP_DECK: 48,
  RGN: 48,
  LOWBOY: 48,
  DOUBLE_DROP: 48,
  LANDOLL: 48,
  CONESTOGA: 48,
  DRY_VAN: 53,
  REEFER: 53,
  CURTAIN_SIDE: 53,
  MULTI_AXLE: 40,
  SCHNABEL: 30,
  PERIMETER: 30,
  STEERABLE: 35,
  BLADE: 40,
  TANKER: 43,
  HOPPER: 34,
  SPECIALIZED: 40,
}

/**
 * Get the effective KPRA distance for a truck.
 *
 * Priority:
 * 1. Explicit `kingpinToRearAxle` on the truck (if set)
 * 2. Derived from category defaults + deck length adjustment
 *
 * Derivation:
 *   rearOverhang = referenceDeckLength - DEFAULT_AXLE_CONFIGS[category].trailerAxlePosition
 *   effectiveKPRA = truck.deckLength - rearOverhang
 *
 * Examples:
 *   flatbed-48:  48 - (48 - 38) = 38 ft  ✓ CA compliant
 *   flatbed-53:  53 - (48 - 38) = 43 ft  ✗ CA non-compliant
 *   dry-van-53:  53 - (53 - 40) = 40 ft  ✓ CA compliant (at limit)
 *   lowboy-2axle: 48 - (48 - 30) = 30 ft ✓ CA compliant
 */
export function getEffectiveKPRA(truck: TruckType): number {
  // Explicit value takes priority
  if (truck.kingpinToRearAxle !== undefined) {
    return truck.kingpinToRearAxle
  }

  // Derive from category defaults
  const categoryConfig = DEFAULT_AXLE_CONFIGS[truck.category]
  const referenceDeckLength = CATEGORY_REFERENCE_DECK_LENGTH[truck.category]

  const rearOverhang = referenceDeckLength - categoryConfig.trailerAxlePosition
  return truck.deckLength - rearOverhang
}

// ============================================================================
// KPRA VALIDATION
// ============================================================================

/**
 * Validate a truck's KPRA distance against the limits of all states on a route.
 *
 * @param truck - The truck to validate
 * @param routeStateCodes - Array of state codes the route traverses (e.g., ['CA', 'OR', 'NV'])
 * @returns KPRAValidation result with pass/fail, per-state results, and suggestions
 */
export function validateKPRA(
  truck: TruckType,
  routeStateCodes: string[]
): KPRAValidation {
  const effectiveKPRA = getEffectiveKPRA(truck)
  const stateResults: KPRAStateResult[] = []
  const violations: string[] = []
  const suggestions: string[] = []

  for (const stateCode of routeStateCodes) {
    const stateData = getStateByCode(stateCode)
    if (!stateData?.kpraLimit) continue

    const limit = stateData.kpraLimit.maxDistance
    const passes = effectiveKPRA <= limit
    const excess = passes ? 0 : effectiveKPRA - limit

    stateResults.push({
      stateCode: stateData.stateCode,
      stateName: stateData.stateName,
      limit,
      effectiveKPRA,
      passes,
      excess,
    })

    if (!passes) {
      violations.push(
        `${truck.name} KPRA distance (${effectiveKPRA}') exceeds ${stateData.stateName} limit of ${limit}'`
      )
    }
  }

  // Generate suggestions for violations
  if (violations.length > 0) {
    if (truck.deckLength >= 53) {
      suggestions.push(`Use 48' trailer instead of ${truck.deckLength}' to comply with KPRA limits`)
    }
    if (effectiveKPRA <= 43) {
      suggestions.push('Slide tandems forward to reduce KPRA distance (reduces rear overhang)')
    }
    if (truck.category === 'FLATBED' || truck.category === 'STEP_DECK') {
      suggestions.push('Consider a shorter trailer variant for routes through KPRA-enforced states')
    }
  }

  return {
    passes: violations.length === 0,
    effectiveKPRA,
    stateResults,
    violations,
    suggestions,
  }
}

/**
 * Quick check: does this route pass through any KPRA-enforced states?
 */
export function routeHasKPRAStates(routeStateCodes: string[]): boolean {
  return routeStateCodes.some(code => {
    const state = getStateByCode(code)
    return state?.kpraLimit !== undefined
  })
}

/**
 * Get the most restrictive KPRA limit across all route states.
 * Returns undefined if no states on the route enforce KPRA.
 */
export function getMostRestrictiveKPRALimit(
  routeStateCodes: string[]
): { stateCode: string; limit: number } | undefined {
  let mostRestrictive: { stateCode: string; limit: number } | undefined

  for (const code of routeStateCodes) {
    const state = getStateByCode(code)
    if (!state?.kpraLimit) continue

    if (!mostRestrictive || state.kpraLimit.maxDistance < mostRestrictive.limit) {
      mostRestrictive = { stateCode: state.stateCode, limit: state.kpraLimit.maxDistance }
    }
  }

  return mostRestrictive
}
