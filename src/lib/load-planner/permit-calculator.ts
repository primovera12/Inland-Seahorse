/**
 * Permit Calculator for Load Planner
 *
 * Calculates permit requirements and costs for routes across states
 * Uses comprehensive DOT data for all 50 US states
 */

import type {
  StatePermitData,
  PermitRequirement,
  RoutePermitSummary,
  PermitCostBreakdown,
  DetailedPermitRequirement,
  DetailedRoutePermitSummary,
  EscortCostBreakdown,
  SpecialJurisdiction,
  SpecialJurisdictionPermit
} from './types'
import { ESCORT_COSTS, getTransportWidth, SECUREMENT_WIDTH_ALLOWANCE, checkPermitDataStaleness, shouldWarnBridgeAnalysis, DEFAULT_BRIDGE_ANALYSIS } from './types'
import { statePermits, getStateByCode } from './state-permits'

export interface CargoSpecs {
  width: number      // feet (raw cargo width, not including securement)
  height: number     // feet
  length: number     // feet
  grossWeight: number // lbs (cargo + trailer + truck)
  // Set to true if width already includes securement hardware (chains, binders, straps)
  // When false/undefined, SECUREMENT_WIDTH_ALLOWANCE (10") is added for permit calculations
  widthIncludesSecurement?: boolean
}

/**
 * Get the effective transport width for a cargo (includes securement allowance)
 */
function getCargoTransportWidth(cargo: CargoSpecs): number {
  return getTransportWidth(cargo.width, cargo.widthIncludesSecurement)
}

// All cost constants in cents (from shared ESCORT_COSTS)
const ESCORT_COST_PER_DAY = ESCORT_COSTS.PILOT_CAR_PER_DAY_CENTS
const POLE_CAR_COST_PER_DAY = ESCORT_COSTS.POLE_CAR_PER_DAY_CENTS
const POLICE_ESCORT_HOURLY = ESCORT_COSTS.POLICE_ESCORT_PER_HOUR_CENTS

// Minimum fallback distance (miles) when caller omits distance for a state
// with per-mile or ton-mile fees. 50 miles is a conservative floor — enough
// to avoid $0 fees but low enough not to massively overestimate.
const MINIMUM_DISTANCE_FALLBACK_MILES = 50

/**
 * Check if a lat/lng point falls within a geographic bounding box
 */
function isPointInBounds(
  lat: number,
  lng: number,
  bounds: SpecialJurisdiction['geoBounds']
): boolean {
  return lat >= bounds.minLat && lat <= bounds.maxLat &&
         lng >= bounds.minLng && lng <= bounds.maxLng
}

/**
 * Check special jurisdictions for a state and return applicable permits.
 * When routePoints are provided, only jurisdictions whose geo bounds contain
 * at least one route point are flagged as confirmed. When routePoints are
 * absent, a warning is generated for each jurisdiction so callers know
 * additional permits may apply.
 */
function checkSpecialJurisdictions(
  state: StatePermitData,
  cargo: CargoSpecs,
  routePoints?: Array<{ lat: number; lng: number }>
): { permits: SpecialJurisdictionPermit[]; warnings: string[] } {
  const permits: SpecialJurisdictionPermit[] = []
  const warnings: string[] = []

  if (!state.specialJurisdictions || state.specialJurisdictions.length === 0) {
    return { permits, warnings }
  }

  const transportWidth = getCargoTransportWidth(cargo)
  const oversizeRequired = transportWidth > state.legalLimits.maxWidth ||
    cargo.height > state.legalLimits.maxHeight ||
    cargo.length > state.legalLimits.maxLength.combination
  const overweightRequired = cargo.grossWeight > state.legalLimits.maxWeight.gross
  const needsPermit = oversizeRequired || overweightRequired

  if (!needsPermit) {
    return { permits, warnings }
  }

  for (const jurisdiction of state.specialJurisdictions) {
    // Determine if route passes through this jurisdiction
    let routePassesThrough = false

    if (routePoints && routePoints.length > 0) {
      routePassesThrough = routePoints.some(
        p => isPointInBounds(p.lat, p.lng, jurisdiction.geoBounds)
      )
    }

    if (routePassesThrough) {
      // Confirmed: route passes through this jurisdiction
      let additionalFee = 0
      if (oversizeRequired) additionalFee += jurisdiction.additionalFees.oversizeBase
      if (overweightRequired) additionalFee += jurisdiction.additionalFees.overweightBase

      const jurisdictionWarnings: string[] = []
      jurisdictionWarnings.push(
        `Route passes through ${jurisdiction.name} — separate ${jurisdiction.agency} permit required in addition to ${state.stateName} state permit`
      )

      permits.push({
        jurisdiction: jurisdiction.name,
        code: jurisdiction.code,
        additionalPermitRequired: jurisdiction.additionalPermitRequired,
        estimatedAdditionalFee: Math.round(additionalFee * 100), // Convert dollars to cents
        agency: jurisdiction.agency,
        phone: jurisdiction.phone,
        website: jurisdiction.website,
        restrictions: jurisdiction.restrictions,
        warnings: jurisdictionWarnings
      })
    } else if (!routePoints || routePoints.length === 0) {
      // No route points provided — warn about potential additional permits
      warnings.push(
        `Route through ${state.stateName} may require additional ${jurisdiction.name} permits if passing through the ${jurisdiction.name} area. Contact ${jurisdiction.agency} (${jurisdiction.phone}) for details.`
      )
    }
    // else: route points provided but none in jurisdiction — no warning needed
  }

  return { permits, warnings }
}

/**
 * Calculate permit requirements for a single state
 */
