/**
 * Escort Calculator Module
 * Determines pilot car and police escort requirements based on load dimensions
 * and route states using existing state permit data.
 */

import {
  SmartEscortRequirements,
  SmartTravelRestrictions,
  SmartStateEscortRules,
  StatePermitData,
  TruckType,
  LEGAL_LIMITS,
} from './types'
import { statePermits } from './state-permits'

// ============================================================================
// CONSTANTS
// ============================================================================

const ESCORT_COST_PER_DAY = 800        // Single pilot car per day
const POLE_CAR_COST_PER_DAY = 1000     // Height pole car per day
const POLICE_ESCORT_PER_HOUR = 100      // Police escort per hour
const BUCKET_TRUCK_PER_DAY = 1500       // Bucket truck for high loads

// Width thresholds for signage
const WIDE_LOAD_THRESHOLD = 8.5
const OVERSIZE_LOAD_THRESHOLD = 10

// ============================================================================
// STATE DATA HELPERS
// ============================================================================

/**
 * Get state escort rules from state permit data
 */
export function getStateEscortRules(stateCode: string): SmartStateEscortRules | null {
  const stateData = statePermits.find(s => s.stateCode === stateCode)
  if (!stateData || !stateData.escortRules) {
    return null
  }

  const rules = stateData.escortRules

  return {
    state: stateCode,
    widthThresholds: {
      frontPilot: rules.width.oneEscort,
      rearPilot: rules.width.twoEscorts,
      police: rules.policeEscort?.width || 20,
    },
    heightThresholds: {
      frontPilot: rules.height?.poleCar || 15,
      rearPilot: 17,
      police: rules.policeEscort?.height || 18,
    },
    lengthThresholds: {
      frontPilot: rules.length?.oneEscort || 100,
      rearPilot: rules.length?.twoEscorts || 125,
      police: 150,
    },
    weightThresholds: {
      frontPilot: 200000,
      rearPilot: 250000,
      police: 300000,
    },
  }
}

/**
 * Get travel restrictions from state permit data
 */
export function getStateTravelRestrictions(stateCode: string): SmartTravelRestrictions {
  const stateData = statePermits.find(s => s.stateCode === stateCode)
  if (!stateData || !stateData.travelRestrictions) {
    return {
      dayOnly: true,
      noWeekends: false,
      noHolidays: true,
    }
  }

  const restrictions = stateData.travelRestrictions

  return {
    dayOnly: restrictions.noNightTravel,
    noWeekends: restrictions.noWeekendTravel || false,
    noHolidays: restrictions.noHolidayTravel,
    curfewHours: restrictions.peakHourRestrictions
      ? { start: 7, end: 9 } // Default peak hours if mentioned
      : undefined,
  }
}

// ============================================================================
// ESCORT REQUIREMENT CALCULATIONS
// ============================================================================

/**
 * Calculate escort requirements for a single state
 */
export function calculateStateEscortRequirements(
  stateCode: string,
  cargo: {
    width: number
    height: number
    length: number
    weight: number
  },
  truck: TruckType
): SmartEscortRequirements {
  const rules = getStateEscortRules(stateCode)
  const travelRestrictions = getStateTravelRestrictions(stateCode)

  // Calculate total dimensions
  const totalHeight = truck.deckHeight + cargo.height
  const totalLength = cargo.length // Could add tractor length for overall
  const grossWeight = cargo.weight + truck.tareWeight + LEGAL_LIMITS.TRACTOR_WEIGHT

  // Initialize requirements
  const requirements: SmartEscortRequirements = {
    frontPilot: false,
    rearPilot: false,
    policeEscort: false,
    bucketTruck: false,
    signage: [],
    flags: { front: false, rear: false, corners: false },
    lights: { amber: false, rotating: false },
    travelRestrictions,
    estimatedCost: 0,
  }

  // Use rules if available, otherwise use defaults
  const widthThresholds = rules?.widthThresholds || { frontPilot: 12, rearPilot: 14, police: 16 }
  const heightThresholds = rules?.heightThresholds || { frontPilot: 15, rearPilot: 17, police: 18 }
  const lengthThresholds = rules?.lengthThresholds || { frontPilot: 100, rearPilot: 125, police: 150 }
  const weightThresholds = rules?.weightThresholds || { frontPilot: 200000, rearPilot: 250000, police: 300000 }

  // Width-based requirements
  if (cargo.width > widthThresholds.frontPilot) {
    requirements.frontPilot = true
  }
  if (cargo.width > widthThresholds.rearPilot) {
    requirements.rearPilot = true
  }
  if (cargo.width > widthThresholds.police) {
    requirements.policeEscort = true
  }

  // Height-based requirements
  if (totalHeight > heightThresholds.frontPilot) {
    requirements.frontPilot = true // Pole car needed
  }
  if (totalHeight > heightThresholds.rearPilot) {
    requirements.rearPilot = true
  }
  if (totalHeight > heightThresholds.police) {
    requirements.policeEscort = true
  }
  if (totalHeight > 17) {
    requirements.bucketTruck = true // May need to lift power lines
  }

  // Length-based requirements
  if (totalLength > lengthThresholds.frontPilot) {
    requirements.frontPilot = true
  }
  if (totalLength > lengthThresholds.rearPilot) {
    requirements.rearPilot = true
  }
  if (totalLength > lengthThresholds.police) {
    requirements.policeEscort = true
  }

  // Weight-based requirements
  if (grossWeight > weightThresholds.frontPilot) {
    requirements.frontPilot = true
  }
  if (grossWeight > weightThresholds.rearPilot) {
    requirements.rearPilot = true
  }
  if (grossWeight > weightThresholds.police) {
    requirements.policeEscort = true
  }

  // Signage requirements
  if (cargo.width > WIDE_LOAD_THRESHOLD) {
    requirements.signage.push('WIDE LOAD')
    requirements.flags.front = true
    requirements.flags.rear = true
  }
  if (cargo.width > OVERSIZE_LOAD_THRESHOLD || totalHeight > LEGAL_LIMITS.HEIGHT || totalLength > 75) {
    requirements.signage.push('OVERSIZE LOAD')
    requirements.flags.corners = true
    requirements.lights.amber = true
  }
  if (grossWeight > 100000) {
    requirements.signage.push('HEAVY LOAD')
  }

  // Lighting requirements for escorts
  if (requirements.frontPilot || requirements.rearPilot) {
    requirements.lights.amber = true
    requirements.lights.rotating = true
  }

  return requirements
}

