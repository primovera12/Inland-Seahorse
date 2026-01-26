'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Car,
  Siren,
  Ruler,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DetailedRoutePermitSummary } from '@/lib/load-planner/types'

interface PermitSummaryCardProps {
  permitSummary: DetailedRoutePermitSummary | null
  className?: string
}

type ComplexityLevel = 'legal' | 'standard' | 'complex' | 'superload'

function getComplexityLevel(summary: DetailedRoutePermitSummary): ComplexityLevel {
  const hasSuperload = summary.statePermits.some(p => p.isSuperload)
  if (hasSuperload) return 'superload'

  const hasOverweight = summary.statePermits.some(p => p.overweightRequired)
  const hasPolice = summary.statePermits.some(p => p.policeEscortRequired)
  if (hasOverweight || hasPolice) return 'complex'

  const hasOversize = summary.statePermits.some(p => p.oversizeRequired)
  if (hasOversize) return 'standard'

  return 'legal'
}

function getComplexityConfig(level: ComplexityLevel) {
  switch (level) {
    case 'legal':
      return {
        label: 'Legal Load',
        description: 'No permits required',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle2,
      }
    case 'standard':
      return {
        label: 'Standard Permit',
        description: 'Oversize permit required',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: Shield,
      }
    case 'complex':
      return {
        label: 'Complex Haul',
        description: 'Overweight/escorts required',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: AlertTriangle,
      }
    case 'superload':
      return {
        label: 'Superload',
        description: 'Extended processing required',
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: AlertTriangle,
      }
  }
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function PermitSummaryCard({ permitSummary, className }: PermitSummaryCardProps) {
  if (!permitSummary) {
    return null
  }

  const { statePermits, totalPermitCost, totalEscortCost, escortBreakdown, totalCost } = permitSummary

  // Calculate stats
  const statesNeedingPermits = statePermits.filter(p => p.oversizeRequired || p.overweightRequired).length
  const maxEscorts = Math.max(...statePermits.map(p => p.escortsRequired), 0)
  const needsPoleCar = statePermits.some(p => p.poleCarRequired)
  const needsPolice = statePermits.some(p => p.policeEscortRequired)

  const complexity = getComplexityLevel(permitSummary)
  const complexityConfig = getComplexityConfig(complexity)
  const ComplexityIcon = complexityConfig.icon

  // Calculate cost percentages for progress bars
  const policeCost = escortBreakdown?.totalPoliceCost || 0
  const escortOnlyCost = totalEscortCost - policeCost

  const totalForPercentage = Math.max(totalCost, 1) // Avoid division by zero
  const permitPercent = (totalPermitCost / totalForPercentage) * 100
  const escortPercent = (escortOnlyCost / totalForPercentage) * 100
  const policePercent = (policeCost / totalForPercentage) * 100

  // Get superload states for warning
  const superloadStates = statePermits.filter(p => p.isSuperload).map(p => p.stateCode)

  return (
    <Card className={cn('border-2', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Permit Summary
          </CardTitle>
          <Badge className={cn('flex items-center gap-1', complexityConfig.color)}>
            <ComplexityIcon className="w-3 h-3" />
            {complexityConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Cost */}
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalCost)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Cost</div>
          </div>

          {/* States Needing Permits */}
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">
              {statesNeedingPermits}
              <span className="text-sm font-normal text-muted-foreground">/{statePermits.length}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">States Need Permits</div>
          </div>

          {/* Escort Requirements */}
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              {maxEscorts > 0 && (
                <div className="flex items-center gap-0.5" title={`${maxEscorts} escort vehicle(s)`}>
                  {Array.from({ length: Math.min(maxEscorts, 2) }).map((_, i) => (
                    <Car key={i} className="w-5 h-5 text-amber-600" />
                  ))}
                </div>
              )}
              {needsPoleCar && (
                <div title="Height pole car required">
                  <Ruler className="w-5 h-5 text-blue-600" />
                </div>
              )}
              {needsPolice && (
                <div title="Police escort required">
                  <Siren className="w-5 h-5 text-red-600" />
                </div>
              )}
              {maxEscorts === 0 && !needsPoleCar && !needsPolice && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {maxEscorts === 0 && !needsPoleCar && !needsPolice
                ? 'No Escorts'
                : 'Escorts Required'}
            </div>
          </div>
        </div>

        {/* Cost Breakdown Progress Bars */}
        {totalCost > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">Cost Breakdown</div>

            {/* Permits */}
            {totalPermitCost > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Permit Fees</span>
                  <span className="font-medium">{formatCurrency(totalPermitCost)}</span>
                </div>
                <Progress
                  value={permitPercent}
                  className="h-2 bg-slate-200 [&>div]:bg-blue-500"
                />
              </div>
            )}

            {/* Escorts */}
            {escortOnlyCost > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Escort Services</span>
                  <span className="font-medium">{formatCurrency(escortOnlyCost)}</span>
                </div>
                <Progress
                  value={escortPercent}
                  className="h-2 bg-slate-200 [&>div]:bg-amber-500"
                />
              </div>
            )}

            {/* Police */}
            {policeCost > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Police Escort</span>
                  <span className="font-medium">{formatCurrency(policeCost)}</span>
                </div>
                <Progress
                  value={policePercent}
                  className="h-2 bg-slate-200 [&>div]:bg-red-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Superload Warning */}
        {superloadStates.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-red-800">
                Superload in {superloadStates.join(', ')}
              </div>
              <div className="text-xs text-red-700 mt-0.5">
                Extended processing time and route surveys may be required
              </div>
            </div>
          </div>
        )}

        {/* No Permits Needed Message */}
        {complexity === 'legal' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <div className="text-sm text-green-800">
              Load is within legal limits - no permits required
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
