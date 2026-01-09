import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'

export const analyticsRouter = router({
  // Get margin overview stats
  getMarginOverview: protectedProcedure
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

      // Get dismantle quotes stats
      const { data: dismantleStats } = await ctx.supabase
        .from('quote_history')
        .select('total, cost_amount, status')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('status', ['accepted', 'sent', 'viewed'])

      // Get inland quotes stats
      const { data: inlandStats } = await ctx.supabase
        .from('inland_quotes')
        .select('total, cost_amount, status')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('status', ['accepted', 'sent', 'viewed'])

      const allQuotes = [
        ...(input?.quoteType !== 'inland' ? (dismantleStats || []) : []),
        ...(input?.quoteType !== 'dismantle' ? (inlandStats || []) : []),
      ]

      const acceptedQuotes = allQuotes.filter(q => q.status === 'accepted')

      const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + (q.total || 0), 0)
      const totalCost = acceptedQuotes.reduce((sum, q) => sum + (q.cost_amount || 0), 0)
      const totalMargin = totalRevenue - totalCost
      const avgMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0

      const totalQuotedValue = allQuotes.reduce((sum, q) => sum + (q.total || 0), 0)
      const potentialMargin = totalQuotedValue - allQuotes.reduce((sum, q) => sum + (q.cost_amount || 0), 0)

      return {
        totalRevenue,
        totalCost,
        totalMargin,
        avgMarginPercent,
        acceptedCount: acceptedQuotes.length,
        totalQuotedValue,
        potentialMargin,
        quoteCount: allQuotes.length,
      }
    }),

  // Get margin trends over time
  getMarginTrends: protectedProcedure
    .input(
      z.object({
        period: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
        months: z.number().min(1).max(24).default(6),
        quoteType: z.enum(['all', 'dismantle', 'inland']).default('all'),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const months = input?.months || 6
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)

      // Get dismantle quotes
      const { data: dismantleQuotes } = await ctx.supabase
        .from('quote_history')
        .select('total, cost_amount, status, created_at')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'accepted')
        .order('created_at', { ascending: true })

      // Get inland quotes
      const { data: inlandQuotes } = await ctx.supabase
        .from('inland_quotes')
        .select('total, cost_amount, status, created_at')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'accepted')
        .order('created_at', { ascending: true })

      const allQuotes = [
        ...(input?.quoteType !== 'inland' ? (dismantleQuotes || []).map(q => ({ ...q, type: 'dismantle' })) : []),
        ...(input?.quoteType !== 'dismantle' ? (inlandQuotes || []).map(q => ({ ...q, type: 'inland' })) : []),
      ]

      // Group by month
      const monthlyData: Record<string, { revenue: number; cost: number; margin: number; count: number }> = {}

      allQuotes.forEach(quote => {
        const date = new Date(quote.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, cost: 0, margin: 0, count: 0 }
        }

        monthlyData[monthKey].revenue += quote.total || 0
        monthlyData[monthKey].cost += quote.cost_amount || 0
        monthlyData[monthKey].margin += (quote.total || 0) - (quote.cost_amount || 0)
        monthlyData[monthKey].count += 1
      })

      // Convert to array and sort
      const trends = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          ...data,
          marginPercent: data.revenue > 0 ? (data.margin / data.revenue) * 100 : 0,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      return trends
    }),

  // Get margin by customer
  getMarginByCustomer: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        sortBy: z.enum(['revenue', 'margin', 'marginPercent', 'count']).default('revenue'),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Get dismantle quotes with company
      const { data: dismantleQuotes } = await ctx.supabase
        .from('quote_history')
        .select(`
          total, cost_amount, status,
          company:companies(id, name)
        `)
        .eq('status', 'accepted')
        .not('company_id', 'is', null)

      // Get inland quotes with company
      const { data: inlandQuotes } = await ctx.supabase
        .from('inland_quotes')
        .select(`
          total, cost_amount, status,
          company:companies(id, name)
        `)
        .eq('status', 'accepted')
        .not('company_id', 'is', null)

      const allQuotes = [...(dismantleQuotes || []), ...(inlandQuotes || [])]

      // Group by company
      const companyData: Record<string, {
        id: string
        name: string
        revenue: number
        cost: number
        margin: number
        count: number
      }> = {}

      allQuotes.forEach(quote => {
        const companyRaw = quote.company as { id: string; name: string } | { id: string; name: string }[] | null
        const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw
        if (!company) return

        if (!companyData[company.id]) {
          companyData[company.id] = {
            id: company.id,
            name: company.name,
            revenue: 0,
            cost: 0,
            margin: 0,
            count: 0,
          }
        }

        companyData[company.id].revenue += quote.total || 0
        companyData[company.id].cost += quote.cost_amount || 0
        companyData[company.id].margin += (quote.total || 0) - (quote.cost_amount || 0)
        companyData[company.id].count += 1
      })

      // Convert to array and sort
      const sortBy = input?.sortBy || 'revenue'
      const customers = Object.values(companyData)
        .map(c => ({
          ...c,
          marginPercent: c.revenue > 0 ? (c.margin / c.revenue) * 100 : 0,
        }))
        .sort((a, b) => {
          switch (sortBy) {
            case 'margin': return b.margin - a.margin
            case 'marginPercent': return b.marginPercent - a.marginPercent
            case 'count': return b.count - a.count
            default: return b.revenue - a.revenue
          }
        })
        .slice(0, input?.limit || 10)

      return customers
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

  // Get margin by location (for dismantle quotes)
  getMarginByLocation: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('quote_history')
      .select('location, total, cost_amount')
      .eq('status', 'accepted')

    checkSupabaseError(error, 'Quotes')

    const locationData: Record<string, { revenue: number; cost: number; margin: number; count: number }> = {}

    ;(data || []).forEach(quote => {
      if (!quote.location) return
      if (!locationData[quote.location]) {
        locationData[quote.location] = { revenue: 0, cost: 0, margin: 0, count: 0 }
      }
      locationData[quote.location].revenue += quote.total || 0
      locationData[quote.location].cost += quote.cost_amount || 0
      locationData[quote.location].margin += (quote.total || 0) - (quote.cost_amount || 0)
      locationData[quote.location].count += 1
    })

    return Object.entries(locationData)
      .map(([location, data]) => ({
        location,
        ...data,
        marginPercent: data.revenue > 0 ? (data.margin / data.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }),
})
