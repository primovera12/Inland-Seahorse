'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  formatDimension,
  formatDimensionDual,
  formatDimensionInUnit,
  formatDimensionAllUnits,
  type DimensionUnit,
} from '@/lib/dimensions'

interface DimensionDisplayProps {
  inches: number
  className?: string
  showDual?: boolean
  showToggle?: boolean
  defaultUnit?: DimensionUnit
  size?: 'sm' | 'md' | 'lg'
}

const UNIT_LABELS: Record<DimensionUnit, string> = {
  inches: 'in',
  'ft-in': 'ft-in',
  cm: 'cm',
  mm: 'mm',
  meters: 'm',
}

const UNIT_CYCLE: DimensionUnit[] = ['ft-in', 'inches', 'cm', 'mm', 'meters']

export function DimensionDisplay({
  inches,
  className = '',
  showDual = true,
  showToggle = false,
  defaultUnit = 'ft-in',
  size = 'md',
}: DimensionDisplayProps) {
  const [unit, setUnit] = useState<DimensionUnit>(defaultUnit)

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  if (!inches || inches <= 0) {
    return <span className={`${sizeClasses[size]} ${className}`}>-</span>
  }

  const allUnits = formatDimensionAllUnits(inches)

  const cycleUnit = () => {
    const currentIndex = UNIT_CYCLE.indexOf(unit)
    const nextIndex = (currentIndex + 1) % UNIT_CYCLE.length
    setUnit(UNIT_CYCLE[nextIndex])
  }

  // Simple dual display mode (inches with feet in parentheses)
  if (showDual && !showToggle) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`font-mono ${sizeClasses[size]} ${className} cursor-help`}>
              {formatDimension(inches)}
            </span>
          </TooltipTrigger>
          <TooltipContent className="text-sm">
            <div className="space-y-1">
              <div>{allUnits.inches}</div>
              <div>{allUnits.feetInches}</div>
              <div>{allUnits.cm}</div>
              <div>{allUnits.meters}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Toggle mode - click to cycle through units
  if (showToggle) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`font-mono h-auto px-1 py-0 hover:bg-muted ${sizeClasses[size]} ${className}`}
        onClick={cycleUnit}
        title="Click to change unit"
      >
        {formatDimensionInUnit(inches, unit)}
      </Button>
    )
  }

  // Default: just feet display
  return (
    <span className={`font-mono ${sizeClasses[size]} ${className}`}>
      {formatDimension(inches)}
    </span>
  )
}

interface DimensionInputDisplayProps {
  inches: number
  className?: string
}

/**
 * Inline dimension display with all formats
 * Shows primary format with secondary in parentheses
 */
export function DimensionInputDisplay({ inches, className = '' }: DimensionInputDisplayProps) {
  if (!inches || inches <= 0) {
    return null
  }

  const allUnits = formatDimensionAllUnits(inches)

  return (
    <span className={`text-xs text-muted-foreground ${className}`}>
      {allUnits.inches} = {allUnits.feetInches} = {allUnits.cm}
    </span>
  )
}

interface DimensionGridProps {
  lengthInches: number
  widthInches: number
  heightInches: number
  weightLbs?: number
  className?: string
  showToggle?: boolean
}

/**
 * Grid display for all dimensions with optional unit toggle
 */
export function DimensionGrid({
  lengthInches,
  widthInches,
  heightInches,
  weightLbs,
  className = '',
  showToggle = false,
}: DimensionGridProps) {
  return (
    <div className={`grid gap-4 ${weightLbs ? 'md:grid-cols-4' : 'md:grid-cols-3'} ${className}`}>
      <div>
        <p className="text-sm text-muted-foreground">Length</p>
        <DimensionDisplay inches={lengthInches} showToggle={showToggle} size="lg" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Width</p>
        <DimensionDisplay inches={widthInches} showToggle={showToggle} size="lg" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Height</p>
        <DimensionDisplay inches={heightInches} showToggle={showToggle} size="lg" />
      </div>
      {weightLbs !== undefined && weightLbs > 0 && (
        <div>
          <p className="text-sm text-muted-foreground">Weight</p>
          <p className="font-mono text-lg">{weightLbs.toLocaleString()} lbs</p>
        </div>
      )}
    </div>
  )
}
