'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  MapPin,
  Route,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Snowflake,
  Building2,
  DollarSign,
  Info,
  Moon,
  Car,
  Ruler,
  Siren,
} from 'lucide-react'
import type { LatLng, StateSegment, RouteResult } from '@/lib/load-planner/route-calculator'
import type { SeasonalRestriction } from '@/lib/load-planner/seasonal-restrictions'
import type { LowClearanceBridge } from '@/lib/load-planner/bridge-heights'
import type { CargoSpecs, RoutePermitSummary, DetailedPermitRequirement, DetailedRoutePermitSummary, EscortCostBreakdown, RouteRecommendation, TruckRouteRecommendation } from '@/lib/load-planner/types'
import { ExternalLink, Truck, Sparkles, ThumbsUp, ArrowRight } from 'lucide-react'

// Per-truck cargo specs for multi-truck permit analysis
interface TruckCargoSpecs extends CargoSpecs {
  truckIndex: number
  truckName: string
  truckId: string
  isOversize: boolean
  isOverweight: boolean
}

// Helper function to generate reasoning for a single route
function generateSingleRouteReasoning(
  permitSummary: DetailedRoutePermitSummary | null,
  routeResult: RouteResult,
  bridgeWarnings: RouteIntelligenceState['bridgeWarnings']
): string[] {
  const reasoning: string[] = []

  // Distance and time
  if (routeResult.totalDistanceMiles < 500) {
    reasoning.push(`Short haul route at ${routeResult.totalDistanceMiles.toLocaleString()} miles`)
  } else if (routeResult.totalDistanceMiles < 1000) {
    reasoning.push(`Regional route at ${routeResult.totalDistanceMiles.toLocaleString()} miles`)
  } else {
    reasoning.push(`Long haul route at ${routeResult.totalDistanceMiles.toLocaleString()} miles`)
  }

  // States
  if (routeResult.statesTraversed.length === 1) {
    reasoning.push('Single state route - simplifies permitting')
  } else if (routeResult.statesTraversed.length <= 3) {
    reasoning.push(`Traverses ${routeResult.statesTraversed.length} states - manageable permit process`)
  } else {
    reasoning.push(`Traverses ${routeResult.statesTraversed.length} states - multi-state permits required`)
  }

  // Permit costs
  if (permitSummary) {
    if (permitSummary.totalPermitCost === 0) {
      reasoning.push('No permits required - legal dimensions')
    } else if (permitSummary.totalPermitCost < 50000) {
      reasoning.push(`Low permit costs: $${(permitSummary.totalPermitCost / 100).toLocaleString()}`)
    } else {
      reasoning.push(`Permit costs: $${(permitSummary.totalPermitCost / 100).toLocaleString()}`)
    }

    // Escort costs
    if (permitSummary.totalEscortCost > 0) {
      reasoning.push(`Escort services required: $${(permitSummary.totalEscortCost / 100).toLocaleString()}`)
    }

    // Superload check
    const hasSuperload = permitSummary.statePermits.some(p => p.isSuperload)
    if (hasSuperload) {
      reasoning.push('Superload permits required - extended processing time')
    }
  }

  // Bridge clearance
  if (bridgeWarnings?.hasIssues) {
    reasoning.push(`${bridgeWarnings.bridges.length} bridge clearance issue(s) to review`)
  } else {
    reasoning.push('Bridge clearances OK for this route')
  }

  return reasoning
}

// Helper function to generate warnings for the route
function generateRouteWarnings(
  permitSummary: DetailedRoutePermitSummary | null,
  bridgeWarnings: RouteIntelligenceState['bridgeWarnings'],
  seasonalWarnings: RouteIntelligenceState['seasonalWarnings']
): string[] {
  const warnings: string[] = []

  // Bridge warnings
  if (bridgeWarnings?.hasIssues) {
    const dangerBridges = bridgeWarnings.bridges.filter(b => b.clearanceResult.severity === 'danger')
    if (dangerBridges.length > 0) {
      warnings.push(`${dangerBridges.length} bridge(s) with insufficient clearance - alternate route may be needed`)
    }
  }

  // Superload warning
  if (permitSummary?.statePermits.some(p => p.isSuperload)) {
    warnings.push('Superload status in one or more states - expect longer permit processing')
  }

  // Seasonal restrictions
  if (seasonalWarnings?.hasRestrictions) {
    warnings.push('Seasonal restrictions in effect - weight limits may be reduced')
  }

  // Travel restrictions
  const totalRestrictions = permitSummary?.statePermits.reduce(
    (sum, p) => sum + p.travelRestrictions.length, 0
  ) || 0
  if (totalRestrictions > 3) {
    warnings.push('Multiple travel time restrictions - plan schedule carefully')
  }

  return warnings
}

interface RouteIntelligenceProps {
  origin: string
  destination: string
  cargoSpecs: CargoSpecs
  perTruckCargoSpecs?: TruckCargoSpecs[]  // Optional per-truck specs for multi-truck analysis
  shipDate?: Date
  routeData?: RouteResult
  onRouteCalculated?: (result: RouteResult) => void
  onPermitDataCalculated?: (permitData: DetailedRoutePermitSummary | null) => void
  className?: string
}

