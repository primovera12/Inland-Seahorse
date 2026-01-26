'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  FileText,
  ExternalLink,
  Mail,
  Loader2,
  Download,
} from 'lucide-react'
import { PermitPortalLinks } from './PermitPortalLinks'
import type { DetailedRoutePermitSummary } from '@/lib/load-planner/types'
import { toast } from 'sonner'

interface PermitQuickActionsProps {
  permitSummary: DetailedRoutePermitSummary | null
  origin?: string
  destination?: string
  onEmailClick?: () => void
  className?: string
}

export function PermitQuickActions({
  permitSummary,
  origin,
  destination,
  onEmailClick,
  className,
}: PermitQuickActionsProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [portalLinksOpen, setPortalLinksOpen] = useState(false)

  if (!permitSummary) {
    return null
  }

  const handleDownloadChecklist = async () => {
    setIsGeneratingPDF(true)

    try {
      // Generate a text-based checklist for now
      // TODO: Implement full PDF generation via API
      const checklistContent = generateChecklistText(permitSummary, origin, destination)

      // Create a Blob with the content
      const blob = new Blob([checklistContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)

      // Download it
      const link = document.createElement('a')
      link.href = url
      link.download = `permit-checklist-${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Permit checklist downloaded')
    } catch (error) {
      console.error('Failed to generate checklist:', error)
      toast.error('Failed to download checklist')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleEmailClick = () => {
    if (onEmailClick) {
      onEmailClick()
    } else {
      // Fallback: generate mailto link with summary
      const subject = encodeURIComponent('Permit Requirements Summary')
      const body = encodeURIComponent(generateEmailBody(permitSummary, origin, destination))
      window.location.href = `mailto:?subject=${subject}&body=${body}`
    }
  }

  return (
    <>
      <div className={className}>
        <div className="flex flex-wrap gap-2">
          {/* Download Checklist */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadChecklist}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            <span className="hidden sm:inline">Download</span> Checklist
          </Button>

          {/* Permit Portals */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPortalLinksOpen(true)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Permit</span> Portals
          </Button>

          {/* Email/Share */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmailClick}
          >
            <Mail className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Email</span> Summary
          </Button>
        </div>
      </div>

      {/* Portal Links Sheet */}
      <PermitPortalLinks
        open={portalLinksOpen}
        onOpenChange={setPortalLinksOpen}
        statePermits={permitSummary.statePermits}
      />
    </>
  )
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function generateChecklistText(
  summary: DetailedRoutePermitSummary,
  origin?: string,
  destination?: string
): string {
  const lines: string[] = []

  lines.push('═══════════════════════════════════════════════════════════')
  lines.push('                    PERMIT REQUIREMENTS CHECKLIST')
  lines.push('═══════════════════════════════════════════════════════════')
  lines.push('')

  if (origin && destination) {
    lines.push(`Route: ${origin} → ${destination}`)
    lines.push('')
  }

  lines.push(`Generated: ${new Date().toLocaleString()}`)
  lines.push('')

  // Summary
  lines.push('───────────────────────────────────────────────────────────')
  lines.push('COST SUMMARY')
  lines.push('───────────────────────────────────────────────────────────')
  lines.push(`Total Permit Fees:  ${formatCurrency(summary.totalPermitCost)}`)
  lines.push(`Total Escort Costs: ${formatCurrency(summary.totalEscortCost)}`)
  lines.push(`GRAND TOTAL:        ${formatCurrency(summary.totalCost)}`)
  lines.push('')

  // Per-state requirements
  lines.push('───────────────────────────────────────────────────────────')
  lines.push('STATE-BY-STATE REQUIREMENTS')
  lines.push('───────────────────────────────────────────────────────────')

  for (const permit of summary.statePermits) {
    lines.push('')
    lines.push(`▶ ${permit.state} (${permit.stateCode})`)

    if (permit.distanceInState > 0) {
      lines.push(`  Distance: ${permit.distanceInState.toFixed(0)} miles`)
    }

    const status: string[] = []
    if (permit.oversizeRequired) status.push('Oversize')
    if (permit.overweightRequired) status.push('Overweight')
    if (permit.isSuperload) status.push('SUPERLOAD')

    if (status.length > 0) {
      lines.push(`  Status: ${status.join(', ')}`)
      lines.push(`  Permit Fee: ${formatCurrency(permit.estimatedFee)}`)
    } else {
      lines.push('  Status: Legal (no permit required)')
    }

    if (permit.escortsRequired > 0) {
      lines.push(`  Escorts: ${permit.escortsRequired}`)
    }
    if (permit.poleCarRequired) {
      lines.push('  Pole Car: Required')
    }
    if (permit.policeEscortRequired) {
      lines.push('  Police Escort: Required')
    }

    if (permit.travelRestrictions.length > 0) {
      lines.push('  Travel Restrictions:')
      for (const restriction of permit.travelRestrictions) {
        lines.push(`    • ${restriction}`)
      }
    }

    // Contact info
    lines.push(`  Agency: ${permit.source.agency}`)
    lines.push(`  Phone: ${permit.source.phone}`)
    lines.push(`  Website: ${permit.source.website}`)
  }

  lines.push('')
  lines.push('───────────────────────────────────────────────────────────')
  lines.push('DRIVER CHECKLIST')
  lines.push('───────────────────────────────────────────────────────────')
  lines.push('[ ] All permits printed and in cab')
  lines.push('[ ] Oversize/Overweight signs displayed')
  lines.push('[ ] Flags on all corners if required')
  lines.push('[ ] Escort contact info confirmed')
  lines.push('[ ] Route reviewed for restrictions')
  lines.push('[ ] Emergency contacts available')
  lines.push('')

  if (summary.warnings.length > 0) {
    lines.push('───────────────────────────────────────────────────────────')
    lines.push('WARNINGS')
    lines.push('───────────────────────────────────────────────────────────')
    for (const warning of summary.warnings) {
      lines.push(`⚠ ${warning}`)
    }
    lines.push('')
  }

  lines.push('═══════════════════════════════════════════════════════════')

  return lines.join('\n')
}

function generateEmailBody(
  summary: DetailedRoutePermitSummary,
  origin?: string,
  destination?: string
): string {
  const lines: string[] = []

  lines.push('PERMIT REQUIREMENTS SUMMARY')
  lines.push('')

  if (origin && destination) {
    lines.push(`Route: ${origin} → ${destination}`)
    lines.push('')
  }

  lines.push('COST SUMMARY:')
  lines.push(`- Permit Fees: ${formatCurrency(summary.totalPermitCost)}`)
  lines.push(`- Escort Costs: ${formatCurrency(summary.totalEscortCost)}`)
  lines.push(`- TOTAL: ${formatCurrency(summary.totalCost)}`)
  lines.push('')

  lines.push('STATES REQUIRING PERMITS:')
  for (const permit of summary.statePermits) {
    if (permit.oversizeRequired || permit.overweightRequired) {
      lines.push(`- ${permit.state}: ${formatCurrency(permit.estimatedFee)}`)
    }
  }

  if (summary.warnings.length > 0) {
    lines.push('')
    lines.push('WARNINGS:')
    for (const warning of summary.warnings) {
      lines.push(`- ${warning}`)
    }
  }

  return lines.join('\n')
}
