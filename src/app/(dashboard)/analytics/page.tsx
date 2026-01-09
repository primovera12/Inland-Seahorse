'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  BarChart3,
  PieChart,
  Users,
  MapPin,
  Target,
  XCircle,
  ArrowRight,
  Building2,
} from 'lucide-react'

type QuoteType = 'all' | 'dismantle' | 'inland'

export default function AnalyticsPage() {
  const [quoteType, setQuoteType] = useState<QuoteType>('all')
  const [activeTab, setActiveTab] = useState('margins')

  const { data: marginOverview, isLoading: loadingOverview } = trpc.analytics.getMarginOverview.useQuery({
    quoteType,
  })

  const { data: marginTrends, isLoading: loadingTrends } = trpc.analytics.getMarginTrends.useQuery({
    quoteType,
    months: 6,
  })

  const { data: customerMargins } = trpc.analytics.getMarginByCustomer.useQuery({
    limit: 10,
    sortBy: 'revenue',
  })

  const { data: locationMargins } = trpc.analytics.getMarginByLocation.useQuery()

  const { data: salesFunnel } = trpc.analytics.getSalesFunnel.useQuery({
    quoteType,
  })

  const { data: winLossAnalysis } = trpc.analytics.getWinLossAnalysis.useQuery({
    quoteType,
  })

  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Margins, sales funnel, and win/loss analysis
          </p>
        </div>
        <Select value={quoteType} onValueChange={(v) => setQuoteType(v as QuoteType)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quotes</SelectItem>
            <SelectItem value="dismantle">Dismantle Only</SelectItem>
            <SelectItem value="inland">Inland Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingOverview ? '...' : formatCurrency(marginOverview?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {marginOverview?.acceptedCount || 0} accepted quotes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Margin</CardDescription>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loadingOverview ? '...' : formatCurrency(marginOverview?.totalMargin || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue minus costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Avg Margin %</CardDescription>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(marginOverview?.avgMarginPercent || 0) >= 20 ? 'text-green-600' : (marginOverview?.avgMarginPercent || 0) >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
              {loadingOverview ? '...' : formatPercent(marginOverview?.avgMarginPercent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all accepted quotes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pipeline Value</CardDescription>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingOverview ? '...' : formatCurrency(marginOverview?.totalQuotedValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {marginOverview?.quoteCount || 0} total quotes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex overflow-x-auto no-scrollbar sm:w-auto">
          <TabsTrigger value="margins" className="flex-1 sm:flex-initial flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Margins</span>
            <span className="sm:hidden">Margins</span>
          </TabsTrigger>
          <TabsTrigger value="funnel" className="flex-1 sm:flex-initial flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Sales Funnel</span>
            <span className="sm:hidden">Funnel</span>
          </TabsTrigger>
          <TabsTrigger value="winloss" className="flex-1 sm:flex-initial flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Win/Loss</span>
            <span className="sm:hidden">W/L</span>
          </TabsTrigger>
        </TabsList>

        {/* Margins Tab */}
        <TabsContent value="margins" className="space-y-6">
          {/* Margin Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Margin Trends (6 Months)
              </CardTitle>
              <CardDescription>Monthly revenue and margin over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTrends ? (
                <div className="text-center py-10 text-muted-foreground">Loading trends...</div>
              ) : !marginTrends || marginTrends.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No data available</div>
              ) : (
                <div className="space-y-4">
                  {marginTrends.map((month) => (
                    <div key={month.month} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-medium">
                        {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-sm text-muted-foreground">Revenue:</div>
                          <div className="text-sm font-medium">{formatCurrency(month.revenue)}</div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min((month.revenue / (marginTrends[0]?.revenue || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-24 text-right">
                        <Badge className={month.marginPercent >= 20 ? 'bg-green-100 text-green-800' : month.marginPercent >= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {formatPercent(month.marginPercent)} margin
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* By Customer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Margin by Customer
                </CardTitle>
                <CardDescription>Top 10 customers by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {!customerMargins || customerMargins.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No customer data</div>
                ) : (
                  <div className="space-y-3">
                    {customerMargins.map((customer, index) => (
                      <div key={customer.id} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.count} quotes
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(customer.revenue)}</p>
                          <p className={`text-xs ${customer.marginPercent >= 20 ? 'text-green-600' : customer.marginPercent >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {formatPercent(customer.marginPercent)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Margin by Location
                </CardTitle>
                <CardDescription>Dismantle quotes by location</CardDescription>
              </CardHeader>
              <CardContent>
                {!locationMargins || locationMargins.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No location data</div>
                ) : (
                  <div className="space-y-3">
                    {locationMargins.map((loc) => (
                      <div key={loc.location} className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{loc.location}</p>
                          <p className="text-xs text-muted-foreground">
                            {loc.count} quotes
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(loc.revenue)}</p>
                          <p className={`text-xs ${loc.marginPercent >= 20 ? 'text-green-600' : loc.marginPercent >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {formatPercent(loc.marginPercent)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Funnel Tab */}
        <TabsContent value="funnel" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Funnel Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Sales Funnel
                </CardTitle>
                <CardDescription>Quote progression through stages</CardDescription>
              </CardHeader>
              <CardContent>
                {!salesFunnel ? (
                  <div className="text-center py-10 text-muted-foreground">Loading...</div>
                ) : (
                  <div className="space-y-4">
                    {salesFunnel.funnel.map((stage, index) => (
                      <div key={stage.stage}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stage.stage}</span>
                            {index > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {formatPercent(stage.conversionRate)} from prev
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{stage.count}</span>
                            <span className="text-muted-foreground text-sm ml-2">
                              ({formatCurrency(stage.value)})
                            </span>
                          </div>
                        </div>
                        <div className="h-8 bg-muted rounded-lg overflow-hidden">
                          <div
                            className={`h-full ${index === salesFunnel.funnel.length - 1 ? 'bg-green-500' : 'bg-primary'} flex items-center justify-center text-xs text-white font-medium`}
                            style={{ width: `${stage.percent}%` }}
                          >
                            {stage.percent >= 10 && `${formatPercent(stage.percent)}`}
                          </div>
                        </div>
                        {index < salesFunnel.funnel.length - 1 && (
                          <div className="flex justify-center my-2">
                            <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conversion Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rates</CardTitle>
                <CardDescription>Key performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-100">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Win Rate</p>
                        <p className="text-sm text-green-600">Quotes accepted</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      {formatPercent(salesFunnel?.winRate || 0)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-red-100">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-red-800">Loss Rate</p>
                        <p className="text-sm text-red-600">Quotes rejected</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-700">
                      {formatPercent(salesFunnel?.lossRate || 0)}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Status Breakdown</h4>
                  <div className="space-y-2">
                    {salesFunnel?.totals && Object.entries(salesFunnel.totals).map(([status, data]) => (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{status}</span>
                        <span className="font-medium">{data.count} ({formatCurrency(data.value)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Win/Loss Tab */}
        <TabsContent value="winloss" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Losses</CardDescription>
                <CardTitle className="text-3xl text-red-600">
                  {winLossAnalysis?.totalLosses || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Worth {formatCurrency(winLossAnalysis?.totalLostValue || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Lost Deal Size</CardDescription>
                <CardTitle className="text-3xl">
                  {formatCurrency(
                    winLossAnalysis?.totalLosses
                      ? (winLossAnalysis.totalLostValue / winLossAnalysis.totalLosses)
                      : 0
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Loss Reasons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Loss Reasons
                </CardTitle>
                <CardDescription>Why quotes are rejected</CardDescription>
              </CardHeader>
              <CardContent>
                {!winLossAnalysis?.byReason || winLossAnalysis.byReason.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No loss data available</div>
                ) : (
                  <div className="space-y-3">
                    {winLossAnalysis.byReason.map((reason) => (
                      <div key={reason.reason}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{reason.reason}</span>
                          <span className="text-sm text-muted-foreground">
                            {reason.count} ({formatPercent(reason.percent)})
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500"
                            style={{ width: `${reason.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Competitors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Competitor Analysis
                </CardTitle>
                <CardDescription>Who we're losing to</CardDescription>
              </CardHeader>
              <CardContent>
                {!winLossAnalysis?.byCompetitor || winLossAnalysis.byCompetitor.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No competitor data tracked yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {winLossAnalysis.byCompetitor.map((competitor) => (
                      <div key={competitor.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="font-medium">{competitor.name}</span>
                        <Badge variant="outline">
                          {competitor.count} losses ({formatPercent(competitor.percent)})
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
