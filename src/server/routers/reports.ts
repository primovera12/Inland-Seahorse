import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'

export const reportsRouter = router({
  // Quote statistics
  getQuoteStats: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const startDate = input?.startDate || getMonthStartDate()
      const endDate = input?.endDate || new Date().toISOString()

      // Get dismantling quotes
      const { data: dismantlingQuotes } = await ctx.supabase
        .from('quote_history')
        .select('id, total, status, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      // Get inland quotes
      const { data: inlandQuotes } = await ctx.supabase
        .from('inland_quotes')
        .select('id, total, status, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      const quotes = dismantlingQuotes || []
      const inland = inlandQuotes || []

      // Calculate stats
      const totalQuotes = quotes.length + inland.length
      const totalValue = [...quotes, ...inland].reduce((sum, q) => sum + (q.total || 0), 0)

      const acceptedQuotes = quotes.filter((q) => q.status === 'accepted')
      const acceptedInland = inland.filter((q) => q.status === 'accepted')
      const acceptedCount = acceptedQuotes.length + acceptedInland.length
      const acceptedValue = [...acceptedQuotes, ...acceptedInland].reduce(
        (sum, q) => sum + (q.total || 0),
        0
      )

      const pendingQuotes = quotes.filter((q) => q.status === 'sent' || q.status === 'draft')
      const pendingInland = inland.filter((q) => q.status === 'sent' || q.status === 'draft')
      const pendingCount = pendingQuotes.length + pendingInland.length

      const conversionRate = totalQuotes > 0 ? Math.round((acceptedCount / totalQuotes) * 100) : 0

      return {
        totalQuotes,
        totalValue,
        acceptedCount,
        acceptedValue,
        pendingCount,
        conversionRate,
        dismantlingCount: quotes.length,
        inlandCount: inland.length,
      }
    }),

  // Revenue by month
  getRevenueByMonth: protectedProcedure
    .input(z.object({ months: z.number().min(1).max(12).default(6) }).optional())
    .query(async ({ ctx, input }) => {
      const monthsToFetch = input?.months || 6
      const results: { month: string; dismantling: number; inland: number; total: number }[] = []

      for (let i = monthsToFetch - 1; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const year = date.getFullYear()
        const month = date.getMonth()

        const startOfMonth = new Date(year, month, 1).toISOString()
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

        // Get accepted quotes for this month
        const [{ data: dismantling }, { data: inland }] = await Promise.all([
          ctx.supabase
            .from('quote_history')
            .select('total')
            .eq('status', 'accepted')
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth),
          ctx.supabase
            .from('inland_quotes')
            .select('total')
            .eq('status', 'accepted')
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth),
        ])

        const dismantlingTotal = (dismantling || []).reduce((sum, q) => sum + (q.total || 0), 0)
        const inlandTotal = (inland || []).reduce((sum, q) => sum + (q.total || 0), 0)

        results.push({
          month: monthLabel,
          dismantling: dismantlingTotal,
          inland: inlandTotal,
          total: dismantlingTotal + inlandTotal,
        })
      }

      return results
    }),

  // Quotes by status
  getQuotesByStatus: protectedProcedure.query(async ({ ctx }) => {
    const [{ data: dismantling }, { data: inland }] = await Promise.all([
      ctx.supabase.from('quote_history').select('status'),
      ctx.supabase.from('inland_quotes').select('status'),
    ])

    const allQuotes = [...(dismantling || []), ...(inland || [])]

    const byStatus: Record<string, number> = {}
    allQuotes.forEach((q) => {
      byStatus[q.status] = (byStatus[q.status] || 0) + 1
    })

    return Object.entries(byStatus).map(([status, count]) => ({
      status,
      count,
    }))
  }),

  // Top customers by revenue
  getTopCustomers: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 10

      // Get all accepted quotes with customer info
      const [{ data: dismantling }, { data: inland }] = await Promise.all([
        ctx.supabase
          .from('quote_history')
          .select('customer_name, customer_company, total')
          .eq('status', 'accepted'),
        ctx.supabase
          .from('inland_quotes')
          .select('customer_name, customer_company, total')
          .eq('status', 'accepted'),
      ])

      const allQuotes = [...(dismantling || []), ...(inland || [])]

      // Group by customer
      const customerRevenue: Record<string, { name: string; company: string | null; total: number; count: number }> = {}

      allQuotes.forEach((q) => {
        const key = q.customer_company || q.customer_name || 'Unknown'
        if (!customerRevenue[key]) {
          customerRevenue[key] = {
            name: q.customer_name || 'Unknown',
            company: q.customer_company,
            total: 0,
            count: 0,
          }
        }
        customerRevenue[key].total += q.total || 0
        customerRevenue[key].count += 1
      })

      return Object.values(customerRevenue)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
    }),

  // Activity summary
  getActivitySummary: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const days = input?.days || 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: activities } = await ctx.supabase
        .from('activity_logs')
        .select('activity_type')
        .gte('created_at', startDate.toISOString())

      const byType: Record<string, number> = {}
      ;(activities || []).forEach((a) => {
        byType[a.activity_type] = (byType[a.activity_type] || 0) + 1
      })

      return Object.entries(byType).map(([type, count]) => ({
        type,
        count,
      }))
    }),
})

function getMonthStartDate(): string {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}