// ============================================================================
// MULTI-STATE CALCULATIONS
// ============================================================================

/**
 * Get the most restrictive state along a route
 * (the state that requires the most escorts)
 */
export function getMostRestrictiveState(
  routeStates: string[],
  cargo: {
    width: number
    height: number
    length: number
    weight: number
  },
  truck: TruckType
): string {
  let mostRestrictive = routeStates[0]
  let maxEscortCount = 0

  for (const state of routeStates) {
    const requirements = calculateStateEscortRequirements(state, cargo, truck)
    let escortCount = 0
    if (requirements.frontPilot) escortCount++
    if (requirements.rearPilot) escortCount++
    if (requirements.policeEscort) escortCount += 2 // Police counts as 2
    if (requirements.bucketTruck) escortCount++

    if (escortCount > maxEscortCount) {
      maxEscortCount = escortCount
      mostRestrictive = state
    }
  }

  return mostRestrictive
}

/**
 * Calculate combined escort requirements for entire route
 * Uses most restrictive rules across all states
 */
export function calculateEscortRequirements(
  routeStates: string[],
  cargo: {
    width: number
    height: number
    length: number
    weight: number
  },
  truck: TruckType
): SmartEscortRequirements {
  // Start with no requirements
  const combined: SmartEscortRequirements = {
    frontPilot: false,
    rearPilot: false,
    policeEscort: false,
    bucketTruck: false,
    signage: [],
    flags: { front: false, rear: false, corners: false },
    lights: { amber: false, rotating: false },
    travelRestrictions: {
      dayOnly: false,
      noWeekends: false,
      noHolidays: false,
    },
    estimatedCost: 0,
  }

  // Aggregate requirements from all states (most restrictive wins)
  for (const state of routeStates) {
    const stateReqs = calculateStateEscortRequirements(state, cargo, truck)

    combined.frontPilot = combined.frontPilot || stateReqs.frontPilot
    combined.rearPilot = combined.rearPilot || stateReqs.rearPilot
    combined.policeEscort = combined.policeEscort || stateReqs.policeEscort
    combined.bucketTruck = combined.bucketTruck || stateReqs.bucketTruck

    // Merge signage (unique only)
    for (const sign of stateReqs.signage) {
      if (!combined.signage.includes(sign)) {
        combined.signage.push(sign)
      }
    }

    // Merge flags (any true = true)
    combined.flags.front = combined.flags.front || stateReqs.flags.front
    combined.flags.rear = combined.flags.rear || stateReqs.flags.rear
    combined.flags.corners = combined.flags.corners || stateReqs.flags.corners

    // Merge lights
    combined.lights.amber = combined.lights.amber || stateReqs.lights.amber
    combined.lights.rotating = combined.lights.rotating || stateReqs.lights.rotating

    // Merge travel restrictions (most restrictive)
    combined.travelRestrictions.dayOnly =
      combined.travelRestrictions.dayOnly || stateReqs.travelRestrictions.dayOnly
    combined.travelRestrictions.noWeekends =
      combined.travelRestrictions.noWeekends || stateReqs.travelRestrictions.noWeekends
    combined.travelRestrictions.noHolidays =
      combined.travelRestrictions.noHolidays || stateReqs.travelRestrictions.noHolidays
  }

  return combined
}

// ============================================================================
// COST ESTIMATION
// ============================================================================

/**
 * Estimate escort costs for a trip
 */
