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
  Bell,
  AlertTriangle,
  Clock,
  Building2,
} from 'lucide-react'

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
}

type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent'

const PRIORITY_COLORS: Record<ReminderPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery()
  const { data: recentQuotes } = trpc.dashboard.getRecentQuotes.useQuery()
  const { data: recentInlandQuotes } = trpc.dashboard.getRecentInlandQuotes.useQuery()
  const { data: upcomingReminders } = trpc.reminders.getUpcoming.useQuery()
  const { data: overdueReminders } = trpc.reminders.getOverdue.useQuery()
  trpc.reminders.getStats.useQuery()

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

      {/* Overdue Reminders Alert */}
      {overdueReminders && overdueReminders.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Overdue Follow-ups ({overdueReminders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueReminders.slice(0, 3).map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-2 rounded bg-white/50"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={PRIORITY_COLORS[reminder.priority as ReminderPriority]}>
                      {reminder.priority}
                    </Badge>
                    <span className="text-sm font-medium text-red-900">{reminder.title}</span>
                  </div>
                  <span className="text-xs text-red-700">
                    Due: {formatDate(new Date(reminder.due_date))}
                  </span>
                </div>
              ))}
              {overdueReminders.length > 3 && (
                <Link href="/reminders">
                  <Button variant="ghost" size="sm" className="w-full text-red-700">
                    View all {overdueReminders.length} overdue reminders
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Reminders */}
      {upcomingReminders && upcomingReminders.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Upcoming Reminders
              </CardTitle>
              <CardDescription>Follow-ups due in the next 7 days</CardDescription>
            </div>
            <Link href="/reminders">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingReminders.slice(0, 5).map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={PRIORITY_COLORS[reminder.priority as ReminderPriority]}>
                        {reminder.priority}
                      </Badge>
                      <span className="font-medium">{reminder.title}</span>
                    </div>
                    {reminder.company && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {(reminder.company as { name: string }).name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(new Date(reminder.due_date))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
