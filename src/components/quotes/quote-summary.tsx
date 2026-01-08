'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import type { LocationName } from '@/types/equipment'
import type { EquipmentBlock } from '@/types/quotes'

interface QuoteSummaryProps {
  makeName: string
  modelName: string
  location: LocationName | 'Multiple'
  subtotal: number
  total: number
  equipmentBlocks?: EquipmentBlock[]
}

export function QuoteSummary({
  makeName,
  modelName,
  location,
  subtotal,
  total,
  equipmentBlocks,
}: QuoteSummaryProps) {
  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Quote Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {equipmentBlocks && equipmentBlocks.length > 0 ? (
          /* Multi-Equipment Summary */
          <div className="space-y-2">
            {equipmentBlocks.map((block, index) => (
              <div
                key={block.id}
                className="rounded-lg border p-2 bg-muted/30 text-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {block.make_name && block.model_name
                        ? `${block.make_name} ${block.model_name}`
                        : `Equipment ${index + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {block.location} • Qty: {block.quantity}
                    </p>
                  </div>
                  <span className="font-mono text-sm">
                    {formatCurrency(block.total_with_quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : makeName && modelName ? (
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="font-medium">
              {makeName} {modelName}
            </p>
            <p className="text-sm text-muted-foreground">{location}</p>
          </div>
        ) : makeName ? (
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="font-medium">{makeName}</p>
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
