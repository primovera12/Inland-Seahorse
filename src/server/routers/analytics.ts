import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'

export const analyticsRouter = router({
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
