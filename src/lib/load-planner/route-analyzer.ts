/**
 * Route Analyzer - AI Route Recommendation Engine
 *
 * Analyzes multiple route alternatives and recommends the optimal route
 * based on cost, time, restrictions, and other factors.
 */

import type {
  RouteAlternative,
  RouteRecommendation,
  TruckRouteRecommendation,
  CargoSpecs,
  DetailedPermitRequirement
} from './types'

// Scoring weights for route evaluation
const WEIGHTS = {
  cost: 0.40,           // Total cost is heavily weighted
  time: 0.20,           // Time is moderately important
  complexity: 0.15,     // Fewer states = simpler logistics
  restrictions: 0.15,   // Travel restrictions severity
  superload: 0.10,      // Superload requirements are a big deal
}

/**
 * Score a route based on multiple factors
 * Returns score from 0-100 (higher is better)
 */
function scoreRoute(
  route: RouteAlternative,
  allRoutes: RouteAlternative[]
): number {
  // Normalize costs (lower is better)
  const maxCost = Math.max(...allRoutes.map(r => r.estimatedCosts.total), 1)
  const costScore = (1 - route.estimatedCosts.total / maxCost) * 100

  // Normalize time (lower is better)
  const maxTime = Math.max(...allRoutes.map(r => r.totalDurationMinutes), 1)
  const timeScore = (1 - route.totalDurationMinutes / maxTime) * 100

  // Complexity score (fewer states is better)
  const maxStates = Math.max(...allRoutes.map(r => r.statesTraversed.length), 1)
  const complexityScore = (1 - (route.statesTraversed.length - 1) / (maxStates - 1 || 1)) * 100

  // Restrictions score (fewer restrictions is better)
  const restrictionCount = route.permitSummary.statePermits.reduce(
    (sum, p) => sum + p.travelRestrictions.length, 0
  )
  const maxRestrictions = Math.max(
    ...allRoutes.map(r => r.permitSummary.statePermits.reduce(
      (sum, p) => sum + p.travelRestrictions.length, 0
    )), 1
  )
  const restrictionScore = (1 - restrictionCount / maxRestrictions) * 100

  // Superload penalty (if any state requires superload, major penalty)
  const hasSuperload = route.permitSummary.statePermits.some(p => p.isSuperload)
  const superloadScore = hasSuperload ? 0 : 100

  // Weighted sum
  const totalScore =
    costScore * WEIGHTS.cost +
    timeScore * WEIGHTS.time +
    complexityScore * WEIGHTS.complexity +
    restrictionScore * WEIGHTS.restrictions +
    superloadScore * WEIGHTS.superload

  return Math.round(totalScore)
}

/**
 * Format cost difference for human readability
 */
function formatCostDiff(amount: number): string {
  if (amount >= 100000) {
    return `$${(amount / 100000).toFixed(1)}k`
  }
  return `$${(amount / 100).toFixed(0)}`
}

/**
 * Format duration for comparison
 */
function formatDurationDiff(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Generate reasoning for why a route is recommended
 */
function generateReasoning(
  route: RouteAlternative,
  allRoutes: RouteAlternative[]
): string[] {
  const reasoning: string[] = []

  // Check if this is the cheapest
  const sortedByCost = [...allRoutes].sort((a, b) => a.estimatedCosts.total - b.estimatedCosts.total)
  if (sortedByCost[0]?.id === route.id) {
    if (sortedByCost.length > 1) {
      const diff = sortedByCost[1].estimatedCosts.total - route.estimatedCosts.total
      reasoning.push(`Lowest total cost - saves ${formatCostDiff(diff)} vs next option`)
    } else {
      reasoning.push('Lowest total cost')
    }
  }

  // Check if this is the fastest
  const sortedByTime = [...allRoutes].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes)
  if (sortedByTime[0]?.id === route.id) {
    reasoning.push(`Fastest route at ${formatDurationDiff(route.totalDurationMinutes)}`)
  }

  // Check permit cost advantages
  const sortedByPermits = [...allRoutes].sort((a, b) => a.estimatedCosts.permits - b.estimatedCosts.permits)
  if (sortedByPermits[0]?.id === route.id && sortedByPermits.length > 1) {
    const diff = sortedByPermits[1].estimatedCosts.permits - route.estimatedCosts.permits
    if (diff > 0) {
      reasoning.push(`Lowest permit fees - saves ${formatCostDiff(diff)} on permits`)
    }
  }

  // Check escort cost advantages
  const sortedByEscorts = [...allRoutes].sort((a, b) => a.estimatedCosts.escorts - b.estimatedCosts.escorts)
  if (sortedByEscorts[0]?.id === route.id && sortedByEscorts.length > 1) {
    const diff = sortedByEscorts[1].estimatedCosts.escorts - route.estimatedCosts.escorts
    if (diff > 0) {
      reasoning.push(`Lowest escort costs - saves ${formatCostDiff(diff)} on escorts`)
    }
  }

  // Check for fewer states (simpler logistics)
  const sortedByStates = [...allRoutes].sort((a, b) => a.statesTraversed.length - b.statesTraversed.length)
  if (sortedByStates[0]?.id === route.id && sortedByStates.length > 1) {
    if (sortedByStates[1].statesTraversed.length > route.statesTraversed.length) {
      reasoning.push(`Traverses fewer states (${route.statesTraversed.length} vs ${sortedByStates[1].statesTraversed.length}) - simpler permit process`)
    }
  }

  // Check for no superload requirements
  const hasSuperload = route.permitSummary.statePermits.some(p => p.isSuperload)
  const otherHasSuperload = allRoutes
    .filter(r => r.id !== route.id)
    .some(r => r.permitSummary.statePermits.some(p => p.isSuperload))

  if (!hasSuperload && otherHasSuperload) {
    reasoning.push('Avoids superload requirements in all states')
  }

  // Check for fewer travel restrictions
  const getRestrictionCount = (r: RouteAlternative) =>
    r.permitSummary.statePermits.reduce((sum, p) => sum + p.travelRestrictions.length, 0)

  const restrictionCount = getRestrictionCount(route)
  const otherMinRestrictions = Math.min(
    ...allRoutes.filter(r => r.id !== route.id).map(getRestrictionCount)
  )

  if (restrictionCount < otherMinRestrictions) {
    reasoning.push('Fewer travel restrictions')
  }

  // If no specific advantages found, note it's balanced
  if (reasoning.length === 0) {
    reasoning.push('Best overall balance of cost, time, and complexity')
  }

  return reasoning
}

