'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Calculator,
  FileText,
  Truck,
  Users,
  DollarSign,
  TrendingUp,
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
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery()
  const { data: recentQuotes } = trpc.dashboard.getRecentQuotes.useQuery()
  const { data: recentInlandQuotes } = trpc.dashboard.getRecentInlandQuotes.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Dismantle Pro. Manage your equipment quotes and transportation.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/quotes/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </Link>
          <Link href="/inland/new">
            <Button variant="outline">
              <Truck className="h-4 w-4 mr-2" />
              Inland Quote
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {statsLoading ? '-' : stats?.totalQuotes || 0}
            </div>
            <p className="text-xs text-muted-foreground">Dismantling quotes created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {statsLoading ? '-' : stats?.pendingQuotes || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting customer response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inland Quotes</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {statsLoading ? '-' : stats?.totalInlandQuotes || 0}
            </div>
            <p className="text-xs text-muted-foreground">Transportation quotes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {statsLoading ? '-' : stats?.activeCompanies || 0}
            </div>
            <p className="text-xs text-muted-foreground">Companies in your CRM</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              {statsLoading ? '-' : formatCurrency(stats?.monthlyTotal || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total quoted value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-green-600">
              {statsLoading ? '-' : formatCurrency(stats?.acceptedTotal || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total accepted quotes</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Dismantling Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Quotes</CardTitle>
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
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{quote.quote_number}</span>
                        <Badge className={STATUS_COLORS[quote.status as QuoteStatus]}>
                          {quote.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quote.customer_name}
                        {quote.customer_company && ` - ${quote.customer_company}`}
                      </p>
                    </div>
                    <div className="text-right">
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
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{quote.quote_number}</span>
                        <Badge className={STATUS_COLORS[quote.status as QuoteStatus]}>
                          {quote.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quote.customer_name}
                        {quote.customer_company && ` - ${quote.customer_company}`}
                      </p>
                    </div>
                    <div className="text-right">
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
