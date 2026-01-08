'use client'

import { trpc } from '@/lib/trpc/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileEdit,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
} from 'lucide-react'
import type { QuoteStatus } from '@/types/quotes'
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/types/quotes'

interface StatusHistoryTimelineProps {
  quoteId: string
  quoteType: 'dismantle' | 'inland'
}

const STATUS_ICONS: Record<QuoteStatus, React.ReactNode> = {
  draft: <FileEdit className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  viewed: <Eye className="h-4 w-4" />,
  accepted: <CheckCircle2 className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  expired: <Clock className="h-4 w-4" />,
}

export function StatusHistoryTimeline({
  quoteId,
  quoteType,
}: StatusHistoryTimelineProps) {
  const { data: history, isLoading } = trpc.quotes.getStatusHistory.useQuery({
    quoteId,
    quoteType,
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No status history available</p>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((entry, index) => (
        <div key={entry.id} className="flex items-start gap-3">
          {/* Status Icon */}
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              QUOTE_STATUS_COLORS[entry.new_status as QuoteStatus]
            }`}
          >
            {STATUS_ICONS[entry.new_status as QuoteStatus]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {entry.previous_status && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {QUOTE_STATUS_LABELS[entry.previous_status as QuoteStatus]}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </>
              )}
              <span className="text-sm font-medium">
                {QUOTE_STATUS_LABELS[entry.new_status as QuoteStatus]}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              {entry.changed_by_name
                ? `by ${entry.changed_by_name}`
                : 'Status changed'}{' '}
              • {formatDate(entry.created_at)}
            </p>

            {entry.notes && (
              <p className="mt-1 text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                {entry.notes}
              </p>
            )}
          </div>

          {/* Timeline connector */}
          {index < history.length - 1 && (
            <div className="absolute left-4 mt-8 h-full w-px bg-border" />
          )}
        </div>
      ))}
    </div>
  )
}