/**
 * Generate alternative considerations for non-recommended routes
 */
function generateAlternativeConsiderations(
  route: RouteAlternative,
  recommended: RouteAlternative,
  allRoutes: RouteAlternative[]
): { pros: string[]; cons: string[] } {
  const pros: string[] = []
  const cons: string[] = []

  // Time comparison
  if (route.totalDurationMinutes < recommended.totalDurationMinutes) {
    const diff = recommended.totalDurationMinutes - route.totalDurationMinutes
    pros.push(`${formatDurationDiff(diff)} faster`)
  } else if (route.totalDurationMinutes > recommended.totalDurationMinutes) {
    const diff = route.totalDurationMinutes - recommended.totalDurationMinutes
    cons.push(`${formatDurationDiff(diff)} slower`)
  }

  // Cost comparison
  if (route.estimatedCosts.total > recommended.estimatedCosts.total) {
    const diff = route.estimatedCosts.total - recommended.estimatedCosts.total
    cons.push(`${formatCostDiff(diff)} more expensive`)
  }

  // Distance comparison
  if (route.totalDistanceMiles < recommended.totalDistanceMiles - 20) {
    const diff = Math.round(recommended.totalDistanceMiles - route.totalDistanceMiles)
    pros.push(`${diff} miles shorter`)
  } else if (route.totalDistanceMiles > recommended.totalDistanceMiles + 20) {
    const diff = Math.round(route.totalDistanceMiles - recommended.totalDistanceMiles)
    cons.push(`${diff} miles longer`)
  }

  // States comparison
  if (route.statesTraversed.length < recommended.statesTraversed.length) {
    pros.push(`Fewer states (${route.statesTraversed.length} vs ${recommended.statesTraversed.length})`)
  } else if (route.statesTraversed.length > recommended.statesTraversed.length) {
    cons.push(`More states to traverse (${route.statesTraversed.length})`)
  }

  // Superload check
  const hasSuperload = route.permitSummary.statePermits.some(p => p.isSuperload)
  if (hasSuperload) {
    cons.push('Requires superload permits')
  }

  return { pros, cons }
}

/**
 * Analyze multiple routes and generate AI recommendation
 */
