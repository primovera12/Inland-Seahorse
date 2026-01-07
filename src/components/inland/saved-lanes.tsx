'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Bookmark, Plus, Clock, MapPin, ArrowRight, Star } from 'lucide-react'

interface SavedLanesProps {
  onSelectLane: (pickup: string, dropoff: string) => void
  currentPickup?: string
  currentDropoff?: string
}

export function SavedLanes({
  onSelectLane,
  currentPickup,
  currentDropoff,
}: SavedLanesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [laneName, setLaneName] = useState('')

  // Fetch saved lanes
  const { data: savedLanes, refetch } = trpc.inland.getSavedLanes.useQuery(
    { limit: 10 },
    { staleTime: 60000 }
  )

  // Create saved lane mutation
  const createLane = trpc.inland.createSavedLane.useMutation({
    onSuccess: () => {
      toast.success('Lane saved successfully')
      refetch()
      setShowSaveDialog(false)
      setLaneName('')
    },
    onError: (error) => {
      toast.error(`Failed to save lane: ${error.message}`)
    },
  })

  const handleSaveLane = () => {
    if (!currentPickup || !currentDropoff) {
      toast.error('Please enter both pickup and dropoff addresses first')
      return
    }
    if (!laneName.trim()) {
      toast.error('Please enter a name for the lane')
      return
    }

    createLane.mutate({
      name: laneName,
      pickup_address: currentPickup,
      dropoff_address: currentDropoff,
    })
  }

  const handleSelectLane = (pickup: string, dropoff: string) => {
    onSelectLane(pickup, dropoff)
    setIsOpen(false)
    toast.success('Lane applied')
  }

  const canSave = currentPickup && currentDropoff

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Saved Lanes
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Saved Lanes</h4>
              {canSave && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsOpen(false)
                    setShowSaveDialog(true)
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Save Current
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {!savedLanes || savedLanes.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved lanes yet</p>
                <p className="text-xs mt-1">
                  Save frequently used routes for quick access
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {savedLanes.map((lane) => (
                  <button
                    key={lane.id}
                    className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      handleSelectLane(lane.pickup_address, lane.dropoff_address)
                    }
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">{lane.name}</span>
                      {lane.use_count > 1 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3" />
                          {lane.use_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{lane.pickup_address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="truncate">{lane.dropoff_address}</span>
                    </div>
                    {lane.distance_miles && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {Math.round(lane.distance_miles)} miles
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Save Lane Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Lane</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="laneName">Lane Name</Label>
              <Input
                id="laneName"
                placeholder="e.g., Houston to Dallas, Port NJ to Chicago"
                value={laneName}
                onChange={(e) => setLaneName(e.target.value)}
              />
            </div>
            <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="truncate">{currentPickup}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-4 w-4 text-blue-600" />
                <span className="truncate">{currentDropoff}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLane} disabled={createLane.isPending}>
              {createLane.isPending ? 'Saving...' : 'Save Lane'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