export function estimateEscortCost(
  requirements: SmartEscortRequirements,
  distanceMiles: number,
  averageSpeedMph: number = 45
): number {
  // Calculate trip hours and days
  const tripHours = distanceMiles / averageSpeedMph
  const tripDays = Math.ceil(tripHours / 10) // Max 10 driving hours per day

  let cost = 0

  // Pilot car costs (per day)
  if (requirements.frontPilot) {
    cost += ESCORT_COST_PER_DAY * tripDays
  }
  if (requirements.rearPilot) {
    cost += ESCORT_COST_PER_DAY * tripDays
  }

  // Police escort (per hour)
  if (requirements.policeEscort) {
    cost += POLICE_ESCORT_PER_HOUR * tripHours
  }

  // Bucket truck (per day)
  if (requirements.bucketTruck) {
    cost += BUCKET_TRUCK_PER_DAY * tripDays
  }

  // If pole car needed for height, add cost
  if (requirements.frontPilot) {
    // Check if this is for height (pole car is more expensive)
    // This is a simplification - in practice determined by height requirements
    cost += (POLE_CAR_COST_PER_DAY - ESCORT_COST_PER_DAY) * tripDays * 0.5
  }

  return Math.round(cost)
}

/**
 * Get detailed escort cost breakdown
 */
export function getEscortCostBreakdown(
  requirements: SmartEscortRequirements,
  distanceMiles: number,
  stateDistances?: Record<string, number>
): {
  frontPilotCost: number
  rearPilotCost: number
  policeCost: number
  bucketTruckCost: number
  totalCost: number
  tripDays: number
  notes: string[]
} {
  const tripHours = distanceMiles / 45
  const tripDays = Math.ceil(tripHours / 10)

  const breakdown = {
    frontPilotCost: requirements.frontPilot ? ESCORT_COST_PER_DAY * tripDays : 0,
    rearPilotCost: requirements.rearPilot ? ESCORT_COST_PER_DAY * tripDays : 0,
    policeCost: requirements.policeEscort ? POLICE_ESCORT_PER_HOUR * tripHours : 0,
    bucketTruckCost: requirements.bucketTruck ? BUCKET_TRUCK_PER_DAY * tripDays : 0,
    totalCost: 0,
    tripDays,
    notes: [] as string[],
  }

  breakdown.totalCost =
    breakdown.frontPilotCost +
    breakdown.rearPilotCost +
    breakdown.policeCost +
    breakdown.bucketTruckCost

  // Generate notes
  if (requirements.frontPilot) {
    breakdown.notes.push(`Front pilot car: $${ESCORT_COST_PER_DAY}/day × ${tripDays} days`)
  }
  if (requirements.rearPilot) {
    breakdown.notes.push(`Rear pilot car: $${ESCORT_COST_PER_DAY}/day × ${tripDays} days`)
  }
  if (requirements.policeEscort) {
    breakdown.notes.push(`Police escort: $${POLICE_ESCORT_PER_HOUR}/hr × ${Math.ceil(tripHours)} hours`)
  }
  if (requirements.bucketTruck) {
    breakdown.notes.push(`Bucket truck: $${BUCKET_TRUCK_PER_DAY}/day × ${tripDays} days`)
  }

  if (requirements.travelRestrictions.dayOnly) {
    breakdown.notes.push('⚠️ Daytime travel only - may extend trip duration')
  }
  if (requirements.travelRestrictions.noWeekends) {
    breakdown.notes.push('⚠️ No weekend travel allowed')
  }

  return breakdown
}

/**
 * Get human-readable escort summary
 */
export function getEscortSummary(requirements: SmartEscortRequirements): string[] {
  const summary: string[] = []

  if (!requirements.frontPilot && !requirements.rearPilot && !requirements.policeEscort) {
    summary.push('No pilot cars or escorts required')
  } else {
    if (requirements.frontPilot && requirements.rearPilot) {
      summary.push('Front and rear pilot cars required')
    } else if (requirements.frontPilot) {
      summary.push('Front pilot car required')
    } else if (requirements.rearPilot) {
      summary.push('Rear pilot car required')
    }

    if (requirements.policeEscort) {
      summary.push('Police escort required')
    }

    if (requirements.bucketTruck) {
      summary.push('Bucket truck required for power line clearance')
    }
  }

  if (requirements.signage.length > 0) {
    summary.push(`Required signage: ${requirements.signage.join(', ')}`)
  }

  if (requirements.flags.corners) {
    summary.push('Red/orange flags required on all corners')
  } else if (requirements.flags.front || requirements.flags.rear) {
    summary.push('Red/orange flags required on extremities')
  }

  if (requirements.lights.rotating) {
    summary.push('Rotating amber lights required')
  } else if (requirements.lights.amber) {
    summary.push('Amber warning lights required')
  }

  // Travel restrictions
  const restrictions: string[] = []
  if (requirements.travelRestrictions.dayOnly) restrictions.push('daylight only')
  if (requirements.travelRestrictions.noWeekends) restrictions.push('weekdays only')
  if (requirements.travelRestrictions.noHolidays) restrictions.push('no holidays')
  if (restrictions.length > 0) {
    summary.push(`Travel restrictions: ${restrictions.join(', ')}`)
  }

  return summary
}
