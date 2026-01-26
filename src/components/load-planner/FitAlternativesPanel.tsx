'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Lightbulb, ArrowRight, DollarSign, Truck } from 'lucide-react'
import type { FitOptimization } from '@/lib/load-planner/types'

interface FitAlternativesPanelProps {
  alternatives?: FitOptimization[]
  className?: string
}

function FeasibilityBadge({ feasibility }: { feasibility: 'easy' | 'moderate' | 'difficult' }) {
  const colors = {
    easy: 'bg-green-100 text-green-700 border-green-200',
    moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    difficult: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${colors[feasibility]}`}>
      {feasibility}
    </span>
  )
}

function AlternativeCard({ alt }: { alt: FitOptimization }) {
  return (
    <div className="p-2 bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700">{alt.modification}</p>
          {alt.dimensionChange && (
            <p className="text-xs text-gray-500 mt-1">
              {alt.dimensionChange.dimension}: {alt.dimensionChange.currentValue.toFixed(1)}'
              <ArrowRight className="w-3 h-3 inline mx-1" />
              {alt.dimensionChange.targetValue.toFixed(1)}'
              (-{(alt.dimensionChange.reduction * 12).toFixed(0)}")
            </p>
          )}
          {alt.resultingTruck && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {alt.resultingTruck.name}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <FeasibilityBadge feasibility={alt.feasibility} />
          {alt.costSavings > 0 && (
            <span className="text-xs text-green-600 flex items-center gap-0.5">
              <DollarSign className="w-3 h-3" />
              Save ~${alt.costSavings}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function FitAlternativesPanel({ alternatives, className = '' }: FitAlternativesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!alternatives || alternatives.length === 0) {
    return null
  }

  return (
    <div className={`${className}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors text-sm"
      >
        <Lightbulb className="w-4 h-4" />
        <span>{alternatives.length} alternative{alternatives.length > 1 ? 's' : ''} to avoid permits</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-200">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-gray-700 text-sm">Ways to Avoid Permits</span>
          </div>

          <div className="space-y-2">
            {alternatives.map((alt, index) => (
              <AlternativeCard key={index} alt={alt} />
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-3 italic">
            These suggestions may help reduce permit costs by modifying cargo dimensions or using different equipment.
          </p>
        </div>
      )}
    </div>
  )
}
