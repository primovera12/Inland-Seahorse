/**
 * Hours of Service (HOS) Validator Module
 * Validates if routes are achievable within DOT hours-of-service limits
 * and calculates required rest stops.
 *
 * DOT HOS Rules (49 CFR 395):
 * - 11-Hour Driving Limit: Max 11 hours driving after 10 consecutive hours off duty
 * - 14-Hour Window: Cannot drive beyond 14th hour after coming on duty
 * - 30-Minute Break: Required after 8 cumulative hours of driving
 * - 60/70-Hour Limit: Cannot drive after 60/70 hours on duty in 7/8 consecutive days
 * - Sleeper Berth: 7/3 or 8/2 split allowed
 */

import {
  HOSStatus,
  TripHOSValidation,
  RequiredBreak,
  RestStop,
} from './types'

// ============================================================================
// CONSTANTS - DOT HOS LIMITS
// ============================================================================

export const HOS_LIMITS = {
  // Driving limits (in minutes)
  MAX_DRIVING_TIME: 11 * 60,        // 11 hours = 660 minutes
  MAX_ON_DUTY_WINDOW: 14 * 60,      // 14 hours = 840 minutes
  MAX_BEFORE_BREAK: 8 * 60,         // 8 hours = 480 minutes before 30-min break
  REQUIRED_BREAK_DURATION: 30,      // 30 minutes

  // Rest requirements
  REQUIRED_OFF_DUTY: 10 * 60,       // 10 hours off duty to reset
  SLEEPER_SPLIT_1: 7 * 60,          // 7-hour sleeper berth option
  SLEEPER_SPLIT_2: 3 * 60,          // Plus 3-hour break

  // Cycle limits (in hours)
  CYCLE_70_HOURS: 70,               // 70-hour/8-day cycle
  CYCLE_60_HOURS: 60,               // 60-hour/7-day cycle

  // Average speeds for calculation (mph)
  OVERSIZE_AVG_SPEED: 45,           // Oversize loads move slower
  STANDARD_AVG_SPEED: 55,           // Standard truck speed
}

// ============================================================================
// DRIVE TIME CALCULATIONS
// ============================================================================

/**
 * Calculate estimated drive time for a route
 * @param distanceMiles - Total route distance
 * @param isOversize - Whether this is an oversize load (slower speed)
 * @returns Drive time in minutes
 */
export function calculateDriveTime(
  distanceMiles: number,
  isOversize: boolean = false
): number {
  const avgSpeed = isOversize ? HOS_LIMITS.OVERSIZE_AVG_SPEED : HOS_LIMITS.STANDARD_AVG_SPEED
  const hours = distanceMiles / avgSpeed
  return Math.ceil(hours * 60) // Convert to minutes
}

/**
 * Calculate drive time with stops
 * Accounts for fuel stops, weigh stations, etc.
 */
export function calculateDriveTimeWithStops(
  distanceMiles: number,
  isOversize: boolean = false
): number {
  const baseDriveTime = calculateDriveTime(distanceMiles, isOversize)

  // Add time for typical stops
  // Roughly 1 fuel stop per 400 miles (15 min each)
  const fuelStops = Math.floor(distanceMiles / 400)
  const fuelStopTime = fuelStops * 15

  // Weigh stations - assume 2 per trip for cross-country (10 min each)
  const weighStationTime = Math.min(Math.floor(distanceMiles / 300), 4) * 10

  return baseDriveTime + fuelStopTime + weighStationTime
}

// ============================================================================
// HOS STATUS HELPERS
// ============================================================================

/**
 * Create a fresh HOS status (driver starting after full rest)
 */
export function createFreshHOSStatus(): HOSStatus {
  return {
    drivingRemaining: HOS_LIMITS.MAX_DRIVING_TIME,
    onDutyRemaining: HOS_LIMITS.MAX_ON_DUTY_WINDOW,
    breakRequired: false,
    breakRequiredIn: HOS_LIMITS.MAX_BEFORE_BREAK,
    cycleRemaining: HOS_LIMITS.CYCLE_70_HOURS,
  }
}

