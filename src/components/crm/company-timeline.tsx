'use client'

import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Truck,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
} from 'lucide-react'

interface CompanyTimelineProps {
  companyId: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-purple-100 text-purple-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
}

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  task: CheckCircle2,
  quote_sent: Send,
  quote_accepted: CheckCircle2,
  quote_rejected: XCircle,
  follow_up: Clock,
}

export function CompanyTimeline({ companyId }: CompanyTimelineProps) {
  const { data: timeline, isLoading } = trpc.activity.getCompanyTimeline.useQuery({
    companyId,
    limit: 50,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No activity yet</p>
        <p className="text-sm">Activities and quotes will appear here</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-6">
        {timeline.map((event) => {
          const Icon = getEventIcon(event)
          const iconBg = getEventIconBg(event)

          return (
            <div key={event.id} className="flex gap-4 relative">
              {/* Icon */}
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event.status && (
                      <Badge className={STATUS_COLORS[event.status] || 'bg-gray-100'}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                    )}
                    {event.amount !== undefined && (
                      <span className="text-sm font-mono font-medium">
                        {formatCurrency(event.amount)}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(event.created_at)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getEventIcon(event: { type: string; metadata?: Record<string, unknown> }) {
  if (event.type === 'dismantle_quote') {
    return FileText
  }
  if (event.type === 'inland_quote') {
    return Truck
  }
  if (event.type === 'activity' && event.metadata?.activity_type) {
    return ACTIVITY_ICONS[event.metadata.activity_type as string] || MessageSquare
  }
  return MessageSquare
}

function getEventIconBg(event: { type: string; status?: string }) {
  if (event.type === 'dismantle_quote' || event.type === 'inland_quote') {
    if (event.status === 'accepted') return 'bg-green-100 text-green-700'
    if (event.status === 'rejected') return 'bg-red-100 text-red-700'
    if (event.status === 'sent' || event.status === 'viewed') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-700'
  }
  return 'bg-primary/10 text-primary'
}
