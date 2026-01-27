'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Package, Truck, ImageIcon } from 'lucide-react'
import type { LoadItem } from '@/lib/load-planner/types'
import { ImageUpload } from '@/components/ui/image-upload'

interface CargoEditDialogProps {
  item: LoadItem | null
  isOpen: boolean
  onClose: () => void
  onSave: (item: LoadItem) => void
}

export function CargoEditDialog({
  item,
  isOpen,
  onClose,
  onSave,
}: CargoEditDialogProps) {
  // Form state
  const [description, setDescription] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [stackable, setStackable] = useState(true)

  // Equipment mode
  const [isEquipmentMode, setIsEquipmentMode] = useState(false)
  const [selectedMakeId, setSelectedMakeId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  // Images
  const [imageUrl, setImageUrl] = useState('')
  const [imageUrl2, setImageUrl2] = useState('')

  // Equipment database queries
  const { data: equipmentMakes } = trpc.equipment.getMakes.useQuery()
  const { data: equipmentModels } = trpc.equipment.getModels.useQuery(
    { makeId: selectedMakeId! },
    { enabled: !!selectedMakeId }
  )
  const { data: equipmentDimensions } = trpc.equipment.getDimensions.useQuery(
    { modelId: selectedModelId! },
    { enabled: !!selectedModelId }
  )

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setDescription(item.description || '')
      setLength(item.length.toString())
      setWidth(item.width.toString())
      setHeight(item.height.toString())
      setWeight(item.weight.toString())
      setQuantity((item.quantity || 1).toString())
      setStackable(item.stackable ?? true)
      setImageUrl((item as any).imageUrl || '')
      setImageUrl2((item as any).imageUrl2 || '')
      setIsEquipmentMode((item as any).equipmentMatched || false)
      setSelectedMakeId((item as any).equipmentMakeId || null)
      setSelectedModelId((item as any).equipmentModelId || null)
    } else {
      // Reset form for new item
      setDescription('')
      setLength('')
      setWidth('')
      setHeight('')
      setWeight('')
      setQuantity('1')
      setStackable(true)
      setImageUrl('')
      setImageUrl2('')
      setIsEquipmentMode(false)
      setSelectedMakeId(null)
      setSelectedModelId(null)
    }
  }, [item])

  // Auto-populate dimensions when equipment model is selected
  useEffect(() => {
    if (equipmentDimensions && isEquipmentMode) {
      setLength((equipmentDimensions.length / 12).toFixed(2))
      setWidth((equipmentDimensions.width / 12).toFixed(2))
      setHeight((equipmentDimensions.height / 12).toFixed(2))
      setWeight(equipmentDimensions.weight.toString())
    }
  }, [equipmentDimensions, isEquipmentMode])

  const handleSave = () => {
    const lengthVal = parseFloat(length) || 0
    const widthVal = parseFloat(width) || 0
    const heightVal = parseFloat(height) || 0
    const weightVal = parseFloat(weight) || 0
    const quantityVal = parseInt(quantity) || 1

    if (!description.trim()) {
      toast.error('Please enter a description')
      return
    }

    if (lengthVal <= 0 || widthVal <= 0 || heightVal <= 0) {
      toast.error('Please enter valid dimensions')
      return
    }

    const updatedItem: LoadItem = {
      id: item?.id || `manual-${Date.now()}`,
      description: description.trim(),
      length: lengthVal,
      width: widthVal,
      height: heightVal,
      weight: weightVal,
      quantity: quantityVal,
      stackable,
      // Equipment fields
      ...(isEquipmentMode && selectedMakeId && selectedModelId && {
        equipmentMatched: true,
        equipmentMakeId: selectedMakeId,
        equipmentModelId: selectedModelId,
        dimensionsSource: 'database' as const,
      }),
      // Image fields
      ...(imageUrl && { imageUrl }),
      ...(imageUrl2 && { imageUrl2 }),
    }

    onSave(updatedItem)
    onClose()
    toast.success(item ? 'Cargo item updated' : 'Cargo item added')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {item ? 'Edit Cargo Item' : 'Add Cargo Item'}
          </DialogTitle>
          <DialogDescription>
            Enter the cargo details. Dimensions are in feet, weight in pounds.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Equipment Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Equipment Mode</span>
                  <p className="text-xs text-muted-foreground">
                    Auto-fill from database
                  </p>
                </div>
              </div>
              <Switch
                checked={isEquipmentMode}
                onCheckedChange={(checked) => {
                  setIsEquipmentMode(checked)
                  if (!checked) {
                    setSelectedMakeId(null)
                    setSelectedModelId(null)
                  }
                }}
              />
            </div>

            {/* Equipment Selection */}
            {isEquipmentMode && (
              <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-blue-50/50">
                <div>
                  <Label className="text-xs">Make</Label>
                  <SearchableSelect
                    value={selectedMakeId || ''}
                    onChange={(value) => {
                      setSelectedMakeId(value || null)
                      setSelectedModelId(null)
                    }}
                    options={
                      equipmentMakes?.map((make) => ({
                        value: make.id,
                        label: make.name,
                      })) || []
                    }
                    placeholder="Select make..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Model</Label>
                  <SearchableSelect
                    value={selectedModelId || ''}
                    onChange={(value) => {
                      setSelectedModelId(value || null)
                      if (value && selectedMakeId) {
                        const make = equipmentMakes?.find(m => m.id === selectedMakeId)
                        const model = equipmentModels?.find(m => m.id === value)
                        if (make && model) {
                          setDescription(`${make.name} ${model.name}`)
                        }
                      }
                    }}
                    options={
                      equipmentModels?.map((model) => ({
                        value: model.id,
                        label: model.name,
                      })) || []
                    }
                    placeholder={selectedMakeId ? "Select model..." : "Select make first"}
                    disabled={!selectedMakeId}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <Label className="text-xs font-medium">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., CAT 320 Excavator"
              />
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-medium">Length (ft)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Width (ft)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Height (ft)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Weight (lbs)</Label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Quantity and Stackable */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={stackable}
                  onCheckedChange={setStackable}
                />
                <Label className="text-sm">Stackable</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="images" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Add images for this cargo item. They will appear in the PDF quote.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium mb-1 block">Primary Image</Label>
                <ImageUpload
                  value={imageUrl || null}
                  onChange={(url) => setImageUrl(url || '')}
                  bucket="equipment-images"
                  folder="cargo-images"
                  label="Upload Image"
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">Secondary Image</Label>
                <ImageUpload
                  value={imageUrl2 || null}
                  onChange={(url) => setImageUrl2(url || '')}
                  bucket="equipment-images"
                  folder="cargo-images"
                  label="Upload Image"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {item ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CargoEditDialog
