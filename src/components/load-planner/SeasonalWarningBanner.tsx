'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Snowflake, ExternalLink } from 'lucide-react'
import {
  checkRouteSeasonalRestrictions,
  formatRestrictionPeriod,
  type SeasonalRestriction,
} from '@/lib/load-planner/seasonal-restrictions'

interface SeasonalWarningBannerProps {
  /** States that the route traverses */
  routeStates: string[]
  /** Ship date to check restrictions for (defaults to today) */
  shipDate?: Date
  /** Class name for custom styling */
  className?: string
}

export function SeasonalWarningBanner({
  routeStates,
  shipDate,
  className = '',
}: SeasonalWarningBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!routeStates || routeStates.length === 0) {
    return null
  }

  const result = checkRouteSeasonalRestrictions(routeStates, shipDate)

  if (!result.hasRestrictions) {
    return null
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Snowflake className="w-5 h-5 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-blue-800">
              Spring Load Restrictions Active
            </h3>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Hide details' : 'Show details'}
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          <p className="text-sm text-blue-700 mt-1">
            {result.affectedStates.length} state{result.affectedStates.length > 1 ? 's' : ''} on your route
            {result.affectedStates.length <= 3
              ? ` (${result.affectedStates.map(s => s.stateCode).join(', ')})`
              : ''}{' '}
            {result.affectedStates.length > 1 ? 'have' : 'has'} weight restrictions in effect.
            Max gross weight may be reduced by up to {Math.max(...result.affectedStates.map(s => s.weightReductionPercent))}%.
          </p>

          {isExpanded && (
            <div className="mt-3 space-y-3">
              {result.affectedStates.map((state) => (
                <StateRestrictionCard key={state.stateCode} restriction={state} />
              ))}

              {result.recommendations.length > 0 && (
                <div className="mt-3 p-3 bg-white/60 rounded border border-blue-100">
                  <h4 className="text-xs font-semibold text-blue-800 mb-2">Recommendations:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-400">&bull;</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StateRestrictionCard({ restriction }: { restriction: SeasonalRestriction }) {
  return (
    <div className="p-3 bg-white/60 rounded border border-blue-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-blue-800">
          {restriction.stateName}
        </span>
        <span className="text-xs text-blue-600">
          {restriction.weightReductionPercent}% reduction
        </span>
      </div>

      <p className="text-xs text-blue-600 mb-2">
        Typical period: {formatRestrictionPeriod(restriction)}
      </p>

      {restriction.maxGrossWeight && (
        <p className="text-xs text-blue-700">
          Max gross: {(restriction.maxGrossWeight / 1000).toFixed(0)}k lbs
          {restriction.axleReductions && (
            <> (tandem: {(restriction.axleReductions.tandem! / 1000).toFixed(0)}k)</>
          )}
        </p>
      )}

      <div className="flex items-center gap-3 mt-2">
        {restriction.checkWebsite && (
          <a
            href={restriction.checkWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Check current status
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {restriction.permitAvailable && restriction.permitFee && (
          <span className="text-xs text-green-600">
            Permit available (~${restriction.permitFee})
          </span>
        )}
      </div>
    </div>
  )
}