export function calculateStatePermit(
  stateCode: string,
  cargo: CargoSpecs,
  distanceInState: number = 0,
  routePoints?: Array<{ lat: number; lng: number }>
): PermitRequirement | null {
  const state = getStateByCode(stateCode)
  if (!state) return null

  const limits = state.legalLimits
  const reasons: string[] = []
  const restrictions: string[] = []
  const warnings: string[] = []

  // Check for stale permit data
  const staleness = checkPermitDataStaleness(state.lastVerified)
  if (staleness.isWarning && staleness.message) {
    warnings.push(`${state.stateName}: ${staleness.message}`)
  }

  // Calculate transport width (includes securement hardware allowance)
  const transportWidth = getCargoTransportWidth(cargo)

  // Check oversize (use transport width for width checks)
  const widthOver = transportWidth > limits.maxWidth
  const heightOver = cargo.height > limits.maxHeight
  const lengthOver = cargo.length > limits.maxLength.combination

  const oversizeRequired = widthOver || heightOver || lengthOver

  if (widthOver) {
    reasons.push(`Transport width ${transportWidth.toFixed(1)}' (incl. securement) exceeds ${limits.maxWidth}' limit`)
  }
  if (heightOver) {
    reasons.push(`Height ${cargo.height}' exceeds ${limits.maxHeight}' limit`)
  }
  if (lengthOver) {
    reasons.push(`Length ${cargo.length}' exceeds ${limits.maxLength.combination}' limit`)
  }

  // Check overweight
  const overweightRequired = cargo.grossWeight > limits.maxWeight.gross
  if (overweightRequired) {
    reasons.push(`Weight ${cargo.grossWeight.toLocaleString()} lbs exceeds ${limits.maxWeight.gross.toLocaleString()} lb limit`)
  }

  // Check superload (use transport width)
  const superload = state.superloadThresholds
  const isSuperload: boolean = superload ? !!(
    (superload.width && transportWidth >= superload.width) ||
    (superload.height && cargo.height >= superload.height) ||
    (superload.length && cargo.length >= superload.length) ||
    (superload.weight && cargo.grossWeight >= superload.weight)
  ) : false

  if (isSuperload) {
    reasons.push('Load qualifies as superload - special routing required')
  }

  // Calculate escorts
  const escortRules = state.escortRules
  let escortsRequired = 0
  let poleCarRequired = false
  let policeEscortRequired = false

  if (transportWidth >= escortRules.width.twoEscorts) {
    escortsRequired = 2
  } else if (transportWidth >= escortRules.width.oneEscort) {
    escortsRequired = 1
  }

  if (escortRules.height?.poleCar && cargo.height >= escortRules.height.poleCar) {
    poleCarRequired = true
  }

  if (escortRules.length?.twoEscorts && cargo.length >= escortRules.length.twoEscorts) {
    escortsRequired = Math.max(escortsRequired, 2)
  } else if (escortRules.length?.oneEscort && cargo.length >= escortRules.length.oneEscort) {
    escortsRequired = Math.max(escortsRequired, 1)
  }

  if (escortRules.policeEscort) {
    if (escortRules.policeEscort.width && transportWidth >= escortRules.policeEscort.width) {
      policeEscortRequired = true
    }
    if (escortRules.policeEscort.height && cargo.height >= escortRules.policeEscort.height) {
      policeEscortRequired = true
    }
  }

  // Calculate fee
  let estimatedFee = 0

  if (oversizeRequired) {
    const osPermit = state.oversizePermits.singleTrip
    estimatedFee += osPermit.baseFee

    // Add dimension surcharges (cumulative = all applicable brackets, tiered = highest only)
    if (osPermit.dimensionSurcharges) {
      const { width, height, length } = osPermit.dimensionSurcharges
      const isTiered = osPermit.surchargeModel === 'tiered'

      if (width) {
        if (isTiered) {
          const applicable = width.filter(s => transportWidth >= s.threshold)
          if (applicable.length > 0) estimatedFee += applicable[applicable.length - 1].fee
        } else {
          for (const surcharge of width) {
            if (transportWidth >= surcharge.threshold) estimatedFee += surcharge.fee
          }
        }
      }
      if (height) {
        if (isTiered) {
          const applicable = height.filter(s => cargo.height >= s.threshold)
          if (applicable.length > 0) estimatedFee += applicable[applicable.length - 1].fee
        } else {
          for (const surcharge of height) {
            if (cargo.height >= surcharge.threshold) estimatedFee += surcharge.fee
          }
        }
      }
      if (length) {
        if (isTiered) {
          const applicable = length.filter(s => cargo.length >= s.threshold)
          if (applicable.length > 0) estimatedFee += applicable[applicable.length - 1].fee
        } else {
          for (const surcharge of length) {
            if (cargo.length >= surcharge.threshold) estimatedFee += surcharge.fee
          }
        }
      }
    }
  }

  if (overweightRequired) {
    const owPermit = state.overweightPermits.singleTrip
    estimatedFee += owPermit.baseFee

    // Distance-based fees: per-mile and ton-mile are mutually exclusive
    // (if both defined for a state, use the larger — likely a data error)
    const hasDistanceFees = !!(owPermit.perMileFee || owPermit.tonMileFee)
    let effectiveDistance = distanceInState
    if (effectiveDistance <= 0 && hasDistanceFees) {
      effectiveDistance = MINIMUM_DISTANCE_FALLBACK_MILES
      warnings.push(
        `Distance not provided for ${state.stateName} — using ${MINIMUM_DISTANCE_FALLBACK_MILES}-mile minimum estimate for per-mile fees. Actual costs may be higher.`
      )
    }

    if (effectiveDistance > 0 && hasDistanceFees) {
      const perMileCost = owPermit.perMileFee ? owPermit.perMileFee * effectiveDistance : 0
      const tonMileCost = owPermit.tonMileFee
        ? owPermit.tonMileFee * (cargo.grossWeight / 2000) * effectiveDistance
        : 0
      estimatedFee += Math.max(perMileCost, tonMileCost)
    }

    // Weight brackets — additive on top of base + distance-based fees
    // (states with both per-mile and brackets charge cumulatively, not either/or)
    if (owPermit.weightBrackets) {
      for (const bracket of owPermit.weightBrackets) {
        if (cargo.grossWeight <= bracket.upTo) {
          estimatedFee += bracket.fee
          break
        }
      }
    }

    // Extra legal fees
    if (owPermit.extraLegalFees?.perTrip) {
      estimatedFee += owPermit.extraLegalFees.perTrip
    }
  }

  // Travel restrictions
  const travel = state.travelRestrictions
  if (travel.noNightTravel) {
    restrictions.push(`No night travel${travel.nightDefinition ? ` (${travel.nightDefinition})` : ''}`)
  }
  if (travel.noWeekendTravel) {
    restrictions.push(`No weekend travel${travel.weekendDefinition ? ` (${travel.weekendDefinition})` : ''}`)
  }
  if (travel.noHolidayTravel) {
    restrictions.push('No holiday travel')
  }
  if (travel.peakHourRestrictions) {
    restrictions.push(travel.peakHourRestrictions)
  }
  if (travel.weatherRestrictions) {
    restrictions.push(travel.weatherRestrictions)
  }

  // Check bridge analysis requirements (state-specific or federal defaults)
  let bridgeAnalysisRequired = false
  const bridgeCheck = shouldWarnBridgeAnalysis(cargo.grossWeight, transportWidth, state.bridgeAnalysis)
  if (bridgeCheck.warn && (oversizeRequired || overweightRequired)) {
    bridgeAnalysisRequired = true
    if (state.bridgeAnalysis) {
      // State has explicit bridge analysis data
      const ba = state.bridgeAnalysis
      warnings.push(
        `${state.stateName} requires bridge analysis for this load (${bridgeCheck.reason}). ` +
        `Estimated cost: $${ba.estimatedCostMin.toLocaleString()}-$${ba.estimatedCostMax.toLocaleString()} per bridge, ` +
        `processing time: ${ba.processingTime}.`
      )
      reasons.push('Bridge analysis required — heavy/wide load on state highways')
    } else {
      // State lacks explicit data — use federal defaults and note the uncertainty
      warnings.push(
        `${state.stateName}: Bridge analysis may be required (${bridgeCheck.reason}). ` +
        `${state.stateName} does not have specific bridge analysis data on file — verify with state DOT. ` +
        `Typical cost: $${DEFAULT_BRIDGE_ANALYSIS.COST_MIN_DOLLARS.toLocaleString()}-$${DEFAULT_BRIDGE_ANALYSIS.COST_MAX_DOLLARS.toLocaleString()} per bridge, ` +
        `processing time: ${DEFAULT_BRIDGE_ANALYSIS.PROCESSING_TIME}.`
      )
      reasons.push('Bridge analysis may be required — verify with state DOT')
    }
  }

  // Check if annual/continuous permit covers this load
  let continuousPermitAvailable = false
  let continuousPermitNote: string | undefined
  if (oversizeRequired && state.oversizePermits.annual) {
    const annual = state.oversizePermits.annual
    const fitsAnnual =
      (!annual.maxWidth || transportWidth <= annual.maxWidth) &&
      (!annual.maxHeight || cargo.height <= annual.maxHeight) &&
      (!annual.maxLength || cargo.length <= annual.maxLength) &&
      (!annual.maxWeight || cargo.grossWeight <= annual.maxWeight)
    if (fitsAnnual && !bridgeAnalysisRequired) {
      continuousPermitAvailable = true
      const limits: string[] = []
      if (annual.maxWidth) limits.push(`${annual.maxWidth}' wide`)
      if (annual.maxHeight) limits.push(`${annual.maxHeight}' high`)
      if (annual.maxLength) limits.push(`${annual.maxLength}' long`)
      if (annual.maxWeight) limits.push(`${annual.maxWeight.toLocaleString()} lbs`)
      continuousPermitNote = `Annual/continuous permit ($${annual.baseFee}/year) available — covers loads up to ${limits.join(', ')}`
    }
  }

  // Check restricted routes (highways that prohibit or limit oversize/overweight)
  if (state.restrictedRoutes && (oversizeRequired || overweightRequired)) {
    for (const rr of state.restrictedRoutes) {
      const cargoExceedsWidth = transportWidth > rr.maxWidth
      const cargoExceedsHeight = cargo.height > rr.maxHeight
      const cargoExceedsWeight = rr.maxWeight ? cargo.grossWeight > rr.maxWeight : false
      const cargoExceedsLimits = cargoExceedsWidth || cargoExceedsHeight || cargoExceedsWeight
      if (!rr.permitsAvailable) {
        warnings.push(
          `ROUTE RESTRICTION: ${rr.route} — ${rr.note} Route must be avoided for this load.`
        )
      } else if (cargoExceedsLimits) {
        const exceeded: string[] = []
        if (cargoExceedsWidth) exceeded.push(`transport width ${transportWidth.toFixed(1)}' > ${rr.maxWidth}' limit`)
        if (cargoExceedsHeight) exceeded.push(`height ${cargo.height}' > ${rr.maxHeight}' limit`)
        if (cargoExceedsWeight) exceeded.push(`weight ${cargo.grossWeight.toLocaleString()} lbs > ${rr.maxWeight!.toLocaleString()} lb limit`)
        warnings.push(
          `ROUTE RESTRICTION: ${rr.route} — Load exceeds route limits (${exceeded.join(', ')}). ${rr.note}`
        )
      }
    }
  }

  // Check special jurisdictions (e.g., NYC within NY state)
  const sjResult = checkSpecialJurisdictions(state, cargo, routePoints)
  if (sjResult.warnings.length > 0) {
    warnings.push(...sjResult.warnings)
  }
  let specialJurisdictionFee = 0
  for (const sjPermit of sjResult.permits) {
    specialJurisdictionFee += sjPermit.estimatedAdditionalFee
  }

  return {
    state: state.stateName,
    stateCode: state.stateCode,
    oversizeRequired,
    overweightRequired,
    isSuperload,
    escortsRequired,
    poleCarRequired,
    policeEscortRequired,
    estimatedFee: Math.round(estimatedFee * 100) + specialJurisdictionFee, // Convert dollars to cents + jurisdiction fees (already in cents)
    reasons,
    travelRestrictions: restrictions,
    warnings: warnings.length > 0 ? warnings : undefined,
    specialJurisdictionPermits: sjResult.permits.length > 0 ? sjResult.permits : undefined,
    bridgeAnalysisRequired: bridgeAnalysisRequired || undefined,
    continuousPermitAvailable: continuousPermitAvailable || undefined,
    continuousPermitNote
  }
}

