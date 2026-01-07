import { router, protectedProcedure } from '../trpc/trpc'

export const dashboardRouter = router({
  // Get dashboard statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Get quote counts
    const { count: totalQuotes } = await ctx.supabase
      .from('quote_history')
      .select('*', { count: 'exact', head: true })

    const { count: pendingQuotes } = await ctx.supabase
      .from('quote_history')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')

    const { count: totalInlandQuotes } = await ctx.supabase
      .from('inland_quotes')
      .select('*', { count: 'exact', head: true })

    const { count: activeCompanies } = await ctx.supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Get quote totals for this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyQuotes } = await ctx.supabase
      .from('quote_history')
      .select('total')
      .gte('created_at', startOfMonth.toISOString())

    const monthlyTotal = monthlyQuotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0

    // Get accepted quotes value
    const { data: acceptedQuotes } = await ctx.supabase
      .from('quote_history')
      .select('total')
      .eq('status', 'accepted')

    const acceptedTotal = acceptedQuotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0

    return {
      totalQuotes: totalQuotes || 0,
      pendingQuotes: pendingQuotes || 0,
      totalInlandQuotes: totalInlandQuotes || 0,
      activeCompanies: activeCompanies || 0,
      monthlyTotal,
      acceptedTotal,
    }
  }),

  // Get recent quotes
  getRecentQuotes: protectedProcedure.query(async ({ ctx }) => {
    const { data: quotes } = await ctx.supabase
      .from('quote_history')
      .select('id, quote_number, customer_name, customer_company, total, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    return quotes || []
  }),

  // Get recent inland quotes
  getRecentInlandQuotes: protectedProcedure.query(async ({ ctx }) => {
    const { data: quotes } = await ctx.supabase
      .from('inland_quotes')
      .select('id, quote_number, customer_name, customer_company, total, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    return quotes || []
  }),
})
