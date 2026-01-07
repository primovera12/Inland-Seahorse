'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import type { LocationName } from '@/types/equipment'

interface QuoteSummaryProps {
  makeName: string
  modelName: string
  location: LocationName
  subtotal: number
  marginPercentage: number
  marginAmount: number
  total: number
  onMarginChange: (value: number) => void
}

export function QuoteSummary({
  makeName,
  modelName,
  location,
  subtotal,
  marginPercentage,
  marginAmount,
  total,
  onMarginChange,
}: QuoteSummaryProps) {
  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Quote Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {makeName && modelName ? (
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="font-medium">
              {makeName} {modelName}
            </p>
            <p className="text-sm text-muted-foreground">{location}</p>
          </div>
        ) : (
          <div className="rounded-lg border p-3 bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">No equipment selected</p>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="margin" className="text-sm">
              Margin (%)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="margin"
                type="number"
                min="0"
                max="100"
                value={marginPercentage}
                onChange={(e) => onMarginChange(Number(e.target.value))}
                className="w-20 text-right font-mono"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <span className="flex-1 text-right font-mono text-sm">
                {formatCurrency(marginAmount)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="font-medium">Total</span>
          <span className="text-2xl font-bold font-mono text-primary">
            {formatCurrency(total)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