/**
 * Calculate detailed permit requirements for a single state
 * Returns full cost breakdown with calculation steps and source info
 */
export function calculateDetailedStatePermit(
  stateCode: string,
  cargo: CargoSpecs,
  distanceInState: number = 0,
  routePoints?: Array<{ lat: number; lng: number }>
): DetailedPermitRequirement | null {
  const state = getStateByCode(stateCode)
  if (!state) return null

  const limits = state.legalLimits
  const calculationDetails: string[] = []
  const reasons: string[] = []
  const restrictions: string[] = []
  const warnings: string[] = []

  // Check for stale permit data
  const staleness = checkPermitDataStaleness(state.lastVerified)
  if (staleness.isWarning && staleness.message) {
    warnings.push(`${state.stateName}: ${staleness.message}`)
    calculationDetails.push(`Data staleness: ${staleness.monthsOld} months since last verification`)
  }

  // Calculate transport width (includes securement hardware allowance)
  const transportWidth = getCargoTransportWidth(cargo)

  // Initialize cost breakdown
  const costBreakdown: PermitCostBreakdown = {
    baseFee: 0,
    dimensionSurcharges: { width: [], height: [], length: [] },
    weightFees: { baseFee: 0 },
    triggeringDimensions: {},
    total: 0
  }

  // Check oversize (use transport width for width checks)
  const widthOver = transportWidth > limits.maxWidth
  const heightOver = cargo.height > limits.maxHeight
  const lengthOver = cargo.length > limits.maxLength.combination

  const oversizeRequired = widthOver || heightOver || lengthOver

  // Track triggering dimensions
  if (widthOver) {
    costBreakdown.triggeringDimensions.width = {
      value: transportWidth,
      limit: limits.maxWidth,
      exceeded: true
    }
    reasons.push(`Transport width ${transportWidth.toFixed(1)}' (incl. securement) exceeds ${limits.maxWidth}' limit`)
  }
  if (heightOver) {
    costBreakdown.triggeringDimensions.height = {
      value: cargo.height,
      limit: limits.maxHeight,
      exceeded: true
    }
    reasons.push(`Height ${cargo.height}' exceeds ${limits.maxHeight}' limit`)
  }
  if (lengthOver) {
    costBreakdown.triggeringDimensions.length = {
      value: cargo.length,
      limit: limits.maxLength.combination,
      exceeded: true
    }
    reasons.push(`Length ${cargo.length}' exceeds ${limits.maxLength.combination}' limit`)
  }

  // Check overweight
  const overweightRequired = cargo.grossWeight > limits.maxWeight.gross
  if (overweightRequired) {
    costBreakdown.triggeringDimensions.weight = {
      value: cargo.grossWeight,
      limit: limits.maxWeight.gross,
      exceeded: true
    }
    reasons.push(`Weight ${cargo.grossWeight.toLocaleString()} lbs exceeds ${limits.maxWeight.gross.toLocaleString()} lb limit`)
  }

  // Check superload (use transport width)
  const superload = state.superloadThresholds
  const isSuperload: boolean = superload ? !!(
    (superload.width && transportWidth >= superload.width) ||
    (superload.height && cargo.height >= superload.height) ||
    (superload.length && cargo.length >= superload.length) ||
    (superload.weight && cargo.grossWeight >= superload.weight)
  ) : false

  if (isSuperload) {
    reasons.push('Load qualifies as superload - special routing required')
  }

  // Calculate escorts
  const escortRules = state.escortRules
  let escortsRequired = 0
  let poleCarRequired = false
  let policeEscortRequired = false

  if (transportWidth >= escortRules.width.twoEscorts) {
    escortsRequired = 2
  } else if (transportWidth >= escortRules.width.oneEscort) {
    escortsRequired = 1
  }

  if (escortRules.height?.poleCar && cargo.height >= escortRules.height.poleCar) {
    poleCarRequired = true
  }

  if (escortRules.length?.twoEscorts && cargo.length >= escortRules.length.twoEscorts) {
    escortsRequired = Math.max(escortsRequired, 2)
  } else if (escortRules.length?.oneEscort && cargo.length >= escortRules.length.oneEscort) {
    escortsRequired = Math.max(escortsRequired, 1)
  }

  if (escortRules.policeEscort) {
    if (escortRules.policeEscort.width && transportWidth >= escortRules.policeEscort.width) {
      policeEscortRequired = true
    }
    if (escortRules.policeEscort.height && cargo.height >= escortRules.policeEscort.height) {
      policeEscortRequired = true
    }
  }

  // Calculate fees with detailed breakdown
  let estimatedFee = 0

  if (oversizeRequired) {
    const osPermit = state.oversizePermits.singleTrip
    costBreakdown.baseFee = osPermit.baseFee
    estimatedFee += osPermit.baseFee
    calculationDetails.push(`Base oversize permit fee: $${osPermit.baseFee}`)

    // Add dimension surcharges with detailed tracking (cumulative = all brackets, tiered = highest only)
    if (osPermit.dimensionSurcharges) {
      const { width, height, length } = osPermit.dimensionSurcharges
      const isTiered = osPermit.surchargeModel === 'tiered'
      if (isTiered) {
        calculationDetails.push('Surcharge model: tiered (only highest applicable bracket charged)')
      }

      if (width) {
        if (isTiered) {
          const applicable = width.filter(s => transportWidth >= s.threshold)
          if (applicable.length > 0) {
            const highest = applicable[applicable.length - 1]
            estimatedFee += highest.fee
            costBreakdown.dimensionSurcharges.width.push(highest)
            calculationDetails.push(`Width surcharge (>${highest.threshold}', tiered): +$${highest.fee}`)
          }
        } else {
          for (const surcharge of width) {
            if (transportWidth >= surcharge.threshold) {
              estimatedFee += surcharge.fee
              costBreakdown.dimensionSurcharges.width.push(surcharge)
              calculationDetails.push(`Width surcharge (>${surcharge.threshold}'): +$${surcharge.fee}`)
            }
          }
        }
      }
      if (height) {
        if (isTiered) {
          const applicable = height.filter(s => cargo.height >= s.threshold)
          if (applicable.length > 0) {
            const highest = applicable[applicable.length - 1]
            estimatedFee += highest.fee
            costBreakdown.dimensionSurcharges.height.push(highest)
            calculationDetails.push(`Height surcharge (>${highest.threshold}', tiered): +$${highest.fee}`)
          }
        } else {
          for (const surcharge of height) {
            if (cargo.height >= surcharge.threshold) {
              estimatedFee += surcharge.fee
              costBreakdown.dimensionSurcharges.height.push(surcharge)
              calculationDetails.push(`Height surcharge (>${surcharge.threshold}'): +$${surcharge.fee}`)
            }
          }
        }
      }
      if (length) {
        if (isTiered) {
          const applicable = length.filter(s => cargo.length >= s.threshold)
          if (applicable.length > 0) {
            const highest = applicable[applicable.length - 1]
            estimatedFee += highest.fee
            costBreakdown.dimensionSurcharges.length.push(highest)
            calculationDetails.push(`Length surcharge (>${highest.threshold}', tiered): +$${highest.fee}`)
          }
        } else {
          for (const surcharge of length) {
            if (cargo.length >= surcharge.threshold) {
              estimatedFee += surcharge.fee
              costBreakdown.dimensionSurcharges.length.push(surcharge)
              calculationDetails.push(`Length surcharge (>${surcharge.threshold}'): +$${surcharge.fee}`)
            }
          }
        }
      }
    }
  }

  if (overweightRequired) {
    const owPermit = state.overweightPermits.singleTrip
    costBreakdown.weightFees.baseFee = owPermit.baseFee
    estimatedFee += owPermit.baseFee
    calculationDetails.push(`Base overweight permit fee: $${owPermit.baseFee}`)

    // Distance-based fees: per-mile and ton-mile are mutually exclusive
    // (if both defined for a state, use the larger — likely a data error)
    const hasDistanceFees = !!(owPermit.perMileFee || owPermit.tonMileFee)
    let effectiveDistance = distanceInState
    if (effectiveDistance <= 0 && hasDistanceFees) {
      effectiveDistance = MINIMUM_DISTANCE_FALLBACK_MILES
      warnings.push(
        `Distance not provided for ${state.stateName} — using ${MINIMUM_DISTANCE_FALLBACK_MILES}-mile minimum estimate for per-mile fees. Actual costs may be higher.`
      )
      calculationDetails.push(`⚠ Distance not provided — using ${MINIMUM_DISTANCE_FALLBACK_MILES}-mile minimum estimate`)
    }

    if (effectiveDistance > 0 && hasDistanceFees) {
      const perMileCost = owPermit.perMileFee ? owPermit.perMileFee * effectiveDistance : 0
      const tons = cargo.grossWeight / 2000
      const tonMileCost = owPermit.tonMileFee ? owPermit.tonMileFee * tons * effectiveDistance : 0

      if (perMileCost > 0 && tonMileCost > 0) {
        // Both defined — anomaly; use the larger and note the conflict
        if (perMileCost >= tonMileCost) {
          costBreakdown.weightFees.perMileFee = owPermit.perMileFee
          estimatedFee += perMileCost
          calculationDetails.push(`Per-mile fee (${effectiveDistance} mi × $${owPermit.perMileFee}/mi): +$${perMileCost.toFixed(2)}`)
          calculationDetails.push(`Note: ton-mile fee also defined ($${tonMileCost.toFixed(2)}) — using higher per-mile fee`)
        } else {
          costBreakdown.weightFees.tonMileFee = owPermit.tonMileFee
          estimatedFee += tonMileCost
          calculationDetails.push(`Ton-mile fee (${tons.toFixed(1)} tons × ${effectiveDistance} mi × $${owPermit.tonMileFee}): +$${tonMileCost.toFixed(2)}`)
          calculationDetails.push(`Note: per-mile fee also defined ($${perMileCost.toFixed(2)}) — using higher ton-mile fee`)
        }
      } else if (perMileCost > 0) {
        costBreakdown.weightFees.perMileFee = owPermit.perMileFee
        estimatedFee += perMileCost
        calculationDetails.push(`Per-mile fee (${effectiveDistance} mi × $${owPermit.perMileFee}/mi): +$${perMileCost.toFixed(2)}`)
      } else if (tonMileCost > 0) {
        costBreakdown.weightFees.tonMileFee = owPermit.tonMileFee
        estimatedFee += tonMileCost
        calculationDetails.push(`Ton-mile fee (${tons.toFixed(1)} tons × ${effectiveDistance} mi × $${owPermit.tonMileFee}): +$${tonMileCost.toFixed(2)}`)
      }
    }

    // Weight brackets — additive on top of base + per-mile/ton-mile fees
    // (states with both per-mile and brackets charge cumulatively, not either/or)
    if (owPermit.weightBrackets) {
      for (const bracket of owPermit.weightBrackets) {
        if (cargo.grossWeight <= bracket.upTo) {
          costBreakdown.weightFees.bracketFee = bracket.fee
          estimatedFee += bracket.fee
          calculationDetails.push(`Weight bracket (up to ${bracket.upTo.toLocaleString()} lbs): +$${bracket.fee}`)
          break
        }
      }
    }

    // Extra legal fees
    if (owPermit.extraLegalFees?.perTrip) {
      estimatedFee += owPermit.extraLegalFees.perTrip
      calculationDetails.push(`Extra legal fee (per trip): +$${owPermit.extraLegalFees.perTrip}`)
    }
  }

  costBreakdown.total = Math.round(estimatedFee * 100) // Convert dollars to cents

  // Travel restrictions
  const travel = state.travelRestrictions
  if (travel.noNightTravel) {
    restrictions.push(`No night travel${travel.nightDefinition ? ` (${travel.nightDefinition})` : ''}`)
  }
  if (travel.noWeekendTravel) {
    restrictions.push(`No weekend travel${travel.weekendDefinition ? ` (${travel.weekendDefinition})` : ''}`)
  }
  if (travel.noHolidayTravel) {
    restrictions.push('No holiday travel')
  }
  if (travel.peakHourRestrictions) {
    restrictions.push(travel.peakHourRestrictions)
  }
  if (travel.weatherRestrictions) {
    restrictions.push(travel.weatherRestrictions)
  }

  // Check bridge analysis requirements (state-specific or federal defaults)
  let bridgeAnalysisRequired = false
  const bridgeCheck = shouldWarnBridgeAnalysis(cargo.grossWeight, transportWidth, state.bridgeAnalysis)
  if (bridgeCheck.warn && (oversizeRequired || overweightRequired)) {
    bridgeAnalysisRequired = true
    if (state.bridgeAnalysis) {
      // State has explicit bridge analysis data
      const ba = state.bridgeAnalysis
      warnings.push(
        `${state.stateName} requires bridge analysis for this load (${bridgeCheck.reason}). ` +
        `Estimated cost: $${ba.estimatedCostMin.toLocaleString()}-$${ba.estimatedCostMax.toLocaleString()} per bridge, ` +
        `processing time: ${ba.processingTime}.`
      )
      reasons.push('Bridge analysis required — heavy/wide load on state highways')
      calculationDetails.push(
        `Bridge analysis required: ${bridgeCheck.reason}. ` +
        `Est. $${ba.estimatedCostMin.toLocaleString()}-$${ba.estimatedCostMax.toLocaleString()}/bridge (${ba.processingTime})`
      )
    } else {
      // State lacks explicit data — use federal defaults and note the uncertainty
      warnings.push(
        `${state.stateName}: Bridge analysis may be required (${bridgeCheck.reason}). ` +
        `${state.stateName} does not have specific bridge analysis data on file — verify with state DOT. ` +
        `Typical cost: $${DEFAULT_BRIDGE_ANALYSIS.COST_MIN_DOLLARS.toLocaleString()}-$${DEFAULT_BRIDGE_ANALYSIS.COST_MAX_DOLLARS.toLocaleString()} per bridge, ` +
        `processing time: ${DEFAULT_BRIDGE_ANALYSIS.PROCESSING_TIME}.`
      )
      reasons.push('Bridge analysis may be required — verify with state DOT')
      calculationDetails.push(
        `Bridge analysis may be required: ${bridgeCheck.reason}. ` +
        `State-specific data unavailable — using federal defaults. ` +
        `Est. $${DEFAULT_BRIDGE_ANALYSIS.COST_MIN_DOLLARS.toLocaleString()}-$${DEFAULT_BRIDGE_ANALYSIS.COST_MAX_DOLLARS.toLocaleString()}/bridge (${DEFAULT_BRIDGE_ANALYSIS.PROCESSING_TIME})`
      )
    }
  }

  // Check if annual/continuous permit covers this load
  let continuousPermitAvailable = false
  let continuousPermitNote: string | undefined
  if (oversizeRequired && state.oversizePermits.annual) {
    const annual = state.oversizePermits.annual
    const fitsAnnual =
      (!annual.maxWidth || transportWidth <= annual.maxWidth) &&
      (!annual.maxHeight || cargo.height <= annual.maxHeight) &&
      (!annual.maxLength || cargo.length <= annual.maxLength) &&
      (!annual.maxWeight || cargo.grossWeight <= annual.maxWeight)
    if (fitsAnnual && !bridgeAnalysisRequired) {
      continuousPermitAvailable = true
      const limits: string[] = []
      if (annual.maxWidth) limits.push(`${annual.maxWidth}' wide`)
      if (annual.maxHeight) limits.push(`${annual.maxHeight}' high`)
      if (annual.maxLength) limits.push(`${annual.maxLength}' long`)
      if (annual.maxWeight) limits.push(`${annual.maxWeight.toLocaleString()} lbs`)
      continuousPermitNote = `Annual/continuous permit ($${annual.baseFee}/year) available — covers loads up to ${limits.join(', ')}`
      calculationDetails.push(continuousPermitNote)
    } else if (fitsAnnual && bridgeAnalysisRequired) {
      calculationDetails.push(
        `Annual/continuous permit ($${annual.baseFee}/year) exists but cannot be used — bridge analysis required for this load`
      )
    }
  }

  // Check restricted routes (highways that prohibit or limit oversize/overweight)
  if (state.restrictedRoutes && (oversizeRequired || overweightRequired)) {
    for (const rr of state.restrictedRoutes) {
      const cargoExceedsWidth = transportWidth > rr.maxWidth
      const cargoExceedsHeight = cargo.height > rr.maxHeight
      const cargoExceedsWeight = rr.maxWeight ? cargo.grossWeight > rr.maxWeight : false
      const cargoExceedsLimits = cargoExceedsWidth || cargoExceedsHeight || cargoExceedsWeight
      if (!rr.permitsAvailable) {
        warnings.push(
          `ROUTE RESTRICTION: ${rr.route} — ${rr.note} Route must be avoided for this load.`
        )
        calculationDetails.push(`Restricted route: ${rr.route} — no permits available, must avoid`)
      } else if (cargoExceedsLimits) {
        const exceeded: string[] = []
        if (cargoExceedsWidth) exceeded.push(`transport width ${transportWidth.toFixed(1)}' > ${rr.maxWidth}' limit`)
        if (cargoExceedsHeight) exceeded.push(`height ${cargo.height}' > ${rr.maxHeight}' limit`)
        if (cargoExceedsWeight) exceeded.push(`weight ${cargo.grossWeight.toLocaleString()} lbs > ${rr.maxWeight!.toLocaleString()} lb limit`)
        warnings.push(
          `ROUTE RESTRICTION: ${rr.route} — Load exceeds route limits (${exceeded.join(', ')}). ${rr.note}`
        )
        calculationDetails.push(`Restricted route: ${rr.route} — load exceeds limits (${exceeded.join(', ')})`)
      }
    }
  }

  // Check special jurisdictions (e.g., NYC within NY state)
  const sjResult = checkSpecialJurisdictions(state, cargo, routePoints)
  if (sjResult.warnings.length > 0) {
    warnings.push(...sjResult.warnings)
  }
  let specialJurisdictionFee = 0
  for (const sjPermit of sjResult.permits) {
    specialJurisdictionFee += sjPermit.estimatedAdditionalFee
    calculationDetails.push(`${sjPermit.jurisdiction} additional permit fee: +$${(sjPermit.estimatedAdditionalFee / 100).toFixed(0)}`)
  }
  if (specialJurisdictionFee > 0) {
    costBreakdown.total += specialJurisdictionFee
  }

  return {
    state: state.stateName,
    stateCode: state.stateCode,
    distanceInState,
    oversizeRequired,
    overweightRequired,
    isSuperload,
    escortsRequired,
    poleCarRequired,
    policeEscortRequired,
    estimatedFee: Math.round(estimatedFee * 100) + specialJurisdictionFee, // Convert dollars to cents + jurisdiction fees (already in cents)
    costBreakdown,
    calculationDetails,
    source: {
      agency: state.contact.agency,
      website: state.contact.website,
      phone: state.contact.phone,
      lastUpdated: 'January 2025'
    },
    travelRestrictions: restrictions,
    reasons,
    warnings: warnings.length > 0 ? warnings : undefined,
    specialJurisdictionPermits: sjResult.permits.length > 0 ? sjResult.permits : undefined,
    bridgeAnalysisRequired: bridgeAnalysisRequired || undefined,
    continuousPermitAvailable: continuousPermitAvailable || undefined,
    continuousPermitNote
  }
}

