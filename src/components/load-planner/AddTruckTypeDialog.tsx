'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { truckTypeRecordToTruckType } from '@/lib/load-planner/truck-type-converter'
import { TRUCK_CATEGORIES, TRUCK_CATEGORY_LABELS } from '@/types/truck-types'
import type { TruckType } from '@/lib/load-planner/types'

interface AddTruckTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (truck: TruckType) => void
}

export function AddTruckTypeDialog({ open, onOpenChange, onCreated }: AddTruckTypeDialogProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('FLATBED')
  const [deckHeight, setDeckHeight] = useState('5')
  const [deckLength, setDeckLength] = useState('48')
  const [deckWidth, setDeckWidth] = useState('8.5')
  const [maxWeight, setMaxWeight] = useState('48000')

  const utils = trpc.useUtils()

  const createMutation = trpc.truckTypes.create.useMutation({
    onSuccess: (data) => {
      const truck = truckTypeRecordToTruckType(data)
      toast.success(`Truck type "${truck.name}" added`)
      utils.truckTypes.getForLoadPlanner.invalidate()
      onCreated(truck)
      onOpenChange(false)
      resetForm()
    },
    onError: (error) => {
      toast.error(`Failed to add truck type: ${error.message}`)
    },
  })

  const resetForm = () => {
    setName('')
    setCategory('FLATBED')
    setDeckHeight('5')
    setDeckLength('48')
    setDeckWidth('8.5')
    setMaxWeight('48000')
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Truck name is required')
      return
    }

    const heightFt = parseFloat(deckHeight) || 5
    const lengthFt = parseFloat(deckLength) || 48
    const widthFt = parseFloat(deckWidth) || 8.5
    const weightLbs = parseInt(maxWeight) || 48000

    createMutation.mutate({
      name: name.trim(),
      category: category as any,
      deckHeightFt: heightFt,
      deckLengthFt: lengthFt,
      deckWidthFt: widthFt,
      maxCargoWeightLbs: weightLbs,
      maxLegalCargoHeightFt: Math.max(0, 13.5 - heightFt),
      maxLegalCargoWidthFt: 8.5,
    })
  }

  const legalHeight = Math.max(0, 13.5 - (parseFloat(deckHeight) || 0))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Truck Type</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div>
            <Label className="text-xs font-medium">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Flatbed 45'"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-xs font-medium">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRUCK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {TRUCK_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium">Deck Height (ft)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={deckHeight}
                onChange={(e) => setDeckHeight(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Deck Length (ft)</Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={deckLength}
                onChange={(e) => setDeckLength(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Deck Width (ft)</Label>
              <Input
                type="number"
                step="0.5"
                min="1"
                value={deckWidth}
                onChange={(e) => setDeckWidth(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Max Cargo Weight (lbs)</Label>
              <Input
                type="number"
                step="1000"
                min="1"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Max Legal Cargo Height</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                {legalHeight.toFixed(1)} ft
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Auto: 13.5 - deck height</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Adding...' : 'Add Truck Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
