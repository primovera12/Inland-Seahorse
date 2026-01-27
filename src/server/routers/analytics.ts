import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'

export const analyticsRouter = router({
  // Get executive KPIs for load planner
  getExecutiveKPIs: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo } = input

      // Get current period stats from load_history
      const { data: currentPeriod, error: currentError } = await ctx.supabase
        .from('load_history')
        .select('customer_rate_cents, carrier_rate_cents, margin_cents, margin_percentage, status')
        .gte('pickup_date', dateFrom)
        .lte('pickup_date', dateTo)

      checkSupabaseError(currentError, 'Load history')

      const loads = currentPeriod || []
      const completedLoads = loads.filter(l => l.status === 'completed')

      // Calculate KPIs
      const totalRevenue = loads.reduce((sum, l) => sum + (l.customer_rate_cents || 0), 0)
      const totalMargin = loads.reduce((sum, l) => sum + (l.margin_cents || 0), 0)
      const avgMargin = loads.length > 0
        ? loads.reduce((sum, l) => sum + (l.margin_percentage || 0), 0) / loads.length
        : 0

      // Get quote stats for win rate
      const { data: lpQuotes } = await ctx.supabase
        .from('load_planner_quotes')
        .select('status')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)

      const quotes = lpQuotes || []
      const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length
      const totalQuotes = quotes.length
      const winRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0

      // Calculate previous period for comparison
      const periodDays = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24))
      const prevFrom = new Date(new Date(dateFrom).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const prevTo = new Date(new Date(dateFrom).getTime() - 1).toISOString().split('T')[0]

      const { data: prevPeriod } = await ctx.supabase
        .from('load_history')
        .select('customer_rate_cents, margin_cents, margin_percentage')
        .gte('pickup_date', prevFrom)
        .lte('pickup_date', prevTo)

      const prevLoads = prevPeriod || []
      const prevRevenue = prevLoads.reduce((sum, l) => sum + (l.customer_rate_cents || 0), 0)
      const prevMargin = prevLoads.reduce((sum, l) => sum + (l.margin_cents || 0), 0)
      const prevAvgMargin = prevLoads.length > 0
        ? prevLoads.reduce((sum, l) => sum + (l.margin_percentage || 0), 0) / prevLoads.length
        : 0

      // Calculate trends
      const revenueTrend = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
      const marginTrend = prevMargin > 0 ? ((totalMargin - prevMargin) / prevMargin) * 100 : 0
      const avgMarginTrend = prevAvgMargin > 0 ? avgMargin - prevAvgMargin : 0
      const loadCountTrend = prevLoads.length > 0 ? ((loads.length - prevLoads.length) / prevLoads.length) * 100 : 0

      return {
        revenue: {
          value: totalRevenue,
          trend: revenueTrend,
        },
        margin: {
          value: totalMargin,
          trend: marginTrend,
        },
        avgMarginPercent: {
          value: avgMargin,
          trend: avgMarginTrend,
        },
        loadCount: {
          value: loads.length,
          completed: completedLoads.length,
          trend: loadCountTrend,
        },
        winRate: {
          value: winRate,
          accepted: acceptedQuotes,
          total: totalQuotes,
        },
      }
    }),

  // Get trend data for charts
  getTrends: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
        granularity: z.enum(['day', 'week', 'month']).default('day'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, granularity } = input

      // Try to use pre-computed daily stats first
      if (granularity === 'day') {
        const { data: dailyStats, error } = await ctx.supabase
          .from('load_daily_stats')
          .select('*')
          .gte('stat_date', dateFrom)
          .lte('stat_date', dateTo)
          .order('stat_date', { ascending: true })

        if (!error && dailyStats && dailyStats.length > 0) {
          return dailyStats.map(day => ({
            date: day.stat_date,
            revenue: day.total_revenue_cents,
            margin: day.total_margin_cents,
            loadCount: day.load_count,
            avgMarginPercent: day.avg_margin_percentage,
            completedCount: day.completed_count,
          }))
        }
      }

      // Fallback to direct query for all granularities
      const { data: loads, error } = await ctx.supabase
        .from('load_history')
        .select('pickup_date, customer_rate_cents, margin_cents, margin_percentage, status')
        .gte('pickup_date', dateFrom)
        .lte('pickup_date', dateTo)
        .order('pickup_date', { ascending: true })

      checkSupabaseError(error, 'Load history')

      if (!loads || loads.length === 0) return []

      // Group by granularity
      const grouped: Record<string, {
        revenue: number
        margin: number
        loadCount: number
        marginPercentages: number[]
        completedCount: number
      }> = {}

      loads.forEach(load => {
        if (!load.pickup_date) return

        const date = new Date(load.pickup_date)
        let key: string

        if (granularity === 'day') {
          key = load.pickup_date
        } else if (granularity === 'week') {
          // Get Monday of the week
          const day = date.getDay()
          const diff = date.getDate() - day + (day === 0 ? -6 : 1)
          const monday = new Date(date.setDate(diff))
          key = monday.toISOString().split('T')[0]
        } else {
          // Month
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
        }

        if (!grouped[key]) {
          grouped[key] = { revenue: 0, margin: 0, loadCount: 0, marginPercentages: [], completedCount: 0 }
        }

        grouped[key].revenue += load.customer_rate_cents || 0
        grouped[key].margin += load.margin_cents || 0
        grouped[key].loadCount += 1
        if (load.margin_percentage) grouped[key].marginPercentages.push(load.margin_percentage)
        if (load.status === 'completed') grouped[key].completedCount += 1
      })

      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          margin: data.margin,
          loadCount: data.loadCount,
          avgMarginPercent: data.marginPercentages.length > 0
            ? data.marginPercentages.reduce((a, b) => a + b, 0) / data.marginPercentages.length
            : 0,
          completedCount: data.completedCount,
        }))
    }),

  // Get period comparison (current vs previous)
  getPeriodComparison: protectedProcedure
    .input(
      z.object({
        period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { period } = input
      const now = new Date()

      // Calculate date ranges
      let currentFrom: Date
      let currentTo: Date = now
      let periodLabel: string

      switch (period) {
        case 'week':
          currentFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          periodLabel = 'This Week'
          break
        case 'month':
          currentFrom = new Date(now.getFullYear(), now.getMonth(), 1)
          periodLabel = 'This Month'
          break
        case 'quarter':
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3
          currentFrom = new Date(now.getFullYear(), quarterMonth, 1)
          periodLabel = 'This Quarter'
          break
        case 'year':
          currentFrom = new Date(now.getFullYear(), 0, 1)
          periodLabel = 'This Year'
          break
      }

      const periodDays = Math.ceil((currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24))
      const prevFrom = new Date(currentFrom.getTime() - periodDays * 24 * 60 * 60 * 1000)
      const prevTo = new Date(currentFrom.getTime() - 1)

      // Get current period data
      const { data: currentLoads } = await ctx.supabase
        .from('load_history')
        .select('customer_rate_cents, margin_cents, margin_percentage')
        .gte('pickup_date', currentFrom.toISOString().split('T')[0])
        .lte('pickup_date', currentTo.toISOString().split('T')[0])

      // Get previous period data
      const { data: prevLoads } = await ctx.supabase
        .from('load_history')
        .select('customer_rate_cents, margin_cents, margin_percentage')
        .gte('pickup_date', prevFrom.toISOString().split('T')[0])
        .lte('pickup_date', prevTo.toISOString().split('T')[0])

      const current = currentLoads || []
      const prev = prevLoads || []

      const currentRevenue = current.reduce((sum, l) => sum + (l.customer_rate_cents || 0), 0)
      const prevRevenue = prev.reduce((sum, l) => sum + (l.customer_rate_cents || 0), 0)
      const currentMargin = current.reduce((sum, l) => sum + (l.margin_cents || 0), 0)
      const prevMargin = prev.reduce((sum, l) => sum + (l.margin_cents || 0), 0)

      return {
        period: periodLabel,
        current: {
          revenue: currentRevenue,
          margin: currentMargin,
          loadCount: current.length,
        },
        previous: {
          revenue: prevRevenue,
          margin: prevMargin,
          loadCount: prev.length,
        },
        change: {
          revenue: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
          margin: prevMargin > 0 ? ((currentMargin - prevMargin) / prevMargin) * 100 : 0,
          loadCount: prev.length > 0 ? ((current.length - prev.length) / prev.length) * 100 : 0,
        },
      }
    }),

  // Get sales funnel data
  getSalesFunnel: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        quoteType: z.enum(['all', 'dismantle', 'inland']).default('all'),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const startDate = input?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const endDate = input?.endDate || new Date().toISOString()

      // Get dismantle quote counts by status
      const { data: dismantleCounts } = await ctx.supabase
        .from('quote_history')
        .select('status, total')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      // Get inland quote counts by status
      const { data: inlandCounts } = await ctx.supabase
        .from('inland_quotes')
        .select('status, total')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      const allQuotes = [
        ...(input?.quoteType !== 'inland' ? (dismantleCounts || []) : []),
        ...(input?.quoteType !== 'dismantle' ? (inlandCounts || []) : []),
      ]

      const statusCounts: Record<string, { count: number; value: number }> = {
        draft: { count: 0, value: 0 },
        sent: { count: 0, value: 0 },
        viewed: { count: 0, value: 0 },
        accepted: { count: 0, value: 0 },
        rejected: { count: 0, value: 0 },
        expired: { count: 0, value: 0 },
      }

      allQuotes.forEach(quote => {
        if (statusCounts[quote.status]) {
          statusCounts[quote.status].count += 1
          statusCounts[quote.status].value += quote.total || 0
        }
      })

      const total = allQuotes.length
      const funnel = [
        {
          stage: 'Created',
          count: total,
          value: allQuotes.reduce((sum, q) => sum + (q.total || 0), 0),
          percent: 100,
        },
        {
          stage: 'Sent',
          count: statusCounts.sent.count + statusCounts.viewed.count + statusCounts.accepted.count + statusCounts.rejected.count,
          value: statusCounts.sent.value + statusCounts.viewed.value + statusCounts.accepted.value + statusCounts.rejected.value,
          percent: total > 0 ? ((statusCounts.sent.count + statusCounts.viewed.count + statusCounts.accepted.count + statusCounts.rejected.count) / total) * 100 : 0,
        },
        {
          stage: 'Viewed',
          count: statusCounts.viewed.count + statusCounts.accepted.count + statusCounts.rejected.count,
          value: statusCounts.viewed.value + statusCounts.accepted.value + statusCounts.rejected.value,
          percent: total > 0 ? ((statusCounts.viewed.count + statusCounts.accepted.count + statusCounts.rejected.count) / total) * 100 : 0,
        },
        {
          stage: 'Accepted',
          count: statusCounts.accepted.count,
          value: statusCounts.accepted.value,
          percent: total > 0 ? (statusCounts.accepted.count / total) * 100 : 0,
        },
      ]

      // Calculate conversion rates between stages
      const conversions = funnel.map((stage, index) => {
        if (index === 0) return { ...stage, conversionRate: 100 }
        const prevStage = funnel[index - 1]
        return {
          ...stage,
          conversionRate: prevStage.count > 0 ? (stage.count / prevStage.count) * 100 : 0,
        }
      })

      return {
        funnel: conversions,
        totals: statusCounts,
        winRate: total > 0 ? (statusCounts.accepted.count / total) * 100 : 0,
        lossRate: total > 0 ? (statusCounts.rejected.count / total) * 100 : 0,
      }
    }),

  // Get win/loss reasons
  getWinLossReasons: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('win_loss_reasons')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    checkSupabaseError(error, 'Reasons')
    return data || []
  }),

  // Get win/loss analysis
  getWinLossAnalysis: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        quoteType: z.enum(['all', 'dismantle', 'inland']).default('all'),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const startDate = input?.startDate || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
      const endDate = input?.endDate || new Date().toISOString()

      // Get loss reasons from dismantle quotes
      const { data: dismantleLosses } = await ctx.supabase
        .from('quote_history')
        .select(`
          id, total, rejection_reason, win_loss_notes, competitor_name,
          win_loss_reason:win_loss_reasons(id, reason, reason_type)
        `)
        .eq('status', 'rejected')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      // Get loss reasons from inland quotes
      const { data: inlandLosses } = await ctx.supabase
        .from('inland_quotes')
        .select(`
          id, total, rejection_reason, win_loss_notes, competitor_name,
          win_loss_reason:win_loss_reasons(id, reason, reason_type)
        `)
        .eq('status', 'rejected')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      const allLosses = [
        ...(input?.quoteType !== 'inland' ? (dismantleLosses || []) : []),
        ...(input?.quoteType !== 'dismantle' ? (inlandLosses || []) : []),
      ]

      // Group by reason
      const reasonCounts: Record<string, { count: number; value: number; reason: string }> = {}

      allLosses.forEach(quote => {
        const winLossReasonRaw = quote.win_loss_reason as { reason: string } | { reason: string }[] | null
        const winLossReason = Array.isArray(winLossReasonRaw) ? winLossReasonRaw[0] : winLossReasonRaw
        const reason = winLossReason?.reason || quote.rejection_reason || 'Unknown'
        if (!reasonCounts[reason]) {
          reasonCounts[reason] = { count: 0, value: 0, reason }
        }
        reasonCounts[reason].count += 1
        reasonCounts[reason].value += quote.total || 0
      })

      // Get competitor breakdown
      const competitorCounts: Record<string, number> = {}
      allLosses.forEach(quote => {
        if (quote.competitor_name) {
          competitorCounts[quote.competitor_name] = (competitorCounts[quote.competitor_name] || 0) + 1
        }
      })

      const totalLosses = allLosses.length
      const totalLostValue = allLosses.reduce((sum, q) => sum + (q.total || 0), 0)

      return {
        totalLosses,
        totalLostValue,
        byReason: Object.values(reasonCounts)
          .map(r => ({
            ...r,
            percent: totalLosses > 0 ? (r.count / totalLosses) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count),
        byCompetitor: Object.entries(competitorCounts)
          .map(([name, count]) => ({
            name,
            count,
            percent: totalLosses > 0 ? (count / totalLosses) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count),
      }
    }),
})
