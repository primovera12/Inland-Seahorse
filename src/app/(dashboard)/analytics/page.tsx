'use client'

import { useState } from 'react'
import { subDays } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Target,
  XCircle,
  ArrowRight,
  Building2,
  Truck,
  Activity,
} from 'lucide-react'
import { DateRangeFilter, type DateRange, KPICard, KPIGrid, TrendChart } from '@/components/analytics'

type QuoteType = 'all' | 'dismantle' | 'inland'
type Granularity = 'day' | 'week' | 'month'

export default function AnalyticsPage() {
  const [quoteType, setQuoteType] = useState<QuoteType>('all')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [granularity, setGranularity] = useState<Granularity>('day')

  const dateFrom = dateRange.from.toISOString().split('T')[0]
  const dateTo = dateRange.to.toISOString().split('T')[0]

  // Executive KPIs query
  const { data: kpis, isLoading: kpisLoading } = trpc.analytics.getExecutiveKPIs.useQuery({
    dateFrom,
    dateTo,
  })

  // Trend data query
  const { data: trends, isLoading: trendsLoading } = trpc.analytics.getTrends.useQuery({
    dateFrom,
    dateTo,
    granularity,
  })

  const { data: salesFunnel } = trpc.analytics.getSalesFunnel.useQuery({
    quoteType,
  })

  const { data: winLossAnalysis } = trpc.analytics.getWinLossAnalysis.useQuery({
    quoteType,
  })

  const formatPercent = (value: number) => `${value.toFixed(1)}%`
  const formatCurrencyShort = (cents: number) => {
    const dollars = cents / 100
    if (dollars >= 1000000) return `$${(dollars / 1000000).toFixed(1)}M`
    if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K`
    return formatCurrency(cents)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Load planner performance, margins, and trends
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
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
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex overflow-x-auto no-scrollbar sm:w-auto">
          <TabsTrigger value="dashboard" className="flex-1 sm:flex-initial flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">KPIs</span>
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

        {/* Executive Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPI Cards */}
          <KPIGrid columns={4}>
            <KPICard
              title="Total Revenue"
              value={formatCurrencyShort(kpis?.revenue.value || 0)}
              icon={<DollarSign className="h-4 w-4" />}
              trend={kpis?.revenue.trend ? { value: kpis.revenue.trend, label: 'vs prev period' } : undefined}
              loading={kpisLoading}
            />
            <KPICard
              title="Total Margin"
              value={formatCurrencyShort(kpis?.margin.value || 0)}
              icon={<TrendingUp className="h-4 w-4" />}
              trend={kpis?.margin.trend ? { value: kpis.margin.trend, label: 'vs prev period' } : undefined}
              loading={kpisLoading}
            />
            <KPICard
              title="Avg Margin %"
              value={formatPercent(kpis?.avgMarginPercent.value || 0)}
              icon={<Percent className="h-4 w-4" />}
              trend={kpis?.avgMarginPercent.trend ? { value: kpis.avgMarginPercent.trend } : undefined}
              loading={kpisLoading}
            />
            <KPICard
              title="Loads"
              value={kpis?.loadCount.value || 0}
              description={`${kpis?.loadCount.completed || 0} completed`}
              icon={<Truck className="h-4 w-4" />}
              trend={kpis?.loadCount.trend ? { value: kpis.loadCount.trend, label: 'vs prev period' } : undefined}
              loading={kpisLoading}
            />
          </KPIGrid>

          {/* Win Rate Card */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quote Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">
                  {formatPercent(kpis?.winRate.value || 0)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {kpis?.winRate.accepted || 0} accepted of {kpis?.winRate.total || 0} quotes
                </p>
              </CardContent>
            </Card>

            {/* Granularity selector for charts */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Revenue over time</CardDescription>
                </div>
                <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={trends || []}
                  dataKey="revenue"
                  type="bar"
                  color="#3b82f6"
                  formatValue={(v) => formatCurrencyShort(v)}
                  height={200}
                  loading={trendsLoading}
                  emptyMessage="No load data for selected period"
                />
              </CardContent>
            </Card>
          </div>

          {/* Margin Trend Chart */}
          <TrendChart
            title="Margin Trend"
            description="Profit margin over time"
            data={trends || []}
            dataKey="margin"
            secondaryDataKey="revenue"
            type="line"
            color="#10b981"
            secondaryColor="#3b82f6"
            formatValue={(v) => formatCurrencyShort(v)}
            height={250}
            showLegend
            loading={trendsLoading}
            emptyMessage="No load data for selected period"
          />

          {/* Load Count Trend */}
          <TrendChart
            title="Load Volume"
            description="Number of loads over time"
            data={trends || []}
            dataKey="loadCount"
            type="bar"
            color="#8b5cf6"
            formatValue={(v) => String(v)}
            height={200}
            loading={trendsLoading}
            emptyMessage="No load data for selected period"
          />
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
                  <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">Win Rate</p>
                        <p className="text-sm text-green-600 dark:text-green-400">Quotes accepted</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatPercent(salesFunnel?.winRate || 0)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-200">Loss Rate</p>
                        <p className="text-sm text-red-600 dark:text-red-400">Quotes rejected</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
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
