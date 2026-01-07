'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Percent,
  Building2,
  Truck,
  Wrench,
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
}

const ACTIVITY_LABELS: Record<string, string> = {
  call: 'Calls',
  email: 'Emails',
  meeting: 'Meetings',
  note: 'Notes',
  task: 'Tasks',
  quote_sent: 'Quotes Sent',
  quote_accepted: 'Accepted',
  quote_rejected: 'Rejected',
  follow_up: 'Follow-ups',
}

export default function ReportsPage() {
  const { data: quoteStats, isLoading: loadingStats } = trpc.reports.getQuoteStats.useQuery()
  const { data: revenueByMonth } = trpc.reports.getRevenueByMonth.useQuery({ months: 6 })
  const { data: quotesByStatus } = trpc.reports.getQuotesByStatus.useQuery()
  const { data: topCustomers } = trpc.reports.getTopCustomers.useQuery({ limit: 5 })
  const { data: activitySummary } = trpc.reports.getActivitySummary.useQuery({ days: 30 })

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading reports...</div>
      </div>
    )
  }

  const maxRevenue = revenueByMonth
    ? Math.max(...revenueByMonth.map((r) => r.total), 1)
    : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Track your business performance and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quoteStats?.totalQuotes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {quoteStats?.dismantlingCount || 0} dismantling, {quoteStats?.inlandCount || 0} inland
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(quoteStats?.totalValue || 0)}</div>
            <p className="text-xs text-muted-foreground">All quotes this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(quoteStats?.acceptedValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {quoteStats?.acceptedCount || 0} accepted quotes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quoteStats?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {quoteStats?.pendingCount || 0} pending
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue by Month
            </CardTitle>
            <CardDescription>Accepted quotes revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByMonth && revenueByMonth.length > 0 ? (
              <div className="space-y-4">
                {revenueByMonth.map((month) => (
                  <div key={month.month} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{month.month}</span>
                      <span className="font-mono">{formatCurrency(month.total)}</span>
                    </div>
                    <div className="flex gap-1 h-6">
                      {month.dismantling > 0 && (
                        <div
                          className="bg-indigo-500 rounded-l"
                          style={{
                            width: `${(month.dismantling / maxRevenue) * 100}%`,
                          }}
                          title={`Dismantling: ${formatCurrency(month.dismantling)}`}
                        />
                      )}
                      {month.inland > 0 && (
                        <div
                          className="bg-emerald-500 rounded-r"
                          style={{
                            width: `${(month.inland / maxRevenue) * 100}%`,
                          }}
                          title={`Inland: ${formatCurrency(month.inland)}`}
                        />
                      )}
                      {month.total === 0 && (
                        <div className="bg-gray-200 rounded w-full" />
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded" />
                    <span>Dismantling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded" />
                    <span>Inland</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quotes by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quotes by Status
            </CardTitle>
            <CardDescription>Distribution of all quotes</CardDescription>
          </CardHeader>
          <CardContent>
            {quotesByStatus && quotesByStatus.length > 0 ? (
              <div className="space-y-3">
                {quotesByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <Badge className={STATUS_COLORS[item.status] || 'bg-gray-100'}>
                      {STATUS_LABELS[item.status] || item.status}
                    </Badge>
                    <span className="font-mono font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No quotes yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Summary
            </CardTitle>
            <CardDescription>Last 30 days of activity</CardDescription>
          </CardHeader>
          <CardContent>
            {activitySummary && activitySummary.length > 0 ? (
              <div className="space-y-3">
                {activitySummary.map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <span className="text-sm">
                      {ACTIVITY_LABELS[item.type] || item.type}
                    </span>
                    <span className="font-mono font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No activity logged
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top Customers by Revenue
            </CardTitle>
            <CardDescription>Based on accepted quotes</CardDescription>
          </CardHeader>
          <CardContent>
            {topCustomers && topCustomers.length > 0 ? (
              <div className="space-y-4">
                {topCustomers.map((customer, index) => (
                  <div key={customer.company || customer.name} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {customer.company || customer.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {customer.count} {customer.count === 1 ? 'quote' : 'quotes'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold">{formatCurrency(customer.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No customer data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
