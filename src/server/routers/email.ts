import { z } from 'zod'
import { router, protectedProcedure, rateLimitedProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'

export const emailRouter = router({
  // Send quote via email (rate limited: 10 per minute)
  sendQuote: rateLimitedProcedure.email
    .input(
      z.object({
        quoteId: z.string().uuid(),
        quoteType: z.enum(['dismantle', 'inland']),
        recipientEmail: z.string().email(),
        recipientName: z.string(),
        subject: z.string().optional(),
        message: z.string().optional(),
        includePdf: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Log the email sending attempt
      const { data: emailLog, error: logError } = await ctx.supabase
        .from('email_logs')
        .insert({
          quote_id: input.quoteId,
          quote_type: input.quoteType,
          recipient_email: input.recipientEmail,
          recipient_name: input.recipientName,
          subject: input.subject || `Quote from Dismantle Pro`,
          message: input.message,
          status: 'pending',
          sent_by: ctx.user.id,
        })
        .select()
        .single()

      checkSupabaseError(logError, 'Email log')

      // In production, integrate with Resend or similar service
      // For now, mark as sent and update the quote status
      const { error: updateError } = await ctx.supabase
        .from('email_logs')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', emailLog.id)

      checkSupabaseError(updateError, 'Email log')

      // Update quote status to 'sent'
      const tableName = input.quoteType === 'dismantle' ? 'quote_history' : 'inland_quotes'
      await ctx.supabase
        .from(tableName)
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', input.quoteId)

      // Log the email sending activity
      if (ctx.user) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'quote_emailed',
          subject: `Quote emailed to ${input.recipientName}`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} sent ${input.quoteType} quote to ${input.recipientEmail}`.trim(),
          related_quote_id: input.quoteType === 'dismantle' ? input.quoteId : null,
          related_inland_quote_id: input.quoteType === 'inland' ? input.quoteId : null,
          metadata: {
            recipient_email: input.recipientEmail,
            recipient_name: input.recipientName,
            quote_type: input.quoteType,
            include_pdf: input.includePdf,
          },
        })
      }

      return { success: true, emailLogId: emailLog.id }
    }),

  // Get email history for a quote
  getQuoteEmailHistory: protectedProcedure
    .input(
      z.object({
        quoteId: z.string().uuid(),
        quoteType: z.enum(['dismantle', 'inland']),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('email_logs')
        .select('*, sent_by_user:users(first_name, last_name)')
        .eq('quote_id', input.quoteId)
        .eq('quote_type', input.quoteType)
        .order('created_at', { ascending: false })

      checkSupabaseError(error, 'Email')
      return data
    }),
})