interface RouteIntelligenceState {
  isLoading: boolean
  error: string | null
  routeResult: RouteResult | null
  permitSummary: RoutePermitSummary | null
  detailedPermitSummary: DetailedRoutePermitSummary | null
  seasonalWarnings: {
    hasRestrictions: boolean
    affectedStates: SeasonalRestriction[]
    warnings: string[]
    recommendations: string[]
  } | null
  bridgeWarnings: {
    hasIssues: boolean
    bridges: Array<{
      bridge: LowClearanceBridge
      clearanceResult: {
        clears: boolean
        clearance: number
        deficit: number
        severity: 'ok' | 'caution' | 'warning' | 'danger'
      }
    }>
    warnings: string[]
    recommendations: string[]
  } | null
  // AI Route Recommendation
  routeRecommendation: RouteRecommendation | null
  perTruckRecommendations: TruckRouteRecommendation[] | null
}

export function RouteIntelligence({
  origin,
  destination,
  cargoSpecs,
  perTruckCargoSpecs,
  shipDate,
  routeData,
  onRouteCalculated,
  onPermitDataCalculated,
  className,
}: RouteIntelligenceProps) {
  const [state, setState] = useState<RouteIntelligenceState>({
    isLoading: false,
    error: null,
    routeResult: null, // Don't initialize from routeData - let useEffect handle it
    permitSummary: null,
    detailedPermitSummary: null,
    seasonalWarnings: null,
    bridgeWarnings: null,
    routeRecommendation: null,
    perTruckRecommendations: null,
  })
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'states'])
  )
  const [expandedPermits, setExpandedPermits] = useState<Set<string>>(new Set())

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const analyzeRoute = useCallback(async () => {
    if (!origin || !destination) return

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Use existing route data if provided, otherwise calculate via API
      let routeToAnalyze = routeData

      if (!routeToAnalyze) {
        // Calculate the route via client-side API (works with referer-restricted keys)
        const { calculateRouteClientSide } = await import(
          '@/lib/load-planner/client-route-calculator'
        )
        routeToAnalyze = await calculateRouteClientSide(origin, destination)
      }

      if (routeToAnalyze) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          routeResult: routeToAnalyze,
        }))

        // Calculate permits for the route
        const { calculateRoutePermits, calculateDetailedRoutePermits } = await import('@/lib/load-planner/permit-calculator')
        const permitSummary = calculateRoutePermits(
          routeToAnalyze.statesTraversed,
          cargoSpecs,
          routeToAnalyze.stateDistances
        )

        // Calculate detailed permit breakdown for expandable view
        const detailedPermitSummary = calculateDetailedRoutePermits(
          routeToAnalyze.statesTraversed,
          cargoSpecs,
          routeToAnalyze.stateDistances
        )

        // Check seasonal restrictions
        const { checkRouteSeasonalRestrictions } = await import(
          '@/lib/load-planner/seasonal-restrictions'
        )
        const seasonalWarnings = checkRouteSeasonalRestrictions(
          routeToAnalyze.statesTraversed,
          shipDate
        )

        // Check bridge clearances
        const { checkRouteBridgeClearances } = await import('@/lib/load-planner/bridge-heights')
        const totalHeight = cargoSpecs.height // Already includes deck height if provided correctly
        const bridgeWarnings = checkRouteBridgeClearances(routeToAnalyze.waypoints, totalHeight)

        // Generate AI route recommendation
        // For single route, create a basic recommendation based on route characteristics
        const routeRecommendation: RouteRecommendation = {
          recommendedRouteId: 'route-0',
          recommendedRouteName: routeToAnalyze.statesTraversed.length > 0
            ? `via ${routeToAnalyze.statesTraversed.join(' → ')}`
            : 'Direct Route',
          reasoning: generateSingleRouteReasoning(
            detailedPermitSummary,
            routeToAnalyze,
            bridgeWarnings
          ),
          warnings: generateRouteWarnings(
            detailedPermitSummary,
            bridgeWarnings,
            seasonalWarnings
          ),
          alternativeConsiderations: [], // No alternatives for single route
        }

        // Generate per-truck recommendations if we have truck specs
        let perTruckRecommendations: TruckRouteRecommendation[] | null = null
        if (perTruckCargoSpecs && perTruckCargoSpecs.length > 1) {
          // Use the new per-truck route calculator for multi-truck scenarios
          try {
            const { calculatePerTruckRoutes } = await import(
              '@/lib/load-planner/client-route-calculator'
            )
            const perTruckResult = await calculatePerTruckRoutes(origin, destination, perTruckCargoSpecs)

            // Map the per-truck results to the expected format
            perTruckRecommendations = perTruckResult.truckRoutes.map(tr => ({
              truckIndex: tr.truckIndex,
              truckId: tr.truckId,
              truckName: tr.truckName,
              cargoDescription: `${tr.cargoSpecs.width.toFixed(1)}'W × ${tr.cargoSpecs.height.toFixed(1)}'H × ${(tr.cargoSpecs.grossWeight / 1000).toFixed(0)}k lbs`,
              isOversize: tr.isOversize,
              isOverweight: tr.isOverweight,
              recommendedRouteId: tr.recommendedRouteId,
              recommendedRouteName: tr.recommendedRouteName,
              reasoning: tr.reasoning,
              alternativeRouteId: tr.usesDifferentRoute ? tr.recommendedRouteId : undefined,
              alternativeReason: tr.differentRouteReason,
            }))

            // Update the route recommendation if we have route groups
            if (perTruckResult.routeGroups.length > 1) {
              routeRecommendation.warnings.push(
                `Different trucks may use different routes - ${perTruckResult.routeGroups.length} route groups identified`
              )
            }
          } catch (err) {
            console.warn('Per-truck route calculation failed, using fallback:', err)
            // Fallback to basic recommendations
            perTruckRecommendations = perTruckCargoSpecs.map(truck => ({
              truckIndex: truck.truckIndex,
              truckId: truck.truckId,
              truckName: truck.truckName,
              cargoDescription: `${truck.width.toFixed(1)}'W × ${truck.height.toFixed(1)}'H × ${(truck.grossWeight / 1000).toFixed(0)}k lbs`,
              isOversize: truck.isOversize,
              isOverweight: truck.isOverweight,
              recommendedRouteId: 'route-0',
              recommendedRouteName: routeRecommendation.recommendedRouteName,
              reasoning: truck.isOversize || truck.isOverweight
                ? ['Requires oversize/overweight permits', 'Using primary route for permit consistency']
                : ['Legal load dimensions', 'Can use any route'],
            }))
          }
        } else if (perTruckCargoSpecs && perTruckCargoSpecs.length === 1) {
          // Single truck - use simple recommendation
          const truck = perTruckCargoSpecs[0]
          perTruckRecommendations = [{
            truckIndex: truck.truckIndex,
            truckId: truck.truckId,
            truckName: truck.truckName,
            cargoDescription: `${truck.width.toFixed(1)}'W × ${truck.height.toFixed(1)}'H × ${(truck.grossWeight / 1000).toFixed(0)}k lbs`,
            isOversize: truck.isOversize,
            isOverweight: truck.isOverweight,
            recommendedRouteId: 'route-0',
            recommendedRouteName: routeRecommendation.recommendedRouteName,
            reasoning: truck.isOversize || truck.isOverweight
              ? ['Requires oversize/overweight permits', 'Using primary route for permit consistency']
              : ['Legal load dimensions', 'Can use any route'],
          }]
        }

        setState((prev) => ({
          ...prev,
          permitSummary,
          detailedPermitSummary,
          seasonalWarnings,
          bridgeWarnings,
          routeRecommendation,
          perTruckRecommendations,
        }))

        onRouteCalculated?.(routeToAnalyze)
        onPermitDataCalculated?.(detailedPermitSummary)
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to analyze route',
      }))
    }
  }, [origin, destination, cargoSpecs, perTruckCargoSpecs, shipDate, routeData, onRouteCalculated, onPermitDataCalculated])

  // Serialize cargo specs to detect changes (avoids object reference issues)
  const cargoSpecsKey = cargoSpecs
    ? `${cargoSpecs.length}-${cargoSpecs.width}-${cargoSpecs.height}-${cargoSpecs.grossWeight}`
    : ''
  const perTruckSpecsKey = perTruckCargoSpecs
    ? perTruckCargoSpecs.map(t => `${t.truckIndex}-${t.length}-${t.width}-${t.height}-${t.grossWeight}`).join('|')
    : ''

  useEffect(() => {
    // Auto-analyze when:
    // 1. routeData is provided from parent (pre-calculated)
    // 2. OR we have origin/destination but haven't analyzed yet
    // 3. OR cargo specs have changed (re-analyze permits with new dimensions)
    const routeDataDistance = routeData?.totalDistanceMiles
    const stateDistance = state.routeResult?.totalDistanceMiles
    const hasAddresses = origin && destination

    // If routeData provided and different from what we have, analyze it
    if (routeData && routeDataDistance !== stateDistance) {
      analyzeRoute()
      return
    }

    // If we already have a route result and cargo specs changed, re-analyze permits
    if (hasAddresses && state.routeResult && !state.isLoading) {
      analyzeRoute()
      return
    }

    // If we have addresses but no route result yet, auto-calculate
    if (hasAddresses && !state.routeResult && !state.isLoading && !state.error) {
      analyzeRoute()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeData, state.routeResult?.totalDistanceMiles, origin, destination, state.isLoading, state.error, analyzeRoute, cargoSpecsKey, perTruckSpecsKey])

  const hasWarnings =
    (state.seasonalWarnings?.hasRestrictions ?? false) ||
    (state.bridgeWarnings?.hasIssues ?? false) ||
    (state.permitSummary?.warnings?.length ?? 0) > 0

  const totalEstimatedCost = state.permitSummary
    ? state.permitSummary.totalPermitFees + state.permitSummary.totalEscortCost
    : 0

  // Show error state first (highest priority)
  if (state.error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-destructive">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">Route Analysis Failed</p>
          <p className="text-xs mt-1 text-muted-foreground">{state.error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={analyzeRoute}>
            <Route className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Show loading state
  if (state.isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p className="text-sm font-medium">Analyzing Route...</p>
          <p className="text-xs mt-1">Calculating permits and restrictions</p>
        </CardContent>
      </Card>
    )
  }

  // Show waiting state if no route data yet
  if (!routeData && !state.routeResult) {
    // If we have addresses, it will auto-calculate (show brief waiting message)
    if (origin && destination) {
      return (
        <Card className={className}>
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm font-medium">Preparing Permit Analysis...</p>
            <p className="text-xs mt-1">Will calculate automatically</p>
          </CardContent>
        </Card>
      )
    }
    // No addresses yet
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Route className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Permit Analysis</p>
          <p className="text-xs">Enter pickup and dropoff addresses first</p>
        </CardContent>
      </Card>
    )
  }

  const result = state.routeResult

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Route className="w-5 h-5" />
            Route Intelligence
          </CardTitle>
          {hasWarnings ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Warnings
            </Badge>
          ) : (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Clear
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Route Recommendation */}
        {state.routeRecommendation && (
          <div className="p-4 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-violet-900">AI Route Analysis</span>
                  <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700">
                    {state.routeRecommendation.recommendedRouteName}
                  </Badge>
                </div>

                {/* Reasoning */}
                <div className="space-y-1 mb-3">
                  {state.routeRecommendation.reasoning.slice(0, 4).map((reason, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-violet-800">
                      <ThumbsUp className="w-3 h-3 mt-1 flex-shrink-0 text-violet-500" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                {/* Cost savings if available */}
                {state.routeRecommendation.costSavings && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    <DollarSign className="w-3 h-3" />
                    Saves ${(state.routeRecommendation.costSavings.amount / 100).toLocaleString()} vs {state.routeRecommendation.costSavings.comparedTo}
                  </div>
                )}

                {/* Warnings */}
                {state.routeRecommendation.warnings.length > 0 && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                    <div className="font-medium text-amber-800 mb-1">Considerations:</div>
                    {state.routeRecommendation.warnings.map((warning, i) => (
                      <div key={i} className="flex items-start gap-2 text-amber-700">
                        <AlertTriangle className="w-3 h-3 mt-1 flex-shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Per-Truck Recommendations (when multiple trucks) */}
        {state.perTruckRecommendations && state.perTruckRecommendations.length > 1 && (
          <>
            <SectionHeader
              title={`Per-Truck Route Analysis (${state.perTruckRecommendations.length} trucks)`}
              icon={<Truck className="w-4 h-4" />}
              isExpanded={expandedSections.has('truckRoutes')}
              onToggle={() => toggleSection('truckRoutes')}
              badge={
                state.perTruckRecommendations.some(t => t.alternativeRouteId) ? (
                  <Badge variant="secondary" className="text-xs">Different Routes</Badge>
                ) : undefined
              }
            />
            {expandedSections.has('truckRoutes') && (
              <div className="pl-6 space-y-2">
                {state.perTruckRecommendations.map((truck) => (
                  <TruckRouteCard key={truck.truckId} recommendation={truck} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Route Summary */}
        <SectionHeader
          title="Route Summary"
          icon={<MapPin className="w-4 h-4" />}
          isExpanded={expandedSections.has('summary')}
          onToggle={() => toggleSection('summary')}
        />
        {expandedSections.has('summary') && result && (
          <div className="pl-6 space-y-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold">{result.totalDistanceMiles.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Miles</div>
              </div>
              <div>
                <div className="text-xl font-bold">{result.estimatedDriveTime}</div>
                <div className="text-xs text-muted-foreground">Drive Time</div>
              </div>
              <div>
                <div className="text-xl font-bold">{result.statesTraversed.length}</div>
                <div className="text-xs text-muted-foreground">States</div>
              </div>
            </div>
          </div>
        )}

        {/* States Traversed */}
        <SectionHeader
          title={`States (${result?.statesTraversed.length || 0})`}
          icon={<MapPin className="w-4 h-4" />}
          isExpanded={expandedSections.has('states')}
          onToggle={() => toggleSection('states')}
        />
        {expandedSections.has('states') && result && (
          <div className="pl-6">
            <div className="flex flex-wrap gap-2">
              {result.stateSegments.map((segment) => (
                <StateSegmentBadge key={segment.stateCode} segment={segment} />
              ))}
            </div>
          </div>
        )}

        {/* Permit Costs */}
        {state.permitSummary && (
          <>
            <SectionHeader
              title="Permit Costs"
              icon={<DollarSign className="w-4 h-4" />}
              isExpanded={expandedSections.has('permits')}
              onToggle={() => toggleSection('permits')}
              badge={
                totalEstimatedCost > 0 ? (
                  <Badge variant="outline">${totalEstimatedCost.toLocaleString()}</Badge>
                ) : undefined
              }
            />
            {expandedSections.has('permits') && (
              <div className="pl-6 space-y-3">
                {/* Cost summary */}
                <div className="grid grid-cols-2 gap-2 text-sm pb-2 border-b">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Permit Fees:</span>
                    <span className="font-medium">
                      ${state.permitSummary.totalPermitFees.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escort Costs:</span>
                    <span className="font-medium">
                      ${state.permitSummary.totalEscortCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Escort Cost Breakdown */}
                {state.detailedPermitSummary?.escortBreakdown && (
                  <EscortCostBreakdownCard breakdown={state.detailedPermitSummary.escortBreakdown} />
                )}

                {/* Per-state breakdown */}
                {state.detailedPermitSummary?.statePermits && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Per-State Permit Breakdown (click to expand):
                    </div>
                    {state.detailedPermitSummary.statePermits.map((permit) => (
                      <PermitBreakdownCard
                        key={permit.stateCode}
                        permit={permit}
                        isExpanded={expandedPermits.has(permit.stateCode)}
                        onToggle={() => {
                          setExpandedPermits((prev) => {
                            const next = new Set(prev)
                            if (next.has(permit.stateCode)) {
                              next.delete(permit.stateCode)
                            } else {
                              next.add(permit.stateCode)
                            }
                            return next
                          })
                        }}
                      />
                    ))}
                  </div>
                )}
                {state.permitSummary.overallRestrictions.length > 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <div className="font-medium text-yellow-800">Travel Restrictions:</div>
                    <ul className="list-disc list-inside text-yellow-700">
                      {state.permitSummary.overallRestrictions.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Per-Truck Analysis */}
        {perTruckCargoSpecs && perTruckCargoSpecs.length > 1 && (
          <>
            <SectionHeader
              title={`Per-Truck Analysis (${perTruckCargoSpecs.length} trucks)`}
              icon={<Truck className="w-4 h-4" />}
              isExpanded={expandedSections.has('perTruck')}
              onToggle={() => toggleSection('perTruck')}
              badge={
                perTruckCargoSpecs.some(t => t.isOversize || t.isOverweight) ? (
                  <Badge variant="destructive">
                    {perTruckCargoSpecs.filter(t => t.isOversize || t.isOverweight).length} Need Permits
                  </Badge>
                ) : (
                  <Badge variant="secondary">All Legal</Badge>
                )
              }
            />
            {expandedSections.has('perTruck') && (
              <div className="pl-6 space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Different trucks may have different permit requirements based on their cargo dimensions.
                </p>
                {perTruckCargoSpecs.map((truck) => (
                  <TruckPermitStatusCard key={truck.truckId} truck={truck} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Seasonal Restrictions */}
        {state.seasonalWarnings?.hasRestrictions && (
          <>
            <SectionHeader
              title="Seasonal Restrictions"
              icon={<Snowflake className="w-4 h-4" />}
              isExpanded={expandedSections.has('seasonal')}
              onToggle={() => toggleSection('seasonal')}
              badge={
                <Badge variant="destructive">
                  {state.seasonalWarnings.affectedStates.length} States
                </Badge>
              }
            />
            {expandedSections.has('seasonal') && (
              <div className="pl-6 space-y-2">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Snowflake className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-800">Spring Thaw Restrictions Active</div>
                      <div className="text-sm text-blue-700 mt-1">
                        Weight limits reduced on secondary roads in:
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {state.seasonalWarnings.affectedStates.map((r) => (
                          <Badge key={r.stateCode} variant="secondary" className="text-xs">
                            {r.stateCode} (-{r.weightReductionPercent}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {state.seasonalWarnings.recommendations.length > 0 && (
                  <div className="text-sm">
                    <div className="font-medium text-muted-foreground">Recommendations:</div>
                    <ul className="list-disc list-inside text-muted-foreground mt-1">
                      {state.seasonalWarnings.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Bridge Clearances */}
        {state.bridgeWarnings?.hasIssues && (
          <>
            <SectionHeader
              title="Bridge Clearances"
              icon={<Building2 className="w-4 h-4" />}
              isExpanded={expandedSections.has('bridges')}
              onToggle={() => toggleSection('bridges')}
              badge={
                <Badge variant="destructive">
                  {state.bridgeWarnings.bridges.length} Issues
                </Badge>
              }
            />
            {expandedSections.has('bridges') && (
              <div className="pl-6 space-y-2">
                {state.bridgeWarnings.bridges.slice(0, 5).map(({ bridge, clearanceResult }) => (
                  <BridgeWarningCard
                    key={bridge.id}
                    bridge={bridge}
                    clearanceResult={clearanceResult}
                  />
                ))}
                {state.bridgeWarnings.recommendations.length > 0 && (
                  <div className="text-sm mt-2">
                    <div className="font-medium text-muted-foreground">Alternate Routes:</div>
                    <ul className="list-disc list-inside text-muted-foreground mt-1">
                      {state.bridgeWarnings.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* All Clear Message */}
        {!hasWarnings && state.permitSummary && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Route Clear</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              No major restrictions or clearance issues detected for this route.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface SectionHeaderProps {
  title: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  badge?: React.ReactNode
}

function SectionHeader({ title, icon, isExpanded, onToggle, badge }: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 hover:bg-muted/50 rounded -mx-2 px-2"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{title}</span>
        {badge}
      </div>
      {isExpanded ? (
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  )
}

interface StateSegmentBadgeProps {
  segment: StateSegment
}

function StateSegmentBadge({ segment }: StateSegmentBadgeProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm">
      <span className="font-medium">{segment.stateCode}</span>
      <span className="text-muted-foreground">
        {segment.distanceMiles > 0 ? `${segment.distanceMiles} mi` : ''}
      </span>
    </div>
  )
}

interface BridgeWarningCardProps {
  bridge: LowClearanceBridge
  clearanceResult: {
    clears: boolean
    clearance: number
    deficit: number
    severity: 'ok' | 'caution' | 'warning' | 'danger'
  }
}

function BridgeWarningCard({ bridge, clearanceResult }: BridgeWarningCardProps) {
  const severityColors = {
    ok: 'bg-green-50 border-green-200 text-green-800',
    caution: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
  }

  const severityIcons = {
    ok: <CheckCircle2 className="w-4 h-4" />,
    caution: <Info className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    danger: <AlertCircle className="w-4 h-4" />,
  }

  return (
    <div className={`p-2 border rounded-lg ${severityColors[clearanceResult.severity]}`}>
      <div className="flex items-start gap-2">
        {severityIcons[clearanceResult.severity]}
        <div className="flex-1">
          <div className="font-medium text-sm">{bridge.name}</div>
          <div className="text-xs opacity-80">{bridge.location}</div>
          <div className="text-xs mt-1">
            Clearance: {bridge.clearanceHeight}&apos; |{' '}
            {clearanceResult.clears
              ? `${clearanceResult.clearance}' available`
              : `${clearanceResult.deficit}' too tall`}
          </div>
        </div>
      </div>
    </div>
  )
}

interface PermitBreakdownCardProps {
  permit: DetailedPermitRequirement
  isExpanded: boolean
  onToggle: () => void
}

function PermitBreakdownCard({ permit, isExpanded, onToggle }: PermitBreakdownCardProps) {
  const hasPermitRequired = permit.oversizeRequired || permit.overweightRequired

  // Determine row color based on permit type
  const getRowColors = () => {
    if (permit.isSuperload) {
      return {
        bg: 'bg-red-50',
        hover: 'hover:bg-red-100',
        border: 'border-red-200',
      }
    }
    if (permit.overweightRequired) {
      return {
        bg: 'bg-orange-50',
        hover: 'hover:bg-orange-100',
        border: 'border-orange-200',
      }
    }
    if (permit.oversizeRequired) {
      return {
        bg: 'bg-amber-50',
        hover: 'hover:bg-amber-100',
        border: 'border-amber-200',
      }
    }
    return {
      bg: 'bg-green-50',
      hover: 'hover:bg-green-100',
      border: 'border-green-200',
    }
  }

  const colors = getRowColors()

  // Parse restriction icons
  const hasNightRestriction = permit.travelRestrictions.some(r => r.toLowerCase().includes('night'))
  const hasWeekendRestriction = permit.travelRestrictions.some(r => r.toLowerCase().includes('weekend'))
  const hasSeasonalRestriction = permit.travelRestrictions.some(r =>
    r.toLowerCase().includes('spring') || r.toLowerCase().includes('season')
  )

  return (
    <div className={`border rounded-lg overflow-hidden ${colors.border}`}>
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className={`w-full flex justify-between items-center p-3 ${colors.bg} ${colors.hover} text-left`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{permit.state}</span>
          <Badge variant="outline" className="text-xs font-mono">
            {permit.stateCode}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {permit.distanceInState > 0 ? `${permit.distanceInState.toFixed(0)} mi` : ''}
          </span>

          {/* Status badges */}
          {permit.isSuperload && (
            <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
              Superload
            </Badge>
          )}
          {permit.overweightRequired && !permit.isSuperload && (
            <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">
              Overweight
            </Badge>
          )}
          {permit.oversizeRequired && !permit.overweightRequired && !permit.isSuperload && (
            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
              Oversize
            </Badge>
          )}
          {!hasPermitRequired && (
            <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
              Legal
            </Badge>
          )}

          {/* Restriction icons */}
          <div className="flex items-center gap-1 ml-1">
            {hasNightRestriction && (
              <span title="No night travel">
                <Moon className="h-3.5 w-3.5 text-indigo-500" />
              </span>
            )}
            {hasWeekendRestriction && (
              <span title="No weekend travel">
                <Calendar className="h-3.5 w-3.5 text-purple-500" />
              </span>
            )}
            {hasSeasonalRestriction && (
              <span title="Seasonal restrictions">
                <Snowflake className="h-3.5 w-3.5 text-blue-500" />
              </span>
            )}
          </div>

          {/* Escort icons */}
          {(permit.escortsRequired > 0 || permit.poleCarRequired || permit.policeEscortRequired) && (
            <div className="flex items-center gap-0.5 ml-1">
              {permit.escortsRequired > 0 && (
                <span className="flex" title={`${permit.escortsRequired} escort(s)`}>
                  {Array.from({ length: Math.min(permit.escortsRequired, 2) }).map((_, i) => (
                    <Car key={i} className="h-3.5 w-3.5 text-amber-600" />
                  ))}
                </span>
              )}
              {permit.poleCarRequired && (
                <span title="Pole car required">
                  <Ruler className="h-3.5 w-3.5 text-blue-600" />
                </span>
              )}
              {permit.policeEscortRequired && (
                <span title="Police escort required">
                  <Siren className="h-3.5 w-3.5 text-red-600" />
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasPermitRequired && (
            <span className="font-bold text-slate-700">${permit.estimatedFee}</span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t bg-white">
          {/* Why permit is required */}
          {permit.reasons.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Why Permit Required</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                {permit.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fee breakdown */}
          {permit.calculationDetails.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Fee Breakdown</h4>
              <ul className="text-sm space-y-1">
                {permit.calculationDetails.map((detail, i) => (
                  <li key={i} className="text-slate-600">{detail}</li>
                ))}
                <li className="font-bold border-t pt-1 mt-2">
                  Total: ${permit.estimatedFee}
                </li>
              </ul>
            </div>
          )}

          {/* Escort requirements */}
          {permit.escortsRequired > 0 && (
            <div className="text-sm text-slate-600">
              <span className="font-medium">Escorts Required:</span> {permit.escortsRequired}
              {permit.poleCarRequired && ' + Pole Car'}
              {permit.policeEscortRequired && ' + Police Escort'}
            </div>
          )}

          {/* Travel restrictions */}
          {permit.travelRestrictions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Travel Restrictions</h4>
              <ul className="text-sm text-amber-700 bg-amber-50 p-2 rounded space-y-1">
                {permit.travelRestrictions.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Source citation */}
          <div className="text-xs text-slate-500 border-t pt-3">
            <p><strong>Source:</strong> {permit.source.agency}</p>
            <a
              href={permit.source.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Official Website <ExternalLink className="h-3 w-3" />
            </a>
            <p>Phone: {permit.source.phone}</p>
            <p className="italic mt-1">Data last updated: {permit.source.lastUpdated}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface EscortCostBreakdownCardProps {
  breakdown: EscortCostBreakdown
}

function EscortCostBreakdownCard({ breakdown }: EscortCostBreakdownCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Don't show if no escorts needed
  if (breakdown.escortCount === 0 && !breakdown.needsPoleCar && !breakdown.needsPoliceEscort) {
    return null
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-blue-50/50">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-3 bg-blue-50 hover:bg-blue-100 text-left"
      >
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-900">Escort Cost Breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-600">${breakdown.grandTotal.toLocaleString()}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-blue-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-blue-600" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t bg-white">
          {/* Rate transparency */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Standard Rates</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded">
                <div className="text-muted-foreground">Escort/Pilot Car</div>
                <div className="font-medium">${breakdown.rates.escortPerDay}/day</div>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <div className="text-muted-foreground">Height Pole Car</div>
                <div className="font-medium">${breakdown.rates.poleCarPerDay}/day</div>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <div className="text-muted-foreground">Police Escort</div>
                <div className="font-medium">${breakdown.rates.policePerHour}/hour</div>
              </div>
            </div>
          </div>

          {/* Trip estimate */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Trip Estimate</h4>
            <div className="text-sm text-slate-600">
              <span className="font-medium">{breakdown.tripDays} day{breakdown.tripDays > 1 ? 's' : ''}</span>
              {' '}({breakdown.tripHours} driving hours)
            </div>
          </div>

          {/* Cost calculation */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Cost Calculation</h4>
            <div className="space-y-2 text-sm">
              {breakdown.escortCount > 0 && (
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">
                    {breakdown.escortCount} Escort{breakdown.escortCount > 1 ? 's' : ''} × ${breakdown.rates.escortPerDay}/day × {breakdown.tripDays} days
                  </span>
                  <span className="font-medium text-slate-900">
                    ${breakdown.totalEscortCost.toLocaleString()}
                  </span>
                </div>
              )}
              {breakdown.needsPoleCar && (
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">
                    Height Pole Car × ${breakdown.rates.poleCarPerDay}/day × {breakdown.tripDays} days
                  </span>
                  <span className="font-medium text-slate-900">
                    ${breakdown.totalPoleCarCost.toLocaleString()}
                  </span>
                </div>
              )}
              {breakdown.needsPoliceEscort && (
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">
                    Police Escort × ${breakdown.rates.policePerHour}/hr × {breakdown.tripHours} hours
                  </span>
                  <span className="font-medium text-slate-900">
                    ${breakdown.totalPoliceCost.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center p-2 bg-blue-100 rounded font-medium">
                <span className="text-blue-800">Total Escort Costs</span>
                <span className="text-blue-900">${breakdown.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Per-state breakdown if available */}
          {breakdown.perState.length > 0 && breakdown.perState.some(s => s.stateCost > 0) && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Per-State Escort Costs</h4>
              <div className="space-y-1">
                {breakdown.perState.filter(s => s.stateCost > 0).map(state => (
                  <div key={state.stateCode} className="flex justify-between text-xs p-2 bg-slate-50 rounded">
                    <span className="text-slate-600">
                      {state.stateName} ({state.distanceMiles.toFixed(0)} mi, ~{state.daysInState} day{state.daysInState !== 1 ? 's' : ''})
                      {state.escortCountInState > 0 && (
                        <span className="text-blue-600 ml-1">
                          [{state.escortCountInState} escort{state.escortCountInState > 1 ? 's' : ''}]
                        </span>
                      )}
                      {state.poleCarRequiredInState && (
                        <span className="text-amber-600 ml-1">[pole car]</span>
                      )}
                      {state.policeRequiredInState && (
                        <span className="text-red-600 ml-1">[police]</span>
                      )}
                    </span>
                    <span className="font-medium">${state.stateCost.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TruckPermitStatusCardProps {
  truck: TruckCargoSpecs
}

function TruckPermitStatusCard({ truck }: TruckPermitStatusCardProps) {
  const needsPermit = truck.isOversize || truck.isOverweight
  const statusColor = needsPermit
    ? 'bg-amber-50 border-amber-200'
    : 'bg-green-50 border-green-200'
  const statusIcon = needsPermit
    ? <AlertTriangle className="h-4 w-4 text-amber-500" />
    : <CheckCircle2 className="h-4 w-4 text-green-500" />

  // Standard legal limits for reference
  const LEGAL_LIMITS = {
    width: 8.5,
    height: 13.5,
    length: 53,
    weight: 80000
  }

  return (
    <div className={`p-3 border rounded-lg ${statusColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {statusIcon}
          <div>
            <div className="font-medium text-sm">{truck.truckName}</div>
            <div className="text-xs text-muted-foreground">
              Load {truck.truckIndex + 1}
            </div>
          </div>
        </div>
        <Badge variant={needsPermit ? 'destructive' : 'secondary'} className="text-xs">
          {needsPermit ? 'Permit Required' : 'Legal'}
        </Badge>
      </div>

      {/* Dimensions grid */}
      <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
        <div>
          <div className="text-muted-foreground">Width</div>
          <div className={`font-medium ${truck.width > LEGAL_LIMITS.width ? 'text-amber-600' : ''}`}>
            {truck.width.toFixed(1)}&apos;
            {truck.width > LEGAL_LIMITS.width && <span className="text-amber-500"> !</span>}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Height</div>
          <div className={`font-medium ${truck.height > LEGAL_LIMITS.height ? 'text-amber-600' : ''}`}>
            {truck.height.toFixed(1)}&apos;
            {truck.height > LEGAL_LIMITS.height && <span className="text-amber-500"> !</span>}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Length</div>
          <div className={`font-medium ${truck.length > LEGAL_LIMITS.length ? 'text-amber-600' : ''}`}>
            {truck.length.toFixed(1)}&apos;
            {truck.length > LEGAL_LIMITS.length && <span className="text-amber-500"> !</span>}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Weight</div>
          <div className={`font-medium ${truck.grossWeight > LEGAL_LIMITS.weight ? 'text-amber-600' : ''}`}>
            {(truck.grossWeight / 1000).toFixed(0)}k
            {truck.grossWeight > LEGAL_LIMITS.weight && <span className="text-amber-500"> !</span>}
          </div>
        </div>
      </div>

      {/* Status indicators */}
      {needsPermit && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {truck.isOversize && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
              Oversize
            </span>
          )}
          {truck.isOverweight && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
              Overweight
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface TruckRouteCardProps {
  recommendation: TruckRouteRecommendation
}

function TruckRouteCard({ recommendation }: TruckRouteCardProps) {
  const needsSpecialRoute = recommendation.alternativeRouteId !== undefined
  const statusColor = needsSpecialRoute
    ? 'bg-blue-50 border-blue-200'
    : recommendation.isOversize || recommendation.isOverweight
    ? 'bg-amber-50 border-amber-200'
    : 'bg-green-50 border-green-200'

  return (
    <div className={`p-3 border rounded-lg ${statusColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-slate-500" />
          <div>
            <div className="font-medium text-sm">{recommendation.truckName}</div>
            <div className="text-xs text-muted-foreground">
              {recommendation.cargoDescription}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {recommendation.isOversize && (
            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
              Oversize
            </Badge>
          )}
          {recommendation.isOverweight && (
            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
              Overweight
            </Badge>
          )}
          {!recommendation.isOversize && !recommendation.isOverweight && (
            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
              Legal
            </Badge>
          )}
        </div>
      </div>

      {/* Recommended Route */}
      <div className="mt-2 flex items-center gap-2 text-sm">
        <ArrowRight className="h-4 w-4 text-violet-500" />
        <span className="font-medium text-violet-700">{recommendation.recommendedRouteName}</span>
        {needsSpecialRoute && (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
            Different Route
          </Badge>
        )}
      </div>

      {/* Reasoning */}
      <div className="mt-2 space-y-1">
        {recommendation.reasoning.slice(0, 2).map((reason, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
            <span>{reason}</span>
          </div>
        ))}
      </div>

      {/* Alternative reason if different route */}
      {recommendation.alternativeReason && (
        <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-700">
          <Info className="w-3 h-3 inline-block mr-1" />
          {recommendation.alternativeReason}
        </div>
      )}
    </div>
  )
}

// Re-export types for convenience
export type { RouteIntelligenceProps, RouteIntelligenceState }