/**
 * Calculate detailed permits for an entire route across multiple states
 */
export function calculateDetailedRoutePermits(
  stateCodes: string[],
  cargo: CargoSpecs,
  stateDistances?: Record<string, number>,
  routePoints?: Array<{ lat: number; lng: number }>
): DetailedRoutePermitSummary {
  const statePermits: DetailedPermitRequirement[] = []
  const overallRestrictions: string[] = []
  const warnings: string[] = []

  let totalPermitCost = 0
  let maxEscorts = 0
  let needsPoleCar = false
  let needsPolice = false

  // Calculate for each state
  for (const code of stateCodes) {
    const distance = stateDistances?.[code] || 0
    const permit = calculateDetailedStatePermit(code, cargo, distance, routePoints)

    if (permit) {
      statePermits.push(permit)
      totalPermitCost += permit.estimatedFee
      maxEscorts = Math.max(maxEscorts, permit.escortsRequired)
      if (permit.poleCarRequired) needsPoleCar = true
      if (permit.policeEscortRequired) needsPolice = true

      if (permit.isSuperload) {
        warnings.push(`${permit.state} requires superload permit - additional routing and timing restrictions apply`)
      }

      // Propagate per-state calculation warnings (e.g., missing distance)
      if (permit.warnings) {
        warnings.push(...permit.warnings)
      }
    }
  }

  // Aggregate restrictions
  const hasNoNightTravel = statePermits.some(s => s.travelRestrictions.some(r => r.includes('night')))
  const hasNoWeekendTravel = statePermits.some(s => s.travelRestrictions.some(r => r.includes('weekend')))
  const hasNoHolidayTravel = statePermits.some(s => s.travelRestrictions.some(r => r.includes('holiday')))

  if (hasNoNightTravel) overallRestrictions.push('Daytime travel only in most states')
  if (hasNoWeekendTravel) overallRestrictions.push('Some states restrict weekend travel')
  if (hasNoHolidayTravel) overallRestrictions.push('Holiday travel restrictions in effect')

  // Calculate escort costs with detailed breakdown
  const totalDistance = stateDistances
    ? Object.values(stateDistances).reduce((a, b) => a + b, 0)
    : 0
  const estimatedDays = Math.max(1, Math.ceil(totalDistance / 300)) // 300 miles/day average
  const estimatedHours = estimatedDays * 8 // 8 driving hours per day

  // Per-state escort cost calculation
  const perStateEscortCosts: EscortCostBreakdown['perState'] = statePermits.map(permit => {
    const distance = stateDistances?.[permit.stateCode] || 0
    const daysInState = Math.max(0.5, distance / 300) // At least half day per state

    let stateCost = 0
    stateCost += permit.escortsRequired * ESCORT_COST_PER_DAY * daysInState
    if (permit.poleCarRequired) stateCost += POLE_CAR_COST_PER_DAY * daysInState
    if (permit.policeEscortRequired) stateCost += POLICE_ESCORT_HOURLY * 8 * daysInState

    return {
      stateCode: permit.stateCode,
      stateName: permit.state,
      distanceMiles: distance,
      daysInState: Math.round(daysInState * 10) / 10,
      escortCountInState: permit.escortsRequired,
      poleCarRequiredInState: permit.poleCarRequired || false,
      policeRequiredInState: permit.policeEscortRequired || false,
      stateCost: Math.round(stateCost)
    }
  })

  // Calculate total escort costs
  const totalEscortBaseCost = maxEscorts * ESCORT_COST_PER_DAY * estimatedDays
  const totalPoleCarCost = needsPoleCar ? POLE_CAR_COST_PER_DAY * estimatedDays : 0
  const totalPoliceCost = needsPolice ? POLICE_ESCORT_HOURLY * estimatedHours : 0
  const totalEscortCost = totalEscortBaseCost + totalPoleCarCost + totalPoliceCost

  // Build calculation details for transparency
  const escortCalculationDetails: string[] = []
  escortCalculationDetails.push(`Trip estimate: ${totalDistance.toLocaleString()} miles ÷ 300 mi/day = ${estimatedDays} day${estimatedDays > 1 ? 's' : ''}`)

  if (maxEscorts > 0) {
    escortCalculationDetails.push(`Escorts: ${maxEscorts} × $${ESCORT_COST_PER_DAY / 100}/day × ${estimatedDays} days = $${(totalEscortBaseCost / 100).toLocaleString()}`)
  }
  if (needsPoleCar) {
    escortCalculationDetails.push(`Pole Car: 1 × $${POLE_CAR_COST_PER_DAY / 100}/day × ${estimatedDays} days = $${(totalPoleCarCost / 100).toLocaleString()}`)
  }
  if (needsPolice) {
    escortCalculationDetails.push(`Police Escort: $${POLICE_ESCORT_HOURLY / 100}/hr × ${estimatedHours} hours = $${(totalPoliceCost / 100).toLocaleString()}`)
  }

  // Build the escort breakdown object
  const escortBreakdown: EscortCostBreakdown = {
    rates: {
      escortPerDay: ESCORT_COST_PER_DAY,
      poleCarPerDay: POLE_CAR_COST_PER_DAY,
      policePerHour: POLICE_ESCORT_HOURLY
    },
    tripDays: estimatedDays,
    tripHours: estimatedHours,
    escortCount: maxEscorts,
    needsPoleCar,
    needsPoliceEscort: needsPolice,
    escortCostPerDay: maxEscorts * ESCORT_COST_PER_DAY,
    poleCarCostPerDay: needsPoleCar ? POLE_CAR_COST_PER_DAY : 0,
    policeCostPerDay: needsPolice ? POLICE_ESCORT_HOURLY * 8 : 0,
    perState: perStateEscortCosts,
    totalEscortCost: totalEscortBaseCost,
    totalPoleCarCost,
    totalPoliceCost,
    grandTotal: totalEscortCost,
    calculationDetails: escortCalculationDetails
  }

  // Warnings
  if (totalPermitCost > 50000) { // $500 in cents
    warnings.push(`High permit costs expected ($${(totalPermitCost / 100).toLocaleString()})`)
  }
  if (maxEscorts >= 2) {
    warnings.push('Two escorts required - coordinate timing carefully')
  }
  if (needsPolice) {
    warnings.push('Police escort required - schedule in advance')
  }

  return {
    statePermits,
    totalPermitCost,
    totalEscortCost,
    escortBreakdown,
    totalCost: totalPermitCost + totalEscortCost,
    overallRestrictions,
    warnings
  }
}

