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
  EscortCostBreakdown
} from './types'
import { statePermits, getStateByCode } from './state-permits'

export interface CargoSpecs {
  width: number      // feet
  height: number     // feet
  length: number     // feet
  grossWeight: number // lbs (cargo + trailer + truck)
}

// Escort cost constants in cents (matching escort-calculator.ts rates)
const ESCORT_COST_PER_DAY = 80000      // $800/day
const POLE_CAR_COST_PER_DAY = 100000   // $1,000/day
const POLICE_ESCORT_HOURLY = 10000     // $100/hr

/**
 * Calculate permit requirements for a single state
 */
export function calculateStatePermit(
  stateCode: string,
  cargo: CargoSpecs,
  distanceInState: number = 0
): PermitRequirement | null {
  const state = getStateByCode(stateCode)
  if (!state) return null

  const limits = state.legalLimits
  const reasons: string[] = []
  const restrictions: string[] = []

  // Check oversize
  const widthOver = cargo.width > limits.maxWidth
  const heightOver = cargo.height > limits.maxHeight
  const lengthOver = cargo.length > limits.maxLength.combination

  const oversizeRequired = widthOver || heightOver || lengthOver

  if (widthOver) {
    reasons.push(`Width ${cargo.width}' exceeds ${limits.maxWidth}' limit`)
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

  // Check superload
  const superload = state.superloadThresholds
  const isSuperload: boolean = superload ? !!(
    (superload.width && cargo.width >= superload.width) ||
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

  if (cargo.width >= escortRules.width.twoEscorts) {
    escortsRequired = 2
  } else if (cargo.width >= escortRules.width.oneEscort) {
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
    if (escortRules.policeEscort.width && cargo.width >= escortRules.policeEscort.width) {
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

    // Add dimension surcharges
    if (osPermit.dimensionSurcharges) {
      const { width, height, length } = osPermit.dimensionSurcharges

      if (width) {
        for (const surcharge of width) {
          if (cargo.width >= surcharge.threshold) {
            estimatedFee += surcharge.fee
          }
        }
      }
      if (height) {
        for (const surcharge of height) {
          if (cargo.height >= surcharge.threshold) {
            estimatedFee += surcharge.fee
          }
        }
      }
      if (length) {
        for (const surcharge of length) {
          if (cargo.length >= surcharge.threshold) {
            estimatedFee += surcharge.fee
          }
        }
      }
    }
  }

  if (overweightRequired) {
    const owPermit = state.overweightPermits.singleTrip
    estimatedFee += owPermit.baseFee

    // Per mile fees
    if (owPermit.perMileFee && distanceInState > 0) {
      estimatedFee += owPermit.perMileFee * distanceInState
    }

    // Ton-mile fees
    if (owPermit.tonMileFee && distanceInState > 0) {
      const tons = cargo.grossWeight / 2000
      estimatedFee += owPermit.tonMileFee * tons * distanceInState
    }

    // Weight brackets
    if (owPermit.weightBrackets) {
      for (const bracket of owPermit.weightBrackets) {
        if (cargo.grossWeight <= bracket.upTo) {
          estimatedFee = Math.max(estimatedFee, owPermit.baseFee + bracket.fee)
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

  return {
    state: state.stateName,
    stateCode: state.stateCode,
    oversizeRequired,
    overweightRequired,
    isSuperload,
    escortsRequired,
    poleCarRequired,
    policeEscortRequired,
    estimatedFee: Math.round(estimatedFee * 100), // Convert dollars to cents
    reasons,
    travelRestrictions: restrictions
  }
}

/**
 * Calculate detailed permit requirements for a single state
 * Returns full cost breakdown with calculation steps and source info
 */
export function calculateDetailedStatePermit(
  stateCode: string,
  cargo: CargoSpecs,
  distanceInState: number = 0
): DetailedPermitRequirement | null {
  const state = getStateByCode(stateCode)
  if (!state) return null

  const limits = state.legalLimits
  const calculationDetails: string[] = []
  const reasons: string[] = []
  const restrictions: string[] = []

  // Initialize cost breakdown
  const costBreakdown: PermitCostBreakdown = {
    baseFee: 0,
    dimensionSurcharges: { width: [], height: [], length: [] },
    weightFees: { baseFee: 0 },
    triggeringDimensions: {},
    total: 0
  }

  // Check oversize
  const widthOver = cargo.width > limits.maxWidth
  const heightOver = cargo.height > limits.maxHeight
  const lengthOver = cargo.length > limits.maxLength.combination

  const oversizeRequired = widthOver || heightOver || lengthOver

  // Track triggering dimensions
  if (widthOver) {
    costBreakdown.triggeringDimensions.width = {
      value: cargo.width,
      limit: limits.maxWidth,
      exceeded: true
    }
    reasons.push(`Width ${cargo.width}' exceeds ${limits.maxWidth}' limit`)
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

  // Check superload
  const superload = state.superloadThresholds
  const isSuperload: boolean = superload ? !!(
    (superload.width && cargo.width >= superload.width) ||
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

  if (cargo.width >= escortRules.width.twoEscorts) {
    escortsRequired = 2
  } else if (cargo.width >= escortRules.width.oneEscort) {
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
    if (escortRules.policeEscort.width && cargo.width >= escortRules.policeEscort.width) {
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

    // Add dimension surcharges with detailed tracking
    if (osPermit.dimensionSurcharges) {
      const { width, height, length } = osPermit.dimensionSurcharges

      if (width) {
        for (const surcharge of width) {
          if (cargo.width >= surcharge.threshold) {
            estimatedFee += surcharge.fee
            costBreakdown.dimensionSurcharges.width.push(surcharge)
            calculationDetails.push(`Width surcharge (>${surcharge.threshold}'): +$${surcharge.fee}`)
          }
        }
      }
      if (height) {
        for (const surcharge of height) {
          if (cargo.height >= surcharge.threshold) {
            estimatedFee += surcharge.fee
            costBreakdown.dimensionSurcharges.height.push(surcharge)
            calculationDetails.push(`Height surcharge (>${surcharge.threshold}'): +$${surcharge.fee}`)
          }
        }
      }
      if (length) {
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

  if (overweightRequired) {
    const owPermit = state.overweightPermits.singleTrip
    costBreakdown.weightFees.baseFee = owPermit.baseFee
    estimatedFee += owPermit.baseFee
    calculationDetails.push(`Base overweight permit fee: $${owPermit.baseFee}`)

    // Per mile fees
    if (owPermit.perMileFee && distanceInState > 0) {
      const perMileCost = owPermit.perMileFee * distanceInState
      costBreakdown.weightFees.perMileFee = owPermit.perMileFee
      estimatedFee += perMileCost
      calculationDetails.push(`Per-mile fee (${distanceInState} mi × $${owPermit.perMileFee}/mi): +$${perMileCost.toFixed(2)}`)
    }

    // Ton-mile fees
    if (owPermit.tonMileFee && distanceInState > 0) {
      const tons = cargo.grossWeight / 2000
      const tonMileCost = owPermit.tonMileFee * tons * distanceInState
      costBreakdown.weightFees.tonMileFee = owPermit.tonMileFee
      estimatedFee += tonMileCost
      calculationDetails.push(`Ton-mile fee (${tons.toFixed(1)} tons × ${distanceInState} mi × $${owPermit.tonMileFee}): +$${tonMileCost.toFixed(2)}`)
    }

    // Weight brackets
    if (owPermit.weightBrackets) {
      for (const bracket of owPermit.weightBrackets) {
        if (cargo.grossWeight <= bracket.upTo) {
          const bracketTotal = owPermit.baseFee + bracket.fee
          if (bracketTotal > estimatedFee) {
            const additionalFee = bracketTotal - estimatedFee
            costBreakdown.weightFees.bracketFee = bracket.fee
            estimatedFee = bracketTotal
            calculationDetails.push(`Weight bracket (up to ${bracket.upTo.toLocaleString()} lbs): +$${additionalFee.toFixed(0)}`)
          }
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
    estimatedFee: Math.round(estimatedFee * 100), // Convert dollars to cents
    costBreakdown,
    calculationDetails,
    source: {
      agency: state.contact.agency,
      website: state.contact.website,
      phone: state.contact.phone,
      lastUpdated: 'January 2025'
    },
    travelRestrictions: restrictions,
    reasons
  }
}

/**
 * Calculate detailed permits for an entire route across multiple states
 */
export function calculateDetailedRoutePermits(
  stateCodes: string[],
  cargo: CargoSpecs,
  stateDistances?: Record<string, number>
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
    const permit = calculateDetailedStatePermit(code, cargo, distance)

    if (permit) {
      statePermits.push(permit)
      totalPermitCost += permit.estimatedFee
      maxEscorts = Math.max(maxEscorts, permit.escortsRequired)
      if (permit.poleCarRequired) needsPoleCar = true
      if (permit.policeEscortRequired) needsPolice = true

      if (permit.isSuperload) {
        warnings.push(`${permit.state} requires superload permit - additional routing and timing restrictions apply`)
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
  stateDistances?: Record<string, number>
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
    const permit = calculateStatePermit(code, cargo, distance)

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

  // Check against standard federal limits
  const oversizeNeeded =
    cargo.width > 8.5 ||
    cargo.height > 13.5 ||
    cargo.length > 65

  const overweightNeeded = cargo.grossWeight > 80000

  if (cargo.width > 8.5) reasons.push(`Width ${cargo.width}' > 8.5' standard`)
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
  lines.push(`Total Permit Fees: $${summary.totalPermitFees.toLocaleString()}`)
  lines.push(`Estimated Escort Cost: $${summary.totalEscortCost.toLocaleString()}`)

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
  stateDistances?: Record<string, number>
): number {
  const summary = calculateRoutePermits(stateCodes, cargo, stateDistances)
  return summary.totalPermitFees + summary.totalEscortCost
}
