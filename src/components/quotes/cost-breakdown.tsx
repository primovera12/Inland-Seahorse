'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { COST_FIELDS, type CostField } from '@/types/equipment'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils'

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
  onToggleCost: (field: CostField) => void
  onOverrideCost: (field: CostField, value: number | null) => void
}

export function CostBreakdown({
  costs,
  enabledCosts,
  costOverrides,
  onToggleCost,
  onOverrideCost,
}: CostBreakdownProps) {
  return (
    <div className="space-y-4">
      {COST_FIELDS.map((field) => {
        const baseCost = costs[field]
        const override = costOverrides[field]
        const displayValue = override ?? baseCost
        const isEnabled = enabledCosts[field]

        return (
          <div
            key={field}
            className={`flex items-center gap-4 p-3 rounded-lg border ${
              isEnabled ? 'bg-background' : 'bg-muted/50 opacity-60'
            }`}
          >
            <Switch
              checked={isEnabled}
              onCheckedChange={() => onToggleCost(field)}
              aria-label={`Toggle ${COST_LABELS[field]}`}
            />
            <div className="flex-1">
              <Label className="text-sm font-medium">{COST_LABELS[field]}</Label>
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
          </div>
        )
      })}
    </div>
  )
}
