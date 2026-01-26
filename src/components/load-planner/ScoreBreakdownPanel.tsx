'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle } from 'lucide-react'
import type { ScoreBreakdown } from '@/lib/load-planner/types'

interface ScoreBreakdownPanelProps {
  score: number
  breakdown?: ScoreBreakdown
  className?: string
}

interface ScoreLineProps {
  label: string
  value: number
  type: 'bonus' | 'penalty' | 'neutral'
  description?: string
}

function ScoreLine({ label, value, type, description }: ScoreLineProps) {
  if (value === 0) return null

  const colorClass = type === 'bonus'
    ? 'text-green-600'
    : type === 'penalty'
      ? 'text-red-600'
      : 'text-gray-600'

  const prefix = type === 'bonus' ? '+' : type === 'penalty' ? '-' : ''

  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${colorClass}`}>
        {prefix}{Math.abs(value)}
      </span>
    </div>
  )
}

export function ScoreBreakdownPanel({ score, breakdown, className = '' }: ScoreBreakdownPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!breakdown) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`
          px-2 py-0.5 rounded text-sm font-medium
          ${score >= 80 ? 'bg-green-100 text-green-700' :
            score >= 60 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'}
        `}>
          Score: {score}
        </div>
      </div>
    )
  }

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'bg-green-100 text-green-700 border-green-200'
    if (s >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  return (
    <div className={`${className}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-2 py-1 rounded border transition-colors
          ${getScoreColor(score)}
          hover:opacity-80
        `}
      >
        <span className="text-sm font-medium">Score: {score}/100</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-gray-700">Why This Truck?</span>
          </div>

          <div className="space-y-0.5">
            {/* Base Score */}
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-gray-600">Base Score</span>
              <span className="font-medium text-gray-700">{breakdown.baseScore}</span>
            </div>

            {/* Bonuses */}
            <ScoreLine
              label="Ideal height fit"
              value={breakdown.idealFitBonus}
              type="bonus"
            />
            <ScoreLine
              label="Equipment type match"
              value={breakdown.equipmentMatchBonus}
              type="bonus"
            />
            <ScoreLine
              label="Historical success"
              value={breakdown.historicalBonus}
              type="bonus"
            />

            {/* Penalties */}
            <ScoreLine
              label="Cargo doesn't fit"
              value={breakdown.fitPenalty}
              type="penalty"
            />
            <ScoreLine
              label="Height exceeds limit"
              value={breakdown.heightPenalty}
              type="penalty"
            />
            <ScoreLine
              label="Width exceeds limit"
              value={breakdown.widthPenalty}
              type="penalty"
            />
            <ScoreLine
              label="Weight exceeds limit"
              value={breakdown.weightPenalty}
              type="penalty"
            />
            <ScoreLine
              label="Permits required"
              value={breakdown.permitPenalty}
              type="penalty"
            />
            <ScoreLine
              label="Overkill (truck too large)"
              value={breakdown.overkillPenalty}
              type="penalty"
            />
            <ScoreLine
              label="Seasonal restrictions"
              value={breakdown.seasonalPenalty}
              type="penalty"
            />
            <ScoreLine
              label="Bridge clearance"
              value={breakdown.bridgePenalty}
              type="penalty"
            />

            {/* Final Score */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
              <span className="font-medium text-gray-700">Final Score</span>
              <span className={`font-bold ${
                breakdown.finalScore >= 80 ? 'text-green-600' :
                breakdown.finalScore >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {breakdown.finalScore}/100
              </span>
            </div>

            {/* Escort Warning */}
            {breakdown.escortProximityWarning && (
              <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <span className="text-yellow-700">
                  Cargo dimensions are near escort thresholds. A small reduction could avoid significant escort costs.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