/**
 * Update HOS status after driving
 */
export function updateHOSAfterDriving(
  status: HOSStatus,
  drivingMinutes: number
): HOSStatus {
  return {
    drivingRemaining: Math.max(0, status.drivingRemaining - drivingMinutes),
    onDutyRemaining: Math.max(0, status.onDutyRemaining - drivingMinutes),
    breakRequired: status.breakRequiredIn <= drivingMinutes,
    breakRequiredIn: Math.max(0, status.breakRequiredIn - drivingMinutes),
    cycleRemaining: status.cycleRemaining - (drivingMinutes / 60),
  }
}

/**
 * Reset HOS after 30-minute break
 */
export function resetAfterBreak(status: HOSStatus): HOSStatus {
  return {
    ...status,
    breakRequired: false,
    breakRequiredIn: HOS_LIMITS.MAX_BEFORE_BREAK,
  }
}

// ============================================================================
// BREAK LOCATION FINDING
// ============================================================================

/**
 * Generate suggested break locations along route
 * In a real implementation, this would query a database of truck stops
 */
export function findRequiredBreakLocations(
  totalMiles: number,
  isOversize: boolean = false
): RequiredBreak[] {
  const breaks: RequiredBreak[] = []
  const avgSpeed = isOversize ? HOS_LIMITS.OVERSIZE_AVG_SPEED : HOS_LIMITS.STANDARD_AVG_SPEED

  // Calculate miles driven before break is needed
  const milesBeforeBreak = (HOS_LIMITS.MAX_BEFORE_BREAK / 60) * avgSpeed

  let milesCovered = 0
  let breakNumber = 1

  while (milesCovered + milesBeforeBreak < totalMiles) {
    milesCovered += milesBeforeBreak
    breaks.push({
      location: `Rest area near mile ${Math.round(milesCovered)}`,
      afterMiles: Math.round(milesCovered),
      duration: HOS_LIMITS.REQUIRED_BREAK_DURATION,
    })
    breakNumber++
  }

  return breaks
}

/**
 * Find overnight stop locations
 */
export function findOvernightLocations(
  totalMiles: number,
  isOversize: boolean = false
): RequiredBreak[] {
  const overnights: RequiredBreak[] = []
  const avgSpeed = isOversize ? HOS_LIMITS.OVERSIZE_AVG_SPEED : HOS_LIMITS.STANDARD_AVG_SPEED

  // Calculate max miles per day
  const maxDrivingHours = HOS_LIMITS.MAX_DRIVING_TIME / 60
  const maxMilesPerDay = maxDrivingHours * avgSpeed

  let milesCovered = 0
  let dayNumber = 1

  while (milesCovered + maxMilesPerDay < totalMiles) {
    milesCovered += maxMilesPerDay
    overnights.push({
      location: `Truck stop near mile ${Math.round(milesCovered)}`,
      afterMiles: Math.round(milesCovered),
      duration: HOS_LIMITS.REQUIRED_OFF_DUTY, // 10-hour rest
    })
    dayNumber++
  }

  return overnights
}

// ============================================================================
// TRIP VALIDATION
// ============================================================================

/**
 * Validate if a trip is achievable within HOS limits
 */
