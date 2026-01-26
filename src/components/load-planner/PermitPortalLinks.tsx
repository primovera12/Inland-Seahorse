'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ExternalLink,
  Phone,
  Copy,
  CheckCircle2,
  Clock,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DetailedPermitRequirement } from '@/lib/load-planner/types'
import { getStateByCode } from '@/lib/load-planner/state-permits'

interface PermitPortalLinksProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statePermits: DetailedPermitRequirement[]
}

export function PermitPortalLinks({
  open,
  onOpenChange,
  statePermits,
}: PermitPortalLinksProps) {
  const [copiedAll, setCopiedAll] = useState(false)

  // Get full state data for each permit
  const statesWithContacts = statePermits.map(permit => {
    const stateData = getStateByCode(permit.stateCode)
    return {
      permit,
      stateData,
    }
  }).filter(s => s.stateData !== undefined)

  const handleCopyAll = async () => {
    const contactText = statesWithContacts
      .map(({ permit, stateData }) => {
        const lines = [
          `${stateData!.stateName} (${permit.stateCode})`,
          `Agency: ${stateData!.contact.agency}`,
          `Phone: ${stateData!.contact.phone}`,
          `Website: ${stateData!.contact.website}`,
        ]
        if (stateData!.contact.permitPortal) {
          lines.push(`Permit Portal: ${stateData!.contact.permitPortal}`)
        }
        return lines.join('\n')
      })
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(contactText)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            State Permit Portals
          </SheetTitle>
          <SheetDescription>
            Direct links to apply for permits in each state on your route
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Copy All Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleCopyAll}
          >
            {copiedAll ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy All Contacts
              </>
            )}
          </Button>

          {/* State List */}
          <div className="space-y-3">
            {statesWithContacts.map(({ permit, stateData }) => {
              const needsPermit = permit.oversizeRequired || permit.overweightRequired
              const processingTime = stateData!.oversizePermits.singleTrip.processingTime

              return (
                <div
                  key={permit.stateCode}
                  className={cn(
                    'p-3 border rounded-lg',
                    needsPermit ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200'
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{stateData!.stateName}</span>
                      <Badge variant="outline" className="text-xs">
                        {permit.stateCode}
                      </Badge>
                    </div>
                    {needsPermit ? (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                        Permit Required
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        Legal
                      </Badge>
                    )}
                  </div>

                  {/* Agency */}
                  <div className="text-sm text-muted-foreground mb-2">
                    {stateData!.contact.agency}
                  </div>

                  {/* Processing Time */}
                  {processingTime && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Clock className="w-3 h-3" />
                      <span>Processing: {processingTime}</span>
                    </div>
                  )}

                  {/* Links and Phone */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {stateData!.contact.permitPortal && (
                      <a
                        href={stateData!.contact.permitPortal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Permit Portal
                      </a>
                    )}
                    <a
                      href={stateData!.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Website
                    </a>
                    <a
                      href={`tel:${stateData!.contact.phone}`}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      {stateData!.contact.phone}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>

          {statesWithContacts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No state permit data available</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