/**
 * Calculate permits for an entire route across multiple states
 */
export function calculateRoutePermits(
  stateCodes: string[],
  cargo: CargoSpecs,
  stateDistances?: Record<string, number>,
  routePoints?: Array<{ lat: number; lng: number }>
): RoutePermitSummary {
  const states: PermitRequirement[] = []
  const overallRestrictions: string[] = []
  const warnings: string[] = []

  let totalPermitFees = 0
  let maxEscorts = 0
  let needsPoleCar = false
  let needsPolice = false

  // Calculate for each state
  for (const code of stateCodes) {
    const distance = stateDistances?.[code] || 0
    const permit = calculateStatePermit(code, cargo, distance, routePoints)

    if (permit) {
      states.push(permit)
      totalPermitFees += permit.estimatedFee
      maxEscorts = Math.max(maxEscorts, permit.escortsRequired)
      if (permit.poleCarRequired) needsPoleCar = true
      if (permit.policeEscortRequired) needsPolice = true

      // Check for superload
      if (permit.isSuperload) {
        warnings.push(`${permit.state} requires superload permit - additional routing and timing restrictions apply`)
      }

      // Propagate per-state calculation warnings (e.g., missing distance)
      if (permit.warnings) {
        warnings.push(...permit.warnings)
      }
    }
  }

  // Aggregate restrictions
  const hasNoNightTravel = states.some(s => s.travelRestrictions.some(r => r.includes('night')))
  const hasNoWeekendTravel = states.some(s => s.travelRestrictions.some(r => r.includes('weekend')))
  const hasNoHolidayTravel = states.some(s => s.travelRestrictions.some(r => r.includes('holiday')))

  if (hasNoNightTravel) overallRestrictions.push('Daytime travel only in most states')
  if (hasNoWeekendTravel) overallRestrictions.push('Some states restrict weekend travel')
  if (hasNoHolidayTravel) overallRestrictions.push('Holiday travel restrictions in effect')

  // Calculate escort costs (rough estimate)
  // Assume 300 miles per day average
  const totalDistance = stateDistances
    ? Object.values(stateDistances).reduce((a, b) => a + b, 0)
    : 0
  const estimatedDays = Math.max(1, Math.ceil(totalDistance / 300))

  let totalEscortCost = 0
  totalEscortCost += maxEscorts * ESCORT_COST_PER_DAY * estimatedDays
  if (needsPoleCar) totalEscortCost += POLE_CAR_COST_PER_DAY * estimatedDays
  if (needsPolice) totalEscortCost += POLICE_ESCORT_HOURLY * 8 * estimatedDays // assume 8 hours

  // Add warnings for high costs
  if (totalPermitFees > 50000) { // $500 in cents
    warnings.push(`High permit costs expected ($${(totalPermitFees / 100).toLocaleString()})`)
  }
  if (maxEscorts >= 2) {
    warnings.push('Two escorts required - coordinate timing carefully')
  }
  if (needsPolice) {
    warnings.push('Police escort required - schedule in advance')
  }

  return {
    states,
    totalPermitFees,
    totalEscortCost,
    estimatedEscortsPerDay: maxEscorts,
    overallRestrictions,
    warnings
  }
}