export function validateTripHOS(
  distanceMiles: number,
  driverStatus: HOSStatus = createFreshHOSStatus(),
  isOversize: boolean = false
): TripHOSValidation {
  const warnings: string[] = []
  const estimatedDriveTime = calculateDriveTimeWithStops(distanceMiles, isOversize)

  // Check if driver has enough time today
  const canCompleteTodayDriving = driverStatus.drivingRemaining >= estimatedDriveTime
  const canCompleteTodayDuty = driverStatus.onDutyRemaining >= estimatedDriveTime

  // Calculate required breaks
  const requiredBreaks = findRequiredBreakLocations(distanceMiles, isOversize)

  // Check if overnight is required
  const overnights = findOvernightLocations(distanceMiles, isOversize)
  const overnightRequired = overnights.length > 0

  // Determine if trip is achievable
  let isAchievable = true

  // Check cycle limits
  const totalDriveHours = estimatedDriveTime / 60
  if (totalDriveHours > driverStatus.cycleRemaining) {
    warnings.push(
      `Trip requires ${totalDriveHours.toFixed(1)} hours of driving, ` +
      `but driver only has ${driverStatus.cycleRemaining.toFixed(1)} hours remaining in cycle`
    )
    isAchievable = false
  }

  // Add break warnings
  if (driverStatus.breakRequired) {
    warnings.push('Driver requires 30-minute break before continuing')
  }

  if (estimatedDriveTime > HOS_LIMITS.MAX_BEFORE_BREAK && requiredBreaks.length === 0) {
    warnings.push('30-minute break required after 8 hours of driving')
  }

  // Add overnight warnings
  if (overnightRequired) {
    warnings.push(
      `Trip requires ${overnights.length} overnight stop(s) due to driving time limits`
    )
  }

  // Check if starting today is feasible
  if (!canCompleteTodayDriving && !overnightRequired) {
    const hoursRemaining = driverStatus.drivingRemaining / 60
    warnings.push(
      `Driver has ${hoursRemaining.toFixed(1)} hours driving time remaining today. ` +
      `Trip may need to start tomorrow.`
    )
  }

  // Combine breaks and overnights for complete list
  const allBreaks: RequiredBreak[] = [...requiredBreaks]
  if (overnights.length > 0) {
    for (const overnight of overnights) {
      // Don't duplicate if already covered by a break
      if (!allBreaks.some(b => Math.abs(b.afterMiles - overnight.afterMiles) < 50)) {
        allBreaks.push(overnight)
      }
    }
  }

  // Sort by miles
  allBreaks.sort((a, b) => a.afterMiles - b.afterMiles)

  return {
    isAchievable,
    estimatedDriveTime,
    requiredBreaks: allBreaks,
    overnightRequired,
    overnightLocation: overnights[0]?.location,
    warnings,
  }
}

// ============================================================================
// DELIVERY WINDOW ESTIMATION
// ============================================================================

/**
 * Estimate earliest and latest delivery times
 */
export function estimateDeliveryWindow(
  distanceMiles: number,
  departureTime: Date,
  driverStatus: HOSStatus = createFreshHOSStatus(),
  isOversize: boolean = false
): {
  earliest: Date
  latest: Date
  tripDays: number
  warnings: string[]
} {
  const validation = validateTripHOS(distanceMiles, driverStatus, isOversize)
  const warnings: string[] = [...validation.warnings]

  // Calculate total time including breaks
  let totalTimeMinutes = validation.estimatedDriveTime

  // Add break times
  for (const brk of validation.requiredBreaks) {
    totalTimeMinutes += brk.duration
  }

  // Calculate trip days
  const drivingDayMaxMinutes = HOS_LIMITS.MAX_DRIVING_TIME + (2 * HOS_LIMITS.REQUIRED_BREAK_DURATION)
  const tripDays = Math.ceil(validation.estimatedDriveTime / HOS_LIMITS.MAX_DRIVING_TIME)

  // Add overnight rest time if needed
  if (validation.overnightRequired) {
    const overnightCount = tripDays - 1
    totalTimeMinutes += overnightCount * HOS_LIMITS.REQUIRED_OFF_DUTY
  }

  // Calculate delivery times
  const earliest = new Date(departureTime.getTime() + totalTimeMinutes * 60 * 1000)

  // Latest includes possible delays (add 20% buffer)
  const latestMinutes = totalTimeMinutes * 1.2
  const latest = new Date(departureTime.getTime() + latestMinutes * 60 * 1000)

  // Add oversize travel restriction warnings
  if (isOversize) {
    warnings.push('Oversize loads typically restricted to daylight hours - delivery may be delayed')

    // If departure is late in day, delivery pushed to next day
    const departureHour = departureTime.getHours()
    if (departureHour >= 14) {
      warnings.push('Late departure may require waiting until next day for daytime travel')
    }
  }

  return {
    earliest,
    latest,
    tripDays,
    warnings,
  }
}

