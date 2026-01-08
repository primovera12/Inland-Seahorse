'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { COST_FIELDS, type CostField } from '@/types/equipment'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'

// Human-readable labels for cost fields
const COST_LABELS: Record<CostField, string> = {
  dismantling_loading_cost: 'Dismantling & Loading',
  loading_cost: 'Loading Only',
  blocking_bracing_cost: 'Blocking & Bracing',
  rigging_cost: 'Rigging',
  storage_cost: 'Storage',
  transport_cost: 'Transport',
  equipment_cost: 'Equipment',
  labor_cost: 'Labor',
  permit_cost: 'Permits',
  escort_cost: 'Escort',
  miscellaneous_cost: 'Miscellaneous',
}

interface CostBreakdownProps {
  costs: Record<CostField, number>
  enabledCosts: Record<CostField, boolean>
  costOverrides: Record<CostField, number | null>
  descriptionOverrides?: Record<CostField, string | null>
  onToggleCost: (field: CostField) => void
  onOverrideCost: (field: CostField, value: number | null) => void
  onOverrideDescription?: (field: CostField, value: string | null) => void
}

export function CostBreakdown({
  costs,
  enabledCosts,
  costOverrides,
  descriptionOverrides,
  onToggleCost,
  onOverrideCost,
  onOverrideDescription,
}: CostBreakdownProps) {
  const [expandedFields, setExpandedFields] = useState<Set<CostField>>(new Set())

  const toggleExpand = (field: CostField) => {
    setExpandedFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) {
        next.delete(field)
      } else {
        next.add(field)
      }
      return next
    })
  }

  return (
    <div className="space-y-3">
      {COST_FIELDS.map((field) => {
        const baseCost = costs[field]
        const override = costOverrides[field]
        const displayValue = override ?? baseCost
        const isEnabled = enabledCosts[field]
        const isExpanded = expandedFields.has(field)
        const description = descriptionOverrides?.[field] || null
        const hasDescription = description && description.trim().length > 0

        return (
          <div
            key={field}
            className={`rounded-lg border ${
              isEnabled ? 'bg-background' : 'bg-muted/50 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4 p-3">
              <Switch
                checked={isEnabled}
                onCheckedChange={() => onToggleCost(field)}
                aria-label={`Toggle ${COST_LABELS[field]}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{COST_LABELS[field]}</Label>
                  {hasDescription && (
                    <FileText className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                {override !== null && override !== baseCost && (
                  <p className="text-xs text-muted-foreground">
                    Base: {formatCurrency(baseCost)}
                  </p>
                )}
              </div>
              <div className="w-32">
                <Input
                  type="text"
                  value={formatCurrency(displayValue).replace('$', '')}
                  onChange={(e) => {
                    const cents = parseCurrencyToCents(e.target.value)
                    onOverrideCost(field, cents === baseCost ? null : cents)
                  }}
                  disabled={!isEnabled}
                  className="text-right font-mono"
                />
              </div>
              {onOverrideDescription && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleExpand(field)}
                  disabled={!isEnabled}
                  className="h-8 w-8"
                  title={isExpanded ? 'Hide description' : 'Add description'}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {isExpanded && onOverrideDescription && (
              <div className="px-3 pb-3 pt-0">
                <div className="ml-10">
                  <Input
                    type="text"
                    placeholder={`Custom description for ${COST_LABELS[field]}...`}
                    value={description || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      onOverrideDescription(field, value || null)
                    }}
                    disabled={!isEnabled}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to use default description in PDF
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
