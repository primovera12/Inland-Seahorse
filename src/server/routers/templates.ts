import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

export const templatesRouter = router({
  // Get all categories
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('template_categories')
      .select('*')
      .order('display_order', { ascending: true })

    checkSupabaseError(error, 'Category')
    return data || []
  }),

  // Create category
  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        icon: z.string().default('folder'),
        color: z.string().default('gray'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('template_categories')
        .insert(input)
        .select()
        .single()

      checkSupabaseError(error, 'Category')
      return data
    }),

  // Get all templates with category filtering
  getAll: protectedProcedure
    .input(
      z.object({
        type: z.enum(['dismantle', 'inland']).optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('quote_templates')
        .select('*')
        .order('use_count', { ascending: false })
        .limit(input.limit)

      if (input.type) {
        query = query.eq('template_type', input.type)
      }

      if (input.category && input.category !== 'all') {
        query = query.eq('category', input.category)
      }

      if (input.search) {
        query = query.or(`name.ilike.%${input.search}%,description.ilike.%${input.search}%`)
      }

      const { data, error } = await query
      checkSupabaseError(error, 'Template')
      return data
    }),

  // Get template by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('quote_templates')
        .select('*')
        .eq('id', input.id)
        .single()

      checkSupabaseError(error, 'Template')
      assertDataExists(data, 'Template')
      return data
    }),

  // Create template
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        template_type: z.enum(['dismantle', 'inland']),
        template_data: z.record(z.string(), z.unknown()),
        category: z.string().default('general'),
        is_default: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If setting as default, unset other defaults
      if (input.is_default) {
        await ctx.supabase
          .from('quote_templates')
          .update({ is_default: false })
          .eq('template_type', input.template_type)
      }

      const { data, error } = await ctx.supabase
        .from('quote_templates')
        .insert({
          ...input,
          created_by: ctx.user.id,
          use_count: 0,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Template')

      // Log template creation
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'settings_updated',
          subject: `Quote template "${input.name}" created`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} created ${input.template_type} quote template "${input.name}"`.trim(),
          metadata: { template_id: data.id, template_name: input.name, template_type: input.template_type, action: 'create' },
        })
      }

      return data
    }),

  // Update template
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        template_data: z.record(z.string(), z.unknown()).optional(),
        category: z.string().optional(),
        is_default: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      // If setting as default, unset other defaults
      if (updates.is_default) {
        const { data: template } = await ctx.supabase
          .from('quote_templates')
          .select('template_type')
          .eq('id', id)
          .single()

        if (template) {
          await ctx.supabase
            .from('quote_templates')
            .update({ is_default: false })
            .eq('template_type', template.template_type)
        }
      }

      const { data, error } = await ctx.supabase
        .from('quote_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      checkSupabaseError(error, 'Template')

      // Log template update
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'settings_updated',
          subject: `Quote template "${data.name}" updated`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} updated ${data.template_type} quote template "${data.name}"`.trim(),
          metadata: { template_id: data.id, template_name: data.name, template_type: data.template_type, action: 'update', updated_fields: Object.keys(updates) },
        })
      }

      return data
    }),

  // Delete template
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get template info before deletion for logging
      const { data: templateToDelete } = await ctx.supabase
        .from('quote_templates')
        .select('name, template_type')
        .eq('id', input.id)
        .single()

      const { error } = await ctx.supabase
        .from('quote_templates')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Template')

      // Log template deletion
      if (templateToDelete) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'settings_updated',
          subject: `Quote template "${templateToDelete.name}" deleted`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} deleted ${templateToDelete.template_type} quote template "${templateToDelete.name}"`.trim(),
          metadata: { template_name: templateToDelete.name, template_type: templateToDelete.template_type, action: 'delete' },
        })
      }

      return { success: true }
    }),

  // Increment use count
  incrementUseCount: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.rpc('increment_template_use_count', {
        template_id: input.id,
      })

      if (error) {
        // Fallback if RPC doesn't exist - use manual increment
        const { data: template, error: fetchError } = await ctx.supabase
          .from('quote_templates')
          .select('use_count')
          .eq('id', input.id)
          .single()

        checkSupabaseError(fetchError, 'Template')

        if (template) {
          const { error: updateError } = await ctx.supabase
            .from('quote_templates')
            .update({ use_count: (template.use_count || 0) + 1 })
            .eq('id', input.id)
          checkSupabaseError(updateError, 'Template')
        }
      }

      return { success: true }
    }),

  // Duplicate template
  duplicate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get the source template
      const { data: source, error: fetchError } = await ctx.supabase
        .from('quote_templates')
        .select('*')
        .eq('id', input.id)
        .single()

      checkSupabaseError(fetchError, 'Template')
      assertDataExists(source, 'Template')

      // Create duplicate with modified name
      const { data, error } = await ctx.supabase
        .from('quote_templates')
        .insert({
          name: `${source.name} (Copy)`,
          description: source.description,
          template_type: source.template_type,
          template_data: source.template_data,
          category: source.category || 'general',
          is_default: false,
          created_by: ctx.user.id,
          use_count: 0,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Template')
      return data
    }),
})