// ============================================================================
// TRIP PLANNING SUMMARY
// ============================================================================

/**
 * Generate a complete trip plan summary
 */
export function generateTripPlan(
  distanceMiles: number,
  departureTime: Date,
  driverStatus: HOSStatus = createFreshHOSStatus(),
  isOversize: boolean = false
): {
  summary: string[]
  schedule: Array<{
    day: number
    action: string
    location: string
    time: Date
    notes?: string
  }>
  hosValidation: TripHOSValidation
  deliveryWindow: { earliest: Date; latest: Date }
} {
  const hosValidation = validateTripHOS(distanceMiles, driverStatus, isOversize)
  const deliveryWindow = estimateDeliveryWindow(distanceMiles, departureTime, driverStatus, isOversize)

  const summary: string[] = []
  const schedule: Array<{
    day: number
    action: string
    location: string
    time: Date
    notes?: string
  }> = []

  // Build summary
  summary.push(`Total distance: ${distanceMiles.toLocaleString()} miles`)
  summary.push(`Estimated drive time: ${Math.round(hosValidation.estimatedDriveTime / 60)} hours`)
  summary.push(`Trip duration: ${deliveryWindow.tripDays} day(s)`)

  if (hosValidation.requiredBreaks.length > 0) {
    summary.push(`Required breaks: ${hosValidation.requiredBreaks.length}`)
  }

  if (hosValidation.overnightRequired) {
    summary.push(`Overnight stops required: ${Math.ceil(deliveryWindow.tripDays - 1)}`)
  }

  // Build schedule
  let currentTime = new Date(departureTime)
  let currentDay = 1
  let milesSoFar = 0

  // Departure
  schedule.push({
    day: currentDay,
    action: 'Depart',
    location: 'Origin',
    time: new Date(currentTime),
  })

  const avgSpeed = isOversize ? HOS_LIMITS.OVERSIZE_AVG_SPEED : HOS_LIMITS.STANDARD_AVG_SPEED

  // Add breaks and overnights to schedule
  for (const brk of hosValidation.requiredBreaks) {
    // Calculate drive time to this break
    const milesToBreak = brk.afterMiles - milesSoFar
    const driveMinutes = (milesToBreak / avgSpeed) * 60
    currentTime = new Date(currentTime.getTime() + driveMinutes * 60 * 1000)

    // Is this an overnight or just a break?
    if (brk.duration >= HOS_LIMITS.REQUIRED_OFF_DUTY) {
      schedule.push({
        day: currentDay,
        action: 'Overnight rest',
        location: brk.location,
        time: new Date(currentTime),
        notes: '10-hour rest period',
      })
      currentDay++
      currentTime = new Date(currentTime.getTime() + brk.duration * 60 * 1000)
      schedule.push({
        day: currentDay,
        action: 'Resume driving',
        location: brk.location,
        time: new Date(currentTime),
      })
    } else {
      schedule.push({
        day: currentDay,
        action: '30-minute break',
        location: brk.location,
        time: new Date(currentTime),
        notes: 'Required DOT break',
      })
      currentTime = new Date(currentTime.getTime() + brk.duration * 60 * 1000)
    }

    milesSoFar = brk.afterMiles
  }

  // Final leg to destination
  const remainingMiles = distanceMiles - milesSoFar
  const finalDriveMinutes = (remainingMiles / avgSpeed) * 60
  currentTime = new Date(currentTime.getTime() + finalDriveMinutes * 60 * 1000)

  schedule.push({
    day: currentDay,
    action: 'Arrive',
    location: 'Destination',
    time: new Date(currentTime),
  })

  return {
    summary,
    schedule,
    hosValidation,
    deliveryWindow: {
      earliest: deliveryWindow.earliest,
      latest: deliveryWindow.latest,
    },
  }
}
