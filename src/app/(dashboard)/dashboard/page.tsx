'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Calculator,
  Truck,
  Plus,
  ArrowRight,
} from 'lucide-react'

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
}

export default function DashboardPage() {
  const { data: recentQuotes } = trpc.dashboard.getRecentQuotes.useQuery()
  const { data: recentInlandQuotes } = trpc.dashboard.getRecentInlandQuotes.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/quotes/new" className="flex-1 sm:flex-initial">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Dismantle Quote
            </Button>
          </Link>
          <Link href="/inland/new" className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full sm:w-auto">
              <Truck className="h-4 w-4 mr-2" />
              Inland Quote
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Dismantling Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Dismantle Quotes</CardTitle>
              <CardDescription>Your most recent dismantling quotes</CardDescription>
            </div>
            <Link href="/quotes/history">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!recentQuotes || recentQuotes.length === 0 ? (
              <div className="text-center py-6">
                <Calculator className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No quotes yet</p>
                <Link href="/quotes/new">
                  <Button variant="outline" size="sm" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quote
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{quote.quote_number}</span>
                        <Badge className={STATUS_COLORS[quote.status as QuoteStatus]}>
                          {quote.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {quote.customer_name}
                        {quote.customer_company && ` - ${quote.customer_company}`}
                      </p>
                    </div>
                    <div className="flex justify-between sm:block text-left sm:text-right flex-shrink-0">
                      <p className="font-mono font-medium">{formatCurrency(quote.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(quote.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Inland Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Inland Quotes</CardTitle>
              <CardDescription>Your most recent transportation quotes</CardDescription>
            </div>
            <Link href="/inland/history">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!recentInlandQuotes || recentInlandQuotes.length === 0 ? (
              <div className="text-center py-6">
                <Truck className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No inland quotes yet</p>
                <Link href="/inland/new">
                  <Button variant="outline" size="sm" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Inland Quote
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInlandQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{quote.quote_number}</span>
                        <Badge className={STATUS_COLORS[quote.status as QuoteStatus]}>
                          {quote.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {quote.customer_name}
                        {quote.customer_company && ` - ${quote.customer_company}`}
                      </p>
                    </div>
                    <div className="flex justify-between sm:block text-left sm:text-right flex-shrink-0">
                      <p className="font-mono font-medium">{formatCurrency(quote.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(quote.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
