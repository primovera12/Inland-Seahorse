'use client'

import { useState } from 'react'
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns'
import { Calendar, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface DateRange {
  from: Date
  to: Date
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  presets?: boolean
}

const PRESETS = [
  { label: 'Last 7 days', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 days', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'Last 90 days', getValue: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: 'This month', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'Last month', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'This year', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: 'Last 12 months', getValue: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
]

export function DateRangeFilter({ value, onChange, presets = true }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [tempFrom, setTempFrom] = useState(format(value.from, 'yyyy-MM-dd'))
  const [tempTo, setTempTo] = useState(format(value.to, 'yyyy-MM-dd'))

  const handlePreset = (preset: typeof PRESETS[0]) => {
    const range = preset.getValue()
    onChange(range)
    setTempFrom(format(range.from, 'yyyy-MM-dd'))
    setTempTo(format(range.to, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const handleApply = () => {
    onChange({
      from: new Date(tempFrom),
      to: new Date(tempTo),
    })
    setOpen(false)
  }

  const displayText = `${format(value.from, 'MMM d, yyyy')} - ${format(value.to, 'MMM d, yyyy')}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal min-w-[240px]">
          <Calendar className="mr-2 h-4 w-4" />
          <span className="truncate">{displayText}</span>
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {presets && (
            <div className="border-r p-2 space-y-1">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => handlePreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
          <div className="p-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={tempFrom}
                onChange={(e) => setTempFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={tempTo}
                onChange={(e) => setTempTo(e.target.value)}
              />
            </div>
            <Button onClick={handleApply} className="w-full">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
