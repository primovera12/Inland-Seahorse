import { z } from 'zod'
import { router, protectedProcedure, rateLimitedProcedure } from '../trpc/trpc'
import { Resend } from 'resend'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

// Lazy initialization to avoid build-time errors when API key is not set
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }
  return new Resend(apiKey)
}

export const feedbackRouter = router({
  // Submit a new ticket (rate limited: 5 per 5 minutes)
  submit: rateLimitedProcedure.feedback
    .input(
      z.object({
        type: z.enum(['bug', 'feature', 'enhancement', 'question']),
        priority: z.enum(['low', 'medium', 'high', 'critical']),
        title: z.string().min(5).max(200),
        description: z.string().min(10).max(5000),
        page_url: z.string(),
        screenshot_base64: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate ticket number
      const { count } = await ctx.supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })

      const ticketNumber = `TKT-${String((count || 0) + 1).padStart(5, '0')}`

      // Upload screenshot if provided
      let screenshotUrl: string | undefined
      if (input.screenshot_base64) {
        const base64Data = input.screenshot_base64.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        const fileName = `screenshots/${ticketNumber}-${Date.now()}.png`

        const { data: uploadData, error: uploadError } = await ctx.supabase.storage
          .from('feedback')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false,
          })

        if (!uploadError && uploadData) {
          const { data: urlData } = ctx.supabase.storage
            .from('feedback')
            .getPublicUrl(fileName)
          screenshotUrl = urlData.publicUrl
        }
      }

      // Get user info
      const { data: userProfile } = await ctx.supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', ctx.user.id)
        .single()

      const submitterName = userProfile
        ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
        : undefined

      // Create the ticket
      const { data: ticket, error } = await ctx.supabase
        .from('tickets')
        .insert({
          ticket_number: ticketNumber,
          type: input.type,
          priority: input.priority,
          status: 'open',
          title: input.title,
          description: input.description,
          page_url: input.page_url,
          screenshot_url: screenshotUrl,
          submitted_by: ctx.user.id,
          submitted_by_email: ctx.user.email,
          submitted_by_name: submitterName,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Ticket')

      // Send email notification to admin
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'

      try {
        await getResend().emails.send({
          from: 'Dismantle Pro <noreply@dismantlepro.com>',
          to: adminEmail,
          subject: `[${ticketNumber}] New ${input.type}: ${input.title}`,
          html: `
            <h2>New Ticket Submitted</h2>
            <p><strong>Ticket:</strong> ${ticketNumber}</p>
            <p><strong>Type:</strong> ${input.type}</p>
            <p><strong>Priority:</strong> ${input.priority}</p>
            <p><strong>Title:</strong> ${input.title}</p>
            <p><strong>Submitted By:</strong> ${submitterName || ctx.user.email}</p>
            <p><strong>Page:</strong> ${input.page_url}</p>
            <hr />
            <p><strong>Description:</strong></p>
            <p>${input.description.replace(/\n/g, '<br />')}</p>
            ${screenshotUrl ? `<p><a href="${screenshotUrl}">View Screenshot</a></p>` : ''}
          `,
        })
      } catch (emailError) {
        // Don't fail the submission if email fails
        console.error('Failed to send ticket notification email:', emailError)
      }

      return ticket
    }),

  // Get all tickets (admin)
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
        type: z.enum(['bug', 'feature', 'enhancement', 'question']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (input?.status) {
        query = query.eq('status', input.status)
      }
      if (input?.type) {
        query = query.eq('type', input.type)
      }
      if (input?.priority) {
        query = query.eq('priority', input.priority)
      }

      query = query.range(input?.offset || 0, (input?.offset || 0) + (input?.limit || 50) - 1)

      const { data, error, count } = await query

      checkSupabaseError(error, 'Ticket')
      return { tickets: data || [], total: count || 0 }
    }),

  // Get single ticket
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tickets')
        .select('*')
        .eq('id', input.id)
        .single()

      checkSupabaseError(error, 'Ticket')
      assertDataExists(data, 'Ticket')
      return data
    }),

  // Update ticket status (admin)
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
        admin_notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        status: input.status,
        updated_at: new Date().toISOString(),
      }

      if (input.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      }

      if (input.admin_notes !== undefined) {
        updateData.admin_notes = input.admin_notes
      }

      const { data, error } = await ctx.supabase
        .from('tickets')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single()

      checkSupabaseError(error, 'Ticket')
      return data
    }),

  // Get user's own tickets
  myTickets: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50
      const offset = input?.offset ?? 0

      const { data, error, count } = await ctx.supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .eq('submitted_by', ctx.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      checkSupabaseError(error, 'Ticket')
      return { tickets: data || [], total: count || 0 }
    }),

  // Get ticket stats (admin dashboard)
  stats: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('tickets')
      .select('status, type, priority')

    checkSupabaseError(error, 'Ticket')

    const stats = {
      total: data?.length || 0,
      byStatus: {
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
      },
      byType: {
        bug: 0,
        feature: 0,
        enhancement: 0,
        question: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
    }

    data?.forEach((ticket) => {
      stats.byStatus[ticket.status as keyof typeof stats.byStatus]++
      stats.byType[ticket.type as keyof typeof stats.byType]++
      stats.byPriority[ticket.priority as keyof typeof stats.byPriority]++
    })

    return stats
  }),
})
