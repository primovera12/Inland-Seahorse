'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { formatDimension, formatWeight } from '@/lib/dimensions'
import { Search, Plus, Package, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

export default function EquipmentPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMakeId, setSelectedMakeId] = useState<string | null>(null)

  // Fetch makes
  const { data: makes, isLoading: makesLoading } = trpc.equipment.getMakes.useQuery()

  // Fetch models when make is selected
  const { data: models, isLoading: modelsLoading } = trpc.equipment.getModels.useQuery(
    { makeId: selectedMakeId! },
    { enabled: !!selectedMakeId }
  )

  // Filter makes by search
  const filteredMakes = makes?.filter((make) =>
    make.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedMake = makes?.find((m) => m.id === selectedMakeId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground">Manage equipment makes, models, and dimensions</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Makes List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Makes
            </CardTitle>
            <CardDescription>{makes?.length || 0} makes total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search makes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {makesLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {filteredMakes?.map((make) => (
                  <button
                    key={make.id}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedMakeId === make.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedMakeId(make.id)}
                  >
                    <span className="font-medium">{make.name}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Models List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedMake ? `${selectedMake.name} Models` : 'Select a Make'}
            </CardTitle>
            <CardDescription>
              {selectedMake
                ? `${models?.length || 0} models`
                : 'Select a make to view its models'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedMakeId ? (
              <div className="text-center py-10 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a make from the list to view models</p>
              </div>
            ) : modelsLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading models...</div>
            ) : models?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>No models found for this make</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Length</TableHead>
                      <TableHead>Width</TableHead>
                      <TableHead>Height</TableHead>
                      <TableHead>Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models?.map((model) => (
                      <ModelRow key={model.id} model={model} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ModelRow({ model }: { model: { id: string; name: string } }) {
  const { data: dimensions } = trpc.equipment.getDimensions.useQuery(
    { modelId: model.id },
    { enabled: !!model.id }
  )

  return (
    <TableRow>
      <TableCell className="font-medium">{model.name}</TableCell>
      <TableCell className="font-mono">
        {dimensions ? formatDimension(dimensions.length_inches) : '-'}
      </TableCell>
      <TableCell className="font-mono">
        {dimensions ? formatDimension(dimensions.width_inches) : '-'}
      </TableCell>
      <TableCell className="font-mono">
        {dimensions ? formatDimension(dimensions.height_inches) : '-'}
      </TableCell>
      <TableCell className="font-mono">
        {dimensions ? formatWeight(dimensions.weight_lbs) : '-'}
      </TableCell>
    </TableRow>
  )
}
