'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, DollarSign, Percent } from 'lucide-react'
import type { MiscellaneousFee } from '@/types/quotes'
import { formatWholeDollars } from '@/lib/utils'

interface MiscFeesListProps {
  fees: MiscellaneousFee[]
  onChange: (fees: MiscellaneousFee[]) => void
  subtotal?: number // For percentage calculation preview
  compact?: boolean // Compact mode for equipment blocks
}

export function MiscFeesList({
  fees,
  onChange,
  subtotal = 0,
  compact = false,
}: MiscFeesListProps) {
  const addFee = () => {
    const newFee: MiscellaneousFee = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      amount: 0,
      is_percentage: false,
    }
    onChange([...fees, newFee])
  }

  const updateFee = (id: string, updates: Partial<MiscellaneousFee>) => {
    onChange(
      fees.map((fee) => (fee.id === id ? { ...fee, ...updates } : fee))
    )
  }

  const removeFee = (id: string) => {
    onChange(fees.filter((fee) => fee.id !== id))
  }

  const calculateFeeAmount = (fee: MiscellaneousFee): number => {
    if (fee.is_percentage) {
      return Math.round(subtotal * (fee.amount / 10000)) // amount is in basis points (100 = 1%)
    }
    return fee.amount
  }

  const totalMiscFees = fees.reduce(
    (sum, fee) => sum + calculateFeeAmount(fee),
    0
  )

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Miscellaneous Fees</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFee}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Fee
          </Button>
        </div>

        {fees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No additional fees
          </p>
        ) : (
          <div className="space-y-2">
            {fees.map((fee) => (
              <div
                key={fee.id}
                className="flex items-center gap-2 p-2 rounded border bg-muted/30"
              >
                <Input
                  placeholder="Fee name"
                  value={fee.title}
                  onChange={(e) => updateFee(fee.id, { title: e.target.value })}
                  className="flex-1 h-8 text-sm"
                />
                <div className="flex items-center gap-1">
                  {fee.is_percentage ? (
                    <Percent className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                  )}
                  <Input
                    type="number"
                    placeholder="0"
                    value={fee.is_percentage ? fee.amount / 100 : fee.amount / 100}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      updateFee(fee.id, {
                        amount: fee.is_percentage ? value * 100 : value * 100,
                      })
                    }}
                    className="w-20 h-8 text-sm text-right"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeFee(fee.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {fees.length > 0 && (
          <div className="flex justify-between text-sm font-medium pt-2 border-t">
            <span>Misc Fees Total</span>
            <span className="font-mono">${formatWholeDollars(totalMiscFees)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Miscellaneous Fees</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addFee}>
            <Plus className="h-4 w-4 mr-2" />
            Add Fee
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fees.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
            <p>No miscellaneous fees added</p>
            <p className="text-sm">Click &quot;Add Fee&quot; to add custom charges</p>
          </div>
        ) : (
          <div className="space-y-4">
            {fees.map((fee, index) => (
              <div
                key={fee.id}
                className="p-4 rounded-lg border bg-background space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`fee-title-${fee.id}`} className="text-xs">
                          Fee Name *
                        </Label>
                        <Input
                          id={`fee-title-${fee.id}`}
                          placeholder="e.g., Rush Fee, Special Handling"
                          value={fee.title}
                          onChange={(e) =>
                            updateFee(fee.id, { title: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`fee-amount-${fee.id}`} className="text-xs">
                          Amount
                        </Label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            {fee.is_percentage ? (
                              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            ) : (
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            )}
                            <Input
                              id={`fee-amount-${fee.id}`}
                              type="number"
                              step={fee.is_percentage ? '0.1' : '0.01'}
                              min="0"
                              placeholder="0.00"
                              value={
                                fee.is_percentage
                                  ? (fee.amount / 100).toFixed(1)
                                  : (fee.amount / 100).toFixed(2)
                              }
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                updateFee(fee.id, { amount: Math.round(value * 100) })
                              }}
                              className="pl-9 text-right font-mono"
                            />
                          </div>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Switch
                              id={`fee-percentage-${fee.id}`}
                              checked={fee.is_percentage}
                              onCheckedChange={(checked) =>
                                updateFee(fee.id, { is_percentage: checked })
                              }
                            />
                            <Label
                              htmlFor={`fee-percentage-${fee.id}`}
                              className="text-xs cursor-pointer"
                            >
                              {fee.is_percentage ? '%' : '$'}
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`fee-desc-${fee.id}`} className="text-xs">
                        Description (optional)
                      </Label>
                      <Input
                        id={`fee-desc-${fee.id}`}
                        placeholder="Additional details about this fee..."
                        value={fee.description || ''}
                        onChange={(e) =>
                          updateFee(fee.id, { description: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive mt-6"
                    onClick={() => removeFee(fee.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Fee preview */}
                {fee.is_percentage && subtotal > 0 && (
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                    {fee.amount / 100}% of ${formatWholeDollars(subtotal)} ={' '}
                    <span className="font-mono font-medium text-foreground">
                      ${formatWholeDollars(calculateFeeAmount(fee))}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        {fees.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="font-medium">Total Miscellaneous Fees</span>
            <span className="text-lg font-bold font-mono">
              ${formatWholeDollars(totalMiscFees)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Utility to calculate total misc fees
export function calculateMiscFeesTotal(
  fees: MiscellaneousFee[],
  subtotal: number
): number {
  return fees.reduce((sum, fee) => {
    if (fee.is_percentage) {
      return sum + Math.round(subtotal * (fee.amount / 10000))
    }
    return sum + fee.amount
  }, 0)
}
