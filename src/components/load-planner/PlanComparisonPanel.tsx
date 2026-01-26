'use client'

import { useState } from 'react'
import { Check, Truck, FileCheck, DollarSign, AlertTriangle, Sparkles, Shield, Zap } from 'lucide-react'
import type { SmartPlanOption, PlanStrategy } from '@/lib/load-planner'

interface PlanComparisonPanelProps {
  plans: SmartPlanOption[]
  selectedPlan: SmartPlanOption | null
  onSelectPlan: (plan: SmartPlanOption) => void
  className?: string
}

function getStrategyIcon(strategy: PlanStrategy) {
  switch (strategy) {
    case 'recommended':
      return <Sparkles className="w-4 h-4" />
    case 'legal-only':
      return <Shield className="w-4 h-4" />
    case 'cost-optimized':
      return <DollarSign className="w-4 h-4" />
    case 'fewest-trucks':
      return <Truck className="w-4 h-4" />
    case 'fastest':
      return <Zap className="w-4 h-4" />
    default:
      return <FileCheck className="w-4 h-4" />
  }
}

function getStrategyColor(strategy: PlanStrategy, isSelected: boolean) {
  const base = isSelected ? 'ring-2' : 'hover:border-gray-300'
  switch (strategy) {
    case 'recommended':
      return `${base} ${isSelected ? 'ring-blue-500 border-blue-500 bg-blue-50' : 'border-gray-200'}`
    case 'legal-only':
      return `${base} ${isSelected ? 'ring-green-500 border-green-500 bg-green-50' : 'border-gray-200'}`
    case 'cost-optimized':
      return `${base} ${isSelected ? 'ring-amber-500 border-amber-500 bg-amber-50' : 'border-gray-200'}`
    case 'fewest-trucks':
      return `${base} ${isSelected ? 'ring-purple-500 border-purple-500 bg-purple-50' : 'border-gray-200'}`
    default:
      return `${base} ${isSelected ? 'ring-gray-500 border-gray-500 bg-gray-50' : 'border-gray-200'}`
  }
}

function PlanCard({
  plan,
  isSelected,
  onSelect,
}: {
  plan: SmartPlanOption
  isSelected: boolean
  onSelect: () => void
}) {
  const colorClass = getStrategyColor(plan.strategy, isSelected)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full p-4 rounded-lg border-2 transition-all text-left ${colorClass}`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${
          plan.strategy === 'recommended' ? 'bg-blue-100 text-blue-600' :
          plan.strategy === 'legal-only' ? 'bg-green-100 text-green-600' :
          plan.strategy === 'cost-optimized' ? 'bg-amber-100 text-amber-600' :
          plan.strategy === 'fewest-trucks' ? 'bg-purple-100 text-purple-600' :
          'bg-gray-100 text-gray-600'
        }`}>
          {getStrategyIcon(plan.strategy)}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{plan.name}</h3>
          <p className="text-xs text-gray-500">{plan.description}</p>
        </div>
      </div>

      {/* Badges */}
      {plan.badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {plan.badges.map((badge, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-0.5 rounded-full ${
                badge === 'Best Overall' ? 'bg-blue-100 text-blue-700' :
                badge === 'No Permits' || badge === '100% Legal' ? 'bg-green-100 text-green-700' :
                badge === 'Lowest Cost' ? 'bg-amber-100 text-amber-700' :
                badge.includes('Truck') ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              }`}
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-white rounded border border-gray-100">
          <div className="text-lg font-bold text-gray-900">{plan.totalTrucks}</div>
          <div className="text-xs text-gray-500">Truck{plan.totalTrucks !== 1 ? 's' : ''}</div>
        </div>
        <div className="p-2 bg-white rounded border border-gray-100">
          <div className="text-lg font-bold text-gray-900">{plan.permitCount}</div>
          <div className="text-xs text-gray-500">Permit{plan.permitCount !== 1 ? 's' : ''}</div>
        </div>
        <div className="p-2 bg-white rounded border border-gray-100">
          <div className="text-lg font-bold text-gray-900">${(plan.totalCost / 1000).toFixed(1)}k</div>
          <div className="text-xs text-gray-500">Est. Cost</div>
        </div>
      </div>

      {/* Warnings */}
      {plan.nonLegalLoads > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          <span>{plan.nonLegalLoads} load{plan.nonLegalLoads > 1 ? 's' : ''} require{plan.nonLegalLoads === 1 ? 's' : ''} permits</span>
        </div>
      )}
      {plan.escortRequired && (
        <div className="mt-1 flex items-center gap-1 text-xs text-orange-600">
          <AlertTriangle className="w-3 h-3" />
          <span>Escort vehicle required</span>
        </div>
      )}
    </button>
  )
}

export function PlanComparisonPanel({
  plans,
  selectedPlan,
  onSelectPlan,
  className = '',
}: PlanComparisonPanelProps) {
  if (!plans || plans.length === 0) {
    return null
  }

  // If only one plan, auto-select it and show simpler UI
  if (plans.length === 1) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-blue-800">
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">Smart Plan Generated</span>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          {plans[0].totalTrucks} truck{plans[0].totalTrucks !== 1 ? 's' : ''} recommended for your cargo
          {plans[0].permitCount > 0 ? ` (${plans[0].permitCount} permit${plans[0].permitCount !== 1 ? 's' : ''} needed)` : ' - no permits required'}
        </p>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Choose Your Plan</h3>
        <span className="text-sm text-gray-500">({plans.length} options available)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.strategy}
            plan={plan}
            isSelected={selectedPlan?.strategy === plan.strategy}
            onSelect={() => onSelectPlan(plan)}
          />
        ))}
      </div>

      {selectedPlan && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
          <strong>Selected:</strong> {selectedPlan.name} - {selectedPlan.description}
        </div>
      )}
    </div>
  )
}
