import { z } from 'zod'
import { protectedProcedure, router } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'

export const searchRouter = router({
  global: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const searchTerm = `%${input.query.toLowerCase()}%`

      // Search dismantling quotes
      const quotesResult = await ctx.supabase
        .from('quotes')
        .select('id, quote_number, customer_name, customer_company, total, status')
        .or(
          `quote_number.ilike.${searchTerm},customer_name.ilike.${searchTerm},customer_company.ilike.${searchTerm}`
        )
        .order('created_at', { ascending: false })
        .limit(5)
      checkSupabaseError(quotesResult.error, 'Quotes search')

      // Search inland quotes
      const inlandResult = await ctx.supabase
        .from('inland_quotes')
        .select('id, quote_number, customer_name, customer_company, total, status')
        .or(
          `quote_number.ilike.${searchTerm},customer_name.ilike.${searchTerm},customer_company.ilike.${searchTerm}`
        )
        .order('created_at', { ascending: false })
        .limit(5)
      checkSupabaseError(inlandResult.error, 'Inland quotes search')

      // Search companies
      const companiesResult = await ctx.supabase
        .from('companies')
        .select('id, name, industry, status')
        .or(`name.ilike.${searchTerm}`)
        .order('name')
        .limit(5)
      checkSupabaseError(companiesResult.error, 'Companies search')

      // Search contacts
      const contactsResult = await ctx.supabase
        .from('contacts')
        .select('id, name, email, phone')
        .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .order('name')
        .limit(5)
      checkSupabaseError(contactsResult.error, 'Contacts search')

      return {
        quotes: quotesResult.data || [],
        inlandQuotes: inlandResult.data || [],
        companies: companiesResult.data || [],
        contacts: contactsResult.data || [],
      }
    }),
})