/**
 * Quick check if any permits are needed for dimensions/weight
 */
export function needsPermit(cargo: CargoSpecs): {
  oversizeNeeded: boolean
  overweightNeeded: boolean
  reasons: string[]
} {
  const reasons: string[] = []
  const transportWidth = getCargoTransportWidth(cargo)

  // Check against standard federal limits (use transport width)
  const oversizeNeeded =
    transportWidth > 8.5 ||
    cargo.height > 13.5 ||
    cargo.length > 65

  const overweightNeeded = cargo.grossWeight > 80000

  if (transportWidth > 8.5) reasons.push(`Transport width ${transportWidth.toFixed(1)}' (incl. securement) > 8.5' standard`)
  if (cargo.height > 13.5) reasons.push(`Height ${cargo.height}' > 13.5' standard`)
  if (cargo.length > 65) reasons.push(`Length ${cargo.length}' > 65' standard`)
  if (cargo.grossWeight > 80000) {
    reasons.push(`Weight ${cargo.grossWeight.toLocaleString()} lbs > 80,000 lb standard`)
  }

  return { oversizeNeeded, overweightNeeded, reasons }
}

/**
 * Format permit summary for display
 */
export function formatPermitSummary(summary: RoutePermitSummary): string {
  const lines: string[] = []

  lines.push(`States: ${summary.states.length}`)
  lines.push(`Total Permit Fees: $${(summary.totalPermitFees / 100).toLocaleString()}`)
  lines.push(`Estimated Escort Cost: $${(summary.totalEscortCost / 100).toLocaleString()}`)

  if (summary.estimatedEscortsPerDay > 0) {
    lines.push(`Escorts Required: ${summary.estimatedEscortsPerDay}`)
  }

  if (summary.overallRestrictions.length > 0) {
    lines.push('')
    lines.push('Restrictions:')
    summary.overallRestrictions.forEach(r => lines.push(`  - ${r}`))
  }

  if (summary.warnings.length > 0) {
    lines.push('')
    lines.push('Warnings:')
    summary.warnings.forEach(w => lines.push(`  ! ${w}`))
  }

  return lines.join('\n')
}

/**
 * Get a list of states that require permits for a given cargo
 */
export function getStatesRequiringPermits(
  stateCodes: string[],
  cargo: CargoSpecs
): string[] {
  return stateCodes.filter(code => {
    const permit = calculateStatePermit(code, cargo)
    return permit && (permit.oversizeRequired || permit.overweightRequired)
  })
}

/**
 * Estimate total permit + escort cost for a route
 */
export function estimateTotalCost(
  stateCodes: string[],
  cargo: CargoSpecs,
  stateDistances?: Record<string, number>,
  routePoints?: Array<{ lat: number; lng: number }>
): number {
  const summary = calculateRoutePermits(stateCodes, cargo, stateDistances, routePoints)
  return summary.totalPermitFees + summary.totalEscortCost
}
