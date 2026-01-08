'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  GitBranch,
  Plus,
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  GitCompare,
  DollarSign,
} from 'lucide-react'
import type { QuoteStatus } from '@/types/quotes'
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/types/quotes'

interface VersionHistoryProps {
  quoteId: string
  onRevisionCreated?: () => void
}

export function VersionHistory({ quoteId, onRevisionCreated }: VersionHistoryProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [compareDialogOpen, setCompareDialogOpen] = useState(false)
  const [changeNotes, setChangeNotes] = useState('')
  const [compareVersion1, setCompareVersion1] = useState<string>('')
  const [compareVersion2, setCompareVersion2] = useState<string>('')

  const utils = trpc.useUtils()

  const { data: versions, isLoading } = trpc.quotes.getVersions.useQuery({
    quoteId,
  })

  const { data: comparison, isLoading: compareLoading } = trpc.quotes.compareVersions.useQuery(
    { quoteId1: compareVersion1, quoteId2: compareVersion2 },
    { enabled: !!compareVersion1 && !!compareVersion2 && compareVersion1 !== compareVersion2 }
  )

  const createRevisionMutation = trpc.quotes.createRevision.useMutation({
    onSuccess: (newQuote) => {
      toast.success(`Revision v${newQuote.version} created`)
      setCreateDialogOpen(false)
      setChangeNotes('')
      utils.quotes.getVersions.invalidate({ quoteId })
      onRevisionCreated?.()
    },
    onError: (error) => {
      toast.error(`Failed to create revision: ${error.message}`)
    },
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const handleCreateRevision = () => {
    createRevisionMutation.mutate({
      sourceQuoteId: quoteId,
      changeNotes: changeNotes || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No version history available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Version History
        </h3>
        <div className="flex gap-2">
          {versions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareDialogOpen(true)}
            >
              <GitCompare className="h-4 w-4 mr-1" />
              Compare
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Revision
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {versions.map((version, index) => (
          <div
            key={version.id}
            className={`relative border rounded-lg p-3 ${
              version.is_latest_version ? 'border-primary bg-primary/5' : ''
            }`}
          >
            {/* Version connector line */}
            {index < versions.length - 1 && (
              <div className="absolute left-6 top-full h-2 w-px bg-border" />
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium ${
                    version.is_latest_version
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {version.version}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/quotes/${version.id}`}
                      className="font-mono text-sm hover:underline"
                    >
                      {version.quote_number}
                    </Link>
                    {version.is_latest_version && (
                      <Badge variant="secondary" className="text-xs">
                        Latest
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={QUOTE_STATUS_COLORS[version.status as QuoteStatus]}
                    >
                      {QUOTE_STATUS_LABELS[version.status as QuoteStatus]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {formatDate(version.created_at)}
                    {version.created_by_name && (
                      <span>• by {version.created_by_name}</span>
                    )}
                  </p>
                  {version.change_notes && (
                    <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded mt-1">
                      {version.change_notes}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-600 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(version.total)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Revision Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Revision</DialogTitle>
            <DialogDescription>
              This will create a new version of the quote as a draft, preserving the
              original version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Change Notes (optional)</Label>
              <Textarea
                placeholder="Describe what changed in this revision..."
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRevision}
              disabled={createRevisionMutation.isPending}
            >
              {createRevisionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Revision'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Versions Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compare Versions</DialogTitle>
            <DialogDescription>
              Select two versions to compare their differences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Version 1 (Older)</Label>
                <Select value={compareVersion1} onValueChange={setCompareVersion1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.version} - {v.quote_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Version 2 (Newer)</Label>
                <Select value={compareVersion2} onValueChange={setCompareVersion2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.version} - {v.quote_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comparison Results */}
            {compareLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {comparison && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono">{comparison.quote1.quote_number}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="font-mono">{comparison.quote2.quote_number}</span>
                </div>

                {comparison.differences.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p>No differences found</p>
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {comparison.differences.map((diff) => (
                      <div key={diff.field} className="p-3">
                        <p className="text-sm font-medium">{diff.label}</p>
                        <div className="grid grid-cols-2 gap-4 mt-1">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Old: </span>
                            <span className="line-through text-red-600">
                              {diff.field.includes('total') || diff.field.includes('subtotal')
                                ? formatCurrency(diff.oldValue as number)
                                : String(diff.oldValue || '-')}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">New: </span>
                            <span className="text-green-600">
                              {diff.field.includes('total') || diff.field.includes('subtotal')
                                ? formatCurrency(diff.newValue as number)
                                : String(diff.newValue || '-')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
