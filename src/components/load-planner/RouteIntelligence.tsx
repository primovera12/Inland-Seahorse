'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import type { LatLng, StateSegment, RouteResult } from '@/lib/load-planner/route-calculator'
import type { SeasonalRestriction } from '@/lib/load-planner/seasonal-restrictions'
import type { LowClearanceBridge } from '@/lib/load-planner/bridge-heights'
import type { CargoSpecs, RoutePermitSummary } from '@/lib/load-planner/types'

interface RouteIntelligenceProps {
  origin: string
  destination: string
  cargoSpecs: CargoSpecs
  shipDate?: Date
  routeData?: RouteResult
  onRouteCalculated?: (result: RouteResult) => void
  className?: string
}

interface RouteIntelligenceState {
  isLoading: boolean
  error: string | null
  routeResult: RouteResult | null
  permitSummary: RoutePermitSummary | null
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
}

export function RouteIntelligence({
  origin,
  destination,
  cargoSpecs,
  shipDate,
  routeData,
  onRouteCalculated,
  className,
}: RouteIntelligenceProps) {
  const [state, setState] = useState<RouteIntelligenceState>({
    isLoading: false,
    error: null,
    routeResult: null, // Don't initialize from routeData - let useEffect handle it
    permitSummary: null,
    seasonalWarnings: null,
    bridgeWarnings: null,
  })
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'states'])
  )

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
        // Calculate the route via server-side API
        const response = await fetch('/api/load-planner/calculate-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin, destination }),
        })
        const result = await response.json()
        if (!result.success || !result.route) {
          throw new Error(result.error || 'Failed to calculate route')
        }
        routeToAnalyze = result.route
      }

      if (routeToAnalyze) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          routeResult: routeToAnalyze,
        }))

        // Calculate permits for the route
        const { calculateRoutePermits } = await import('@/lib/load-planner/permit-calculator')
        const permitSummary = calculateRoutePermits(
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

        setState((prev) => ({
          ...prev,
          permitSummary,
          seasonalWarnings,
          bridgeWarnings,
        }))

        onRouteCalculated?.(routeToAnalyze)
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to analyze route',
      }))
    }
  }, [origin, destination, cargoSpecs, shipDate, routeData, onRouteCalculated])

  useEffect(() => {
    // Auto-analyze when routeData is provided from parent (e.g., after Calculate Route)
    // Compare by distance to avoid reference equality issues
    const routeDataDistance = routeData?.totalDistanceMiles
    const stateDistance = state.routeResult?.totalDistanceMiles

    if (routeData && routeDataDistance !== stateDistance) {
      analyzeRoute()
    }
  }, [routeData, state.routeResult?.totalDistanceMiles, analyzeRoute])

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

  // Show calculate button if no route data yet
  if (!routeData && !state.routeResult) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Route className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Permit Analysis</p>
          <p className="text-xs mb-4">Calculate permits and route restrictions</p>
          <Button
            onClick={analyzeRoute}
            disabled={!origin || !destination}
            size="sm"
          >
            <Route className="h-4 w-4 mr-2" />
            Calculate Permits
          </Button>
          {(!origin || !destination) && (
            <p className="text-xs mt-2 text-muted-foreground">Enter addresses first</p>
          )}
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
              <div className="pl-6 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
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
                {state.permitSummary.estimatedEscortsPerDay > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Escorts required: {state.permitSummary.estimatedEscortsPerDay} per day
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

// Re-export types for convenience
export type { RouteIntelligenceProps, RouteIntelligenceState }
