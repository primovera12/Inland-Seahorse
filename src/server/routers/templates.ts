import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

export const templatesRouter = router({
  // Get all templates
  getAll: protectedProcedure
    .input(
      z.object({
        type: z.enum(['dismantle', 'inland']).optional(),
        limit: z.number().min(1).max(50).default(20),
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
      return data
    }),

  // Delete template
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('quote_templates')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Template')
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
})