export function analyzeRouteRecommendation(
  routes: RouteAlternative[]
): RouteRecommendation {
  if (routes.length === 0) {
    return {
      recommendedRouteId: '',
      recommendedRouteName: 'No routes available',
      reasoning: ['No routes calculated'],
      warnings: ['Please enter origin and destination to calculate routes'],
      alternativeConsiderations: [],
    }
  }

  if (routes.length === 1) {
    return {
      recommendedRouteId: routes[0].id,
      recommendedRouteName: routes[0].name,
      reasoning: ['Only one route available'],
      warnings: [],
      alternativeConsiderations: [],
    }
  }

  // Score all routes
  const scoredRoutes = routes.map(route => ({
    route,
    score: scoreRoute(route, routes),
  })).sort((a, b) => b.score - a.score)

  const recommended = scoredRoutes[0].route
  const nextBest = scoredRoutes[1]?.route

  // Generate reasoning
  const reasoning = generateReasoning(recommended, routes)

  // Calculate cost savings
  let costSavings: RouteRecommendation['costSavings'] = undefined
  if (nextBest) {
    const savings = nextBest.estimatedCosts.total - recommended.estimatedCosts.total
    if (savings > 0) {
      costSavings = {
        amount: savings,
        comparedTo: nextBest.name,
      }
    }
  }

  // Generate warnings
  const warnings: string[] = []

  const hasSuperload = recommended.permitSummary.statePermits.some(p => p.isSuperload)
  if (hasSuperload) {
    warnings.push('Route requires superload permits - expect longer processing times')
  }

  const totalRestrictions = recommended.permitSummary.statePermits.reduce(
    (sum, p) => sum + p.travelRestrictions.length, 0
  )
  if (totalRestrictions > 5) {
    warnings.push('Multiple travel restrictions apply - plan timing carefully')
  }

  if (recommended.totalDistanceMiles > 1500) {
    warnings.push('Long haul route - consider driver rest requirements')
  }

  // Generate alternative considerations
  const alternativeConsiderations = routes
    .filter(r => r.id !== recommended.id)
    .map(route => {
      const { pros, cons } = generateAlternativeConsiderations(route, recommended, routes)
      return {
        routeId: route.id,
        routeName: route.name,
        pros,
        cons,
      }
    })

  return {
    recommendedRouteId: recommended.id,
    recommendedRouteName: recommended.name,
    reasoning,
    costSavings,
    warnings,
    alternativeConsiderations,
  }
}

/**
 * Analyze routes for multiple trucks with different dimensions
 * Each truck may need a different optimal route based on its cargo
 */
export function analyzePerTruckRoutes(
  routes: RouteAlternative[],
  trucks: Array<{
    index: number
    id: string
    name: string
    description: string
    cargo: CargoSpecs
    isOversize: boolean
    isOverweight: boolean
  }>
): TruckRouteRecommendation[] {
  if (routes.length === 0 || trucks.length === 0) {
    return []
  }

  // Get global recommendation
  const globalRecommendation = analyzeRouteRecommendation(routes)

  return trucks.map(truck => {
    // For now, legal trucks use the global recommendation
    // Oversize/overweight trucks may need special consideration

    const reasoning: string[] = []
    let alternativeRouteId: string | undefined
    let alternativeReason: string | undefined

    if (truck.isOversize || truck.isOverweight) {
      // Check if any route avoids superload for this truck's dimensions
      const routesWithoutSuperload = routes.filter(route => {
        return !route.permitSummary.statePermits.some(permit => {
          // Check if this specific cargo dimensions trigger superload
          if (truck.cargo.width > 16) return true // Most states superload at 16'
          if (truck.cargo.height > 16) return true
          if (truck.cargo.grossWeight > 200000) return true
          return permit.isSuperload
        })
      })

      if (routesWithoutSuperload.length > 0) {
        // Find the cheapest route that avoids superload
        const bestNoSuperload = routesWithoutSuperload
          .sort((a, b) => a.estimatedCosts.total - b.estimatedCosts.total)[0]

        if (bestNoSuperload.id !== globalRecommendation.recommendedRouteId) {
          alternativeRouteId = bestNoSuperload.id
          alternativeReason = 'Avoids superload permits for this load'
          reasoning.push(`Oversize load - using ${bestNoSuperload.name} to avoid superload requirements`)
        }
      }

      // Add oversize-specific reasoning
      if (truck.isOversize && truck.isOverweight) {
        reasoning.push('Oversize and overweight load - requires both dimension and weight permits')
      } else if (truck.isOversize) {
        reasoning.push(`Oversize load (${truck.cargo.width.toFixed(1)}' W × ${truck.cargo.height.toFixed(1)}' H)`)
      } else {
        reasoning.push(`Overweight load (${(truck.cargo.grossWeight / 1000).toFixed(0)}k lbs)`)
      }
    } else {
      reasoning.push('Legal load - can use any route')
    }

    // Add global recommendation reasoning if using it
    if (!alternativeRouteId) {
      reasoning.push(...globalRecommendation.reasoning.slice(0, 2))
    }

    return {
      truckIndex: truck.index,
      truckId: truck.id,
      truckName: truck.name,
      cargoDescription: truck.description,
      isOversize: truck.isOversize,
      isOverweight: truck.isOverweight,
      recommendedRouteId: alternativeRouteId || globalRecommendation.recommendedRouteId,
      recommendedRouteName: alternativeRouteId
        ? routes.find(r => r.id === alternativeRouteId)?.name || 'Unknown'
        : globalRecommendation.recommendedRouteName,
      reasoning,
      alternativeRouteId,
      alternativeReason,
    }
  })
}
