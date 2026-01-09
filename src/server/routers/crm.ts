import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

export const crmRouter = router({
  // === Company Health Scoring ===

  // Get company health overview
  getCompanyHealth: protectedProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('companies')
        .select(`
          id, name, health_score, churn_risk, last_activity_at,
          total_revenue, quote_count, accepted_quote_count, win_rate
        `)
        .eq('id', input.companyId)
        .single()

      checkSupabaseError(error, 'Company')
      assertDataExists(data, 'Company')
      return data
    }),

  // Recalculate company health score
  recalculateHealth: protectedProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Call the database function
      const { error } = await ctx.supabase
        .rpc('update_company_health_score', { company_uuid: input.companyId })

      if (error) {
        console.error('Health score update error:', error)
        throw new Error('Failed to update health score')
      }

      // Return updated company
      const { data } = await ctx.supabase
        .from('companies')
        .select('id, health_score, churn_risk, last_activity_at, win_rate')
        .eq('id', input.companyId)
        .single()

      return data
    }),

  // Get companies sorted by health/risk
  getCompaniesByHealth: protectedProcedure
    .input(z.object({
      churnRisk: z.enum(['all', 'low', 'medium', 'high']).default('all'),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('companies')
        .select('id, name, health_score, churn_risk, last_activity_at, quote_count, win_rate')
        .order('health_score', { ascending: true })
        .limit(input?.limit || 20)

      if (input?.churnRisk && input.churnRisk !== 'all') {
        query = query.eq('churn_risk', input.churnRisk)
      }

      const { data, error } = await query

      checkSupabaseError(error, 'Companies')
      return data || []
    }),

  // === Activity Timeline ===

  // Log an activity
  logActivity: protectedProcedure
    .input(z.object({
      entityType: z.enum(['company', 'contact', 'quote', 'inland_quote', 'email', 'note']),
      entityId: z.string().uuid(),
      action: z.string().min(1),
      description: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      companyId: z.string().uuid().optional(),
      contactId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('activity_log')
        .insert({
          user_id: ctx.user.id,
          entity_type: input.entityType,
          entity_id: input.entityId,
          action: input.action,
          description: input.description,
          metadata: input.metadata || {},
          company_id: input.companyId,
          contact_id: input.contactId,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Activity')
      return data
    }),

  // Get activity timeline for a company
  getCompanyTimeline: protectedProcedure
    .input(z.object({
      companyId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('activity_log')
        .select('*')
        .eq('company_id', input.companyId)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      checkSupabaseError(error, 'Activity')
      return data || []
    }),

  // Get activity timeline for a contact
  getContactTimeline: protectedProcedure
    .input(z.object({
      contactId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('activity_log')
        .select('*')
        .eq('contact_id', input.contactId)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      checkSupabaseError(error, 'Activity')
      return data || []
    }),

  // === Email Logs ===

  // Log a sent email
  logEmail: protectedProcedure
    .input(z.object({
      companyId: z.string().uuid().optional(),
      contactId: z.string().uuid().optional(),
      quoteId: z.string().uuid().optional(),
      inlandQuoteId: z.string().uuid().optional(),
      direction: z.enum(['sent', 'received']).default('sent'),
      subject: z.string(),
      bodyPreview: z.string().optional(),
      recipients: z.array(z.string()),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
      emailType: z.enum(['quote', 'follow_up', 'sequence', 'manual', 'system']).default('manual'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('email_logs')
        .insert({
          user_id: ctx.user.id,
          company_id: input.companyId,
          contact_id: input.contactId,
          quote_id: input.quoteId,
          inland_quote_id: input.inlandQuoteId,
          direction: input.direction,
          subject: input.subject,
          body_preview: input.bodyPreview,
          recipients: input.recipients,
          cc: input.cc || [],
          bcc: input.bcc || [],
          email_type: input.emailType,
          status: 'sent',
        })
        .select()
        .single()

      checkSupabaseError(error, 'Email log')

      // Also log activity
      if (input.companyId || input.contactId) {
        await ctx.supabase.from('activity_log').insert({
          user_id: ctx.user.id,
          entity_type: 'email',
          entity_id: data.id,
          action: 'email_sent',
          description: `Email sent: ${input.subject}`,
          company_id: input.companyId,
          contact_id: input.contactId,
        })
      }

      return data
    }),

  // Get email history for a company/contact
  getEmailHistory: protectedProcedure
    .input(z.object({
      companyId: z.string().uuid().optional(),
      contactId: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('email_logs')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      if (input.companyId) {
        query = query.eq('company_id', input.companyId)
      }
      if (input.contactId) {
        query = query.eq('contact_id', input.contactId)
      }

      const { data, error } = await query

      checkSupabaseError(error, 'Email logs')
      return data || []
    }),

  // Update email status (for tracking)
  updateEmailStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['delivered', 'opened', 'clicked', 'bounced', 'failed']),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = { status: input.status }

      if (input.status === 'opened') {
        updates.opened_at = new Date().toISOString()
      }
      if (input.status === 'clicked') {
        updates.clicked_at = new Date().toISOString()
      }

      const { data, error } = await ctx.supabase
        .from('email_logs')
        .update(updates)
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      checkSupabaseError(error, 'Email log')
      return data
    }),

  // === Contact Tags ===

  // Get all tags for user
  getTags: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('contact_tags')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('name')

    checkSupabaseError(error, 'Tags')
    return data || []
  }),

  // Create a tag
  createTag: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(50),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6b7280'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contact_tags')
        .insert({
          user_id: ctx.user.id,
          name: input.name,
          color: input.color,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Tag')
      return data
    }),

  // Delete a tag
  deleteTag: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('contact_tags')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      checkSupabaseError(error, 'Tag')
      return { success: true }
    }),

  // Add tags to contact
  addTagsToContact: protectedProcedure
    .input(z.object({
      contactId: z.string().uuid(),
      tags: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current tags
      const { data: contact, error: fetchError } = await ctx.supabase
        .from('contacts')
        .select('tags')
        .eq('id', input.contactId)
        .single()

      checkSupabaseError(fetchError, 'Contact')
      assertDataExists(contact, 'Contact')

      const currentTags = (contact.tags as string[]) || []
      const newTags = [...new Set([...currentTags, ...input.tags])]

      const { data, error } = await ctx.supabase
        .from('contacts')
        .update({ tags: newTags })
        .eq('id', input.contactId)
        .select()
        .single()

      checkSupabaseError(error, 'Contact')
      return data
    }),

  // Remove tag from contact
  removeTagFromContact: protectedProcedure
    .input(z.object({
      contactId: z.string().uuid(),
      tag: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: contact, error: fetchError } = await ctx.supabase
        .from('contacts')
        .select('tags')
        .eq('id', input.contactId)
        .single()

      checkSupabaseError(fetchError, 'Contact')
      assertDataExists(contact, 'Contact')

      const currentTags = (contact.tags as string[]) || []
      const newTags = currentTags.filter(t => t !== input.tag)

      const { data, error } = await ctx.supabase
        .from('contacts')
        .update({ tags: newTags })
        .eq('id', input.contactId)
        .select()
        .single()

      checkSupabaseError(error, 'Contact')
      return data
    }),

  // Update contact preferences
  updateContactPreferences: protectedProcedure
    .input(z.object({
      contactId: z.string().uuid(),
      communicationPreferences: z.object({
        email: z.boolean().optional(),
        phone: z.boolean().optional(),
        sms: z.boolean().optional(),
      }).optional(),
      contactFrequency: z.enum(['high', 'normal', 'low', 'do_not_contact']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}

      if (input.communicationPreferences) {
        // Merge with existing preferences
        const { data: contact } = await ctx.supabase
          .from('contacts')
          .select('communication_preferences')
          .eq('id', input.contactId)
          .single()

        const currentPrefs = (contact?.communication_preferences as Record<string, boolean>) || {}
        updates.communication_preferences = { ...currentPrefs, ...input.communicationPreferences }
      }

      if (input.contactFrequency) {
        updates.contact_frequency = input.contactFrequency
      }

      const { data, error } = await ctx.supabase
        .from('contacts')
        .update(updates)
        .eq('id', input.contactId)
        .select()
        .single()

      checkSupabaseError(error, 'Contact')
      return data
    }),

  // Get contacts by tag
  getContactsByTag: protectedProcedure
    .input(z.object({
      tag: z.string(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name)
        `)
        .contains('tags', [input.tag])
        .limit(input.limit)

      checkSupabaseError(error, 'Contacts')
      return data || []
    }),

  // === Import Jobs ===

  // Create import job
  createImportJob: protectedProcedure
    .input(z.object({
      importType: z.enum(['contacts', 'companies', 'equipment']),
      fileName: z.string(),
      fileUrl: z.string(),
      fieldMapping: z.record(z.string(), z.string()),
      totalRows: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('import_jobs')
        .insert({
          user_id: ctx.user.id,
          import_type: input.importType,
          file_name: input.fileName,
          file_url: input.fileUrl,
          field_mapping: input.fieldMapping,
          total_rows: input.totalRows,
          status: 'pending',
        })
        .select()
        .single()

      checkSupabaseError(error, 'Import job')
      return data
    }),

  // Get import jobs
  getImportJobs: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('import_jobs')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(input?.limit || 20)

      if (input?.status) {
        query = query.eq('status', input.status)
      }

      const { data, error } = await query

      checkSupabaseError(error, 'Import jobs')
      return data || []
    }),

  // Update import job progress
  updateImportProgress: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      processedRows: z.number().optional(),
      successCount: z.number().optional(),
      errorCount: z.number().optional(),
      status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
      errors: z.array(z.object({
        row: z.number(),
        field: z.string().optional(),
        message: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const updateData: Record<string, unknown> = {}
      if (updates.processedRows !== undefined) updateData.processed_rows = updates.processedRows
      if (updates.successCount !== undefined) updateData.success_count = updates.successCount
      if (updates.errorCount !== undefined) updateData.error_count = updates.errorCount
      if (updates.status) {
        updateData.status = updates.status
        if (updates.status === 'processing') {
          updateData.started_at = new Date().toISOString()
        }
        if (['completed', 'failed', 'cancelled'].includes(updates.status)) {
          updateData.completed_at = new Date().toISOString()
        }
      }
      if (updates.errors) updateData.errors = updates.errors

      const { data, error } = await ctx.supabase
        .from('import_jobs')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      checkSupabaseError(error, 'Import job')
      return data
    }),
})
