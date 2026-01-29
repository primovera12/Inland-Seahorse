/**
 * Load Planner Quotes Router
 *
 * tRPC router for managing Load Planner v2 quote history.
 * Handles CRUD operations for quotes and all related data
 * (cargo items, trucks, service items, accessorials, permits).
 */

import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'
import { TRPCError } from '@trpc/server'
import type {
  LoadPlannerQuoteStatus,
  LoadPlannerQuote,
  LoadPlannerQuoteRow,
  LoadPlannerCargoItemRow,
  LoadPlannerTruckRow,
  LoadPlannerServiceItemRow,
  LoadPlannerAccessorialRow,
  LoadPlannerPermitRow,
  LoadPlannerQuoteListItem,
  BillingUnit,
  ItemGeometry,
  DimensionsSource,
} from '@/types/load-planner-quotes'
import {
  quoteRowToQuote,
  cargoItemRowToItem,
  truckRowToTruck,
  serviceItemRowToItem,
  accessorialRowToItem,
  permitRowToPermit,
} from '@/types/load-planner-quotes'

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const quoteStatusSchema = z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'])
const billingUnitSchema = z.enum(['flat', 'hour', 'day', 'way', 'week', 'month', 'stop', 'mile'])
const geometrySchema = z.enum(['box', 'cylinder', 'hollow-cylinder'])
const dimensionsSourceSchema = z.enum(['ai', 'database', 'manual'])

// Cargo item input schema
const cargoItemInputSchema = z.object({
  id: z.string().uuid().optional(), // Existing item ID for updates
  sku: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  lengthIn: z.number().int().positive().optional(),
  widthIn: z.number().int().positive().optional(),
  heightIn: z.number().int().positive().optional(),
  weightLbs: z.number().int().positive().optional(),
  stackable: z.boolean().default(false),
  bottomOnly: z.boolean().default(false),
  maxLayers: z.number().int().positive().optional(),
  fragile: z.boolean().default(false),
  hazmat: z.boolean().default(false),
  notes: z.string().optional(),
  orientation: z.number().int().default(1),
  geometry: geometrySchema.default('box'),
  equipmentMakeId: z.string().uuid().optional(),
  equipmentModelId: z.string().uuid().optional(),
  dimensionsSource: dimensionsSourceSchema.optional(),
  imageUrl: z.string().url().optional(),
  imageUrl2: z.string().url().optional(),
  frontImageUrl: z.string().url().optional(),
  sideImageUrl: z.string().url().optional(),
  assignedTruckIndex: z.number().int().min(0).optional(),
  placementX: z.number().optional(),
  placementY: z.number().optional(),
  placementZ: z.number().optional(),
  placementRotation: z.number().int().optional(),
  sortOrder: z.number().int().default(0),
})

// Truck input schema
const truckInputSchema = z.object({
  id: z.string().uuid().optional(), // Existing truck ID for updates
  truckIndex: z.number().int().min(0),
  truckTypeId: z.string().min(1),
  truckName: z.string().optional(),
  truckCategory: z.string().optional(),
  deckLengthFt: z.number().positive().optional(),
  deckWidthFt: z.number().positive().optional(),
  deckHeightFt: z.number().positive().optional(),
  wellLengthFt: z.number().positive().optional(),
  maxCargoWeightLbs: z.number().int().positive().optional(),
  totalWeightLbs: z.number().int().min(0).optional(),
  totalItems: z.number().int().min(0).optional(),
  isLegal: z.boolean().default(true),
  permitsRequired: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  truckScore: z.number().int().min(0).max(100).optional(),
})

// Service item input schema
const serviceItemInputSchema = z.object({
  id: z.string().uuid().optional(), // Existing item ID for updates
  serviceTypeId: z.string().uuid().optional(),
  name: z.string().min(1),
  rateCents: z.number().int().min(0),
  quantity: z.number().positive().default(1),
  totalCents: z.number().int().min(0),
  truckIndex: z.number().int().min(0).optional(),
  sortOrder: z.number().int().default(0),
})

// Accessorial input schema
const accessorialInputSchema = z.object({
  id: z.string().uuid().optional(), // Existing item ID for updates
  accessorialTypeId: z.string().uuid().optional(),
  name: z.string().min(1),
  billingUnit: billingUnitSchema,
  rateCents: z.number().int().min(0),
  quantity: z.number().positive().default(1),
  totalCents: z.number().int().min(0),
  notes: z.string().optional(),
  sortOrder: z.number().int().default(0),
})

// Permit input schema
const permitInputSchema = z.object({
  id: z.string().uuid().optional(), // Existing permit ID for updates
  stateCode: z.string().length(2),
  stateName: z.string().optional(),
  calculatedPermitFeeCents: z.number().int().min(0).optional(),
  calculatedEscortCostCents: z.number().int().min(0).optional(),
  permitFeeCents: z.number().int().min(0).optional(),
  escortCostCents: z.number().int().min(0).optional(),
  distanceMiles: z.number().int().min(0).optional(),
  escortCount: z.number().int().min(0).optional(),
  poleCarRequired: z.boolean().default(false),
  notes: z.string().optional(),
})

// Create quote input schema
const createQuoteInputSchema = z.object({
  // Customer
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  customerCompany: z.string().optional(),
  companyId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),

  // Customer address
  customerAddressLine1: z.string().optional(),
  customerAddressCity: z.string().optional(),
  customerAddressState: z.string().optional(),
  customerAddressZip: z.string().optional(),

  // Pickup
  pickupAddress: z.string().optional(),
  pickupCity: z.string().optional(),
  pickupState: z.string().optional(),
  pickupZip: z.string().optional(),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),

  // Dropoff
  dropoffAddress: z.string().optional(),
  dropoffCity: z.string().optional(),
  dropoffState: z.string().optional(),
  dropoffZip: z.string().optional(),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),

  // Route
  distanceMiles: z.number().int().min(0).optional(),
  durationMinutes: z.number().int().min(0).optional(),
  routePolyline: z.string().optional(),

  // Totals
  subtotalCents: z.number().int().min(0).optional(),
  totalCents: z.number().int().min(0).optional(),

  // Notes
  internalNotes: z.string().optional(),
  quoteNotes: z.string().optional(),

  // Carrier assignment
  carrierId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  truckId: z.string().uuid().optional(),
  carrierRateCents: z.number().int().min(0).optional(),
  carrierNotes: z.string().optional(),

  // Related data
  cargoItems: z.array(cargoItemInputSchema).optional(),
  trucks: z.array(truckInputSchema).optional(),
  serviceItems: z.array(serviceItemInputSchema).optional(),
  accessorials: z.array(accessorialInputSchema).optional(),
  permits: z.array(permitInputSchema).optional(),
})

// Filter schema
const filterSchema = z.object({
  search: z.string().optional(),
  status: z.union([quoteStatusSchema, z.array(quoteStatusSchema)]).optional(),
  customerName: z.string().optional(),
  customerCompany: z.string().optional(),
  pickupState: z.string().optional(),
  dropoffState: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  companyId: z.string().uuid().optional(),
})

// Pagination schema
const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique quote number
 */
async function generateQuoteNumber(supabase: any): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `LP-${dateStr}-`

  // Get the highest counter for today
  const { data: existing } = await supabase
    .from('load_planner_quotes')
    .select('quote_number')
    .like('quote_number', `${prefix}%`)
    .order('quote_number', { ascending: false })
    .limit(1)

  let counter = 1
  if (existing && existing.length > 0) {
    const lastNumber = existing[0].quote_number
    const lastCounter = parseInt(lastNumber.split('-').pop() || '0', 10)
    counter = lastCounter + 1
  }

  return `${prefix}${counter.toString().padStart(4, '0')}`
}

/**
 * Convert camelCase input to snake_case for database
 */
function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

/**
 * Upsert related items (update existing, insert new, delete removed)
 * This preserves IDs and created_at timestamps for existing items.
 */
async function upsertRelatedItems<T extends { id?: string }>(
  supabase: any,
  tableName: string,
  quoteId: string,
  items: T[] | undefined,
  mapToDbRow: (item: T, quoteId: string, index: number) => Record<string, any>
): Promise<void> {
  if (items === undefined) return // Field not included in update, skip

  // Get existing IDs for this quote
  const { data: existingRows } = await supabase
    .from(tableName)
    .select('id')
    .eq('quote_id', quoteId)

  const existingIds = new Set<string>((existingRows || []).map((r: { id: string }) => r.id))
  const incomingIds = new Set<string>(items.filter(i => i.id).map(i => i.id as string))

  // Find IDs to delete (exist in DB but not in incoming)
  const idsToDelete = [...existingIds].filter((id): id is string => !incomingIds.has(id))

  // Separate items into updates vs inserts
  const toUpdate = items.filter(i => i.id && existingIds.has(i.id))
  const toInsert = items.filter(i => !i.id || !existingIds.has(i.id))

  // Delete removed items
  if (idsToDelete.length > 0) {
    await supabase.from(tableName).delete().in('id', idsToDelete)
  }

  // Update existing items
  for (let i = 0; i < toUpdate.length; i++) {
    const item = toUpdate[i]
    const dbRow = mapToDbRow(item, quoteId, i)
    const { id, quote_id, created_at, ...updateFields } = dbRow
    await supabase.from(tableName).update(updateFields).eq('id', item.id)
  }

  // Insert new items
  if (toInsert.length > 0) {
    const insertRows = toInsert.map((item, index) => {
      const dbRow = mapToDbRow(item, quoteId, toUpdate.length + index)
      const { id, ...insertFields } = dbRow // Remove id so DB generates one
      return insertFields
    })
    await supabase.from(tableName).insert(insertRows)
  }
}

// =============================================================================
// ROUTER
// =============================================================================

export const loadPlannerQuotesRouter = router({
  /**
   * Get all quotes with filters and pagination
   */
  getAll: protectedProcedure
    .input(
      z.object({
        filters: filterSchema.optional(),
        pagination: paginationSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input
      const page = pagination?.page ?? 1
      const pageSize = pagination?.pageSize ?? 25
      const sortBy = pagination?.sortBy ?? 'created_at'
      const sortOrder = pagination?.sortOrder ?? 'desc'

      // Build query
      let query = ctx.supabase
        .from('load_planner_quotes')
        .select(
          `
          id,
          quote_number,
          status,
          customer_name,
          customer_company,
          pickup_city,
          pickup_state,
          dropoff_city,
          dropoff_state,
          total_cents,
          carrier_rate_cents,
          carrier_id,
          created_at,
          updated_at,
          load_planner_trucks(count),
          load_planner_cargo_items(count),
          carriers(company_name)
        `,
          { count: 'exact' }
        )
        .eq('is_active', true)

      // Apply filters
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`
        query = query.or(
          `quote_number.ilike.${searchTerm},customer_name.ilike.${searchTerm},customer_company.ilike.${searchTerm}`
        )
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters?.customerName) {
        query = query.ilike('customer_name', `%${filters.customerName}%`)
      }

      if (filters?.customerCompany) {
        query = query.ilike('customer_company', `%${filters.customerCompany}%`)
      }

      if (filters?.pickupState) {
        query = query.eq('pickup_state', filters.pickupState)
      }

      if (filters?.dropoffState) {
        query = query.eq('dropoff_state', filters.dropoffState)
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString())
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString())
      }

      if (filters?.companyId) {
        query = query.eq('company_id', filters.companyId)
      }

      // Apply sorting
      const sortColumn = sortBy === 'quoteNumber' ? 'quote_number' :
                         sortBy === 'createdAt' ? 'created_at' :
                         sortBy === 'updatedAt' ? 'updated_at' :
                         sortBy === 'customerName' ? 'customer_name' :
                         sortBy === 'totalCents' ? 'total_cents' :
                         sortBy
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

      // Apply pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      checkSupabaseError(error, 'Load planner quotes')

      // Transform data
      const quotes: LoadPlannerQuoteListItem[] = (data || []).map((row: any) => ({
        id: row.id,
        quoteNumber: row.quote_number,
        status: row.status as LoadPlannerQuoteStatus,
        customerName: row.customer_name,
        customerCompany: row.customer_company,
        pickupCity: row.pickup_city,
        pickupState: row.pickup_state,
        dropoffCity: row.dropoff_city,
        dropoffState: row.dropoff_state,
        totalCents: row.total_cents,
        carrierRateCents: row.carrier_rate_cents,
        carrierId: row.carrier_id,
        carrierName: row.carriers?.company_name ?? null,
        trucksCount: row.load_planner_trucks?.[0]?.count ?? 0,
        cargoItemsCount: row.load_planner_cargo_items?.[0]?.count ?? 0,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }))

      return {
        data: quotes,
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      }
    }),

  /**
   * Get a single quote by ID with all related data
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Fetch quote
      const { data: quoteData, error: quoteError } = await ctx.supabase
        .from('load_planner_quotes')
        .select('*')
        .eq('id', input.id)
        .eq('is_active', true)
        .single()

      checkSupabaseError(quoteError, 'Load planner quote')

      if (!quoteData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        })
      }

      // Fetch related data in parallel
      const [cargoResult, trucksResult, servicesResult, accessorialsResult, permitsResult] =
        await Promise.all([
          ctx.supabase
            .from('load_planner_cargo_items')
            .select('*')
            .eq('quote_id', input.id)
            .order('sort_order'),
          ctx.supabase
            .from('load_planner_trucks')
            .select('*')
            .eq('quote_id', input.id)
            .order('truck_index'),
          ctx.supabase
            .from('load_planner_service_items')
            .select('*')
            .eq('quote_id', input.id)
            .order('sort_order'),
          ctx.supabase
            .from('load_planner_accessorials')
            .select('*')
            .eq('quote_id', input.id)
            .order('sort_order'),
          ctx.supabase
            .from('load_planner_permits')
            .select('*')
            .eq('quote_id', input.id)
            .order('state_code'),
        ])

      // Transform and return
      const quote = quoteRowToQuote(quoteData as LoadPlannerQuoteRow)
      quote.cargoItems = (cargoResult.data || []).map((row: LoadPlannerCargoItemRow) =>
        cargoItemRowToItem(row)
      )
      quote.trucks = (trucksResult.data || []).map((row: LoadPlannerTruckRow) =>
        truckRowToTruck(row)
      )
      quote.serviceItems = (servicesResult.data || []).map((row: LoadPlannerServiceItemRow) =>
        serviceItemRowToItem(row)
      )
      quote.accessorials = (accessorialsResult.data || []).map((row: LoadPlannerAccessorialRow) =>
        accessorialRowToItem(row)
      )
      quote.permits = (permitsResult.data || []).map((row: LoadPlannerPermitRow) =>
        permitRowToPermit(row)
      )

      return quote
    }),

  /**
   * Create a new quote
   */
  create: protectedProcedure.input(createQuoteInputSchema).mutation(async ({ ctx, input }) => {
    const { cargoItems, trucks, serviceItems, accessorials, permits, ...quoteData } = input

    // Generate quote number
    const quoteNumber = await generateQuoteNumber(ctx.supabase)

    // Prepare quote data
    const quoteInsert = {
      quote_number: quoteNumber,
      status: 'draft' as LoadPlannerQuoteStatus,
      customer_name: quoteData.customerName || null,
      customer_email: quoteData.customerEmail || null,
      customer_phone: quoteData.customerPhone || null,
      customer_company: quoteData.customerCompany || null,
      company_id: quoteData.companyId || null,
      contact_id: quoteData.contactId || null,
      customer_address_line1: quoteData.customerAddressLine1 || null,
      customer_address_city: quoteData.customerAddressCity || null,
      customer_address_state: quoteData.customerAddressState || null,
      customer_address_zip: quoteData.customerAddressZip || null,
      pickup_address: quoteData.pickupAddress || null,
      pickup_city: quoteData.pickupCity || null,
      pickup_state: quoteData.pickupState || null,
      pickup_zip: quoteData.pickupZip || null,
      pickup_lat: quoteData.pickupLat || null,
      pickup_lng: quoteData.pickupLng || null,
      dropoff_address: quoteData.dropoffAddress || null,
      dropoff_city: quoteData.dropoffCity || null,
      dropoff_state: quoteData.dropoffState || null,
      dropoff_zip: quoteData.dropoffZip || null,
      dropoff_lat: quoteData.dropoffLat || null,
      dropoff_lng: quoteData.dropoffLng || null,
      distance_miles: quoteData.distanceMiles || null,
      duration_minutes: quoteData.durationMinutes || null,
      route_polyline: quoteData.routePolyline || null,
      subtotal_cents: quoteData.subtotalCents || null,
      total_cents: quoteData.totalCents || null,
      internal_notes: quoteData.internalNotes || null,
      quote_notes: quoteData.quoteNotes || null,
      created_by: ctx.user.id,
    }

    // Insert quote
    const { data: newQuote, error: quoteError } = await ctx.supabase
      .from('load_planner_quotes')
      .insert(quoteInsert)
      .select()
      .single()

    checkSupabaseError(quoteError, 'Load planner quote')

    const quoteId = newQuote.id

    // Insert related data
    const insertPromises: PromiseLike<any>[] = []

    if (cargoItems && cargoItems.length > 0) {
      const cargoInserts = cargoItems.map((item, index) => ({
        quote_id: quoteId,
        sku: item.sku || null,
        description: item.description,
        quantity: item.quantity ?? 1,
        length_in: item.lengthIn || null,
        width_in: item.widthIn || null,
        height_in: item.heightIn || null,
        weight_lbs: item.weightLbs || null,
        stackable: item.stackable ?? false,
        bottom_only: item.bottomOnly ?? false,
        max_layers: item.maxLayers || null,
        fragile: item.fragile ?? false,
        hazmat: item.hazmat ?? false,
        notes: item.notes || null,
        orientation: item.orientation ?? 1,
        geometry: item.geometry ?? 'box',
        equipment_make_id: item.equipmentMakeId || null,
        equipment_model_id: item.equipmentModelId || null,
        dimensions_source: item.dimensionsSource || null,
        image_url: item.imageUrl || null,
        image_url_2: item.imageUrl2 || null,
        front_image_url: item.frontImageUrl || null,
        side_image_url: item.sideImageUrl || null,
        assigned_truck_index: item.assignedTruckIndex ?? null,
        placement_x: item.placementX || null,
        placement_y: item.placementY || null,
        placement_z: item.placementZ || null,
        placement_rotation: item.placementRotation || null,
        sort_order: item.sortOrder ?? index,
      }))
      insertPromises.push(
        ctx.supabase.from('load_planner_cargo_items').insert(cargoInserts).then(r => r)
      )
    }

    if (trucks && trucks.length > 0) {
      const truckInserts = trucks.map((truck) => ({
        quote_id: quoteId,
        truck_index: truck.truckIndex,
        truck_type_id: truck.truckTypeId,
        truck_name: truck.truckName || null,
        truck_category: truck.truckCategory || null,
        deck_length_ft: truck.deckLengthFt || null,
        deck_width_ft: truck.deckWidthFt || null,
        deck_height_ft: truck.deckHeightFt || null,
        well_length_ft: truck.wellLengthFt || null,
        max_cargo_weight_lbs: truck.maxCargoWeightLbs || null,
        total_weight_lbs: truck.totalWeightLbs || null,
        total_items: truck.totalItems || null,
        is_legal: truck.isLegal ?? true,
        permits_required: truck.permitsRequired || null,
        warnings: truck.warnings || null,
        truck_score: truck.truckScore || null,
      }))
      insertPromises.push(ctx.supabase.from('load_planner_trucks').insert(truckInserts).then(r => r))
    }

    if (serviceItems && serviceItems.length > 0) {
      const serviceInserts = serviceItems.map((item, index) => ({
        quote_id: quoteId,
        service_type_id: item.serviceTypeId || null,
        name: item.name,
        rate_cents: item.rateCents,
        quantity: item.quantity ?? 1,
        total_cents: item.totalCents,
        truck_index: item.truckIndex ?? null,
        sort_order: item.sortOrder ?? index,
      }))
      insertPromises.push(
        ctx.supabase.from('load_planner_service_items').insert(serviceInserts).then(r => r)
      )
    }

    if (accessorials && accessorials.length > 0) {
      const accessorialInserts = accessorials.map((item, index) => ({
        quote_id: quoteId,
        accessorial_type_id: item.accessorialTypeId || null,
        name: item.name,
        billing_unit: item.billingUnit,
        rate_cents: item.rateCents,
        quantity: item.quantity ?? 1,
        total_cents: item.totalCents,
        notes: item.notes || null,
        sort_order: item.sortOrder ?? index,
      }))
      insertPromises.push(
        ctx.supabase.from('load_planner_accessorials').insert(accessorialInserts).then(r => r)
      )
    }

    if (permits && permits.length > 0) {
      const permitInserts = permits.map((permit) => ({
        quote_id: quoteId,
        state_code: permit.stateCode,
        state_name: permit.stateName || null,
        calculated_permit_fee_cents: permit.calculatedPermitFeeCents || null,
        calculated_escort_cost_cents: permit.calculatedEscortCostCents || null,
        permit_fee_cents: permit.permitFeeCents || null,
        escort_cost_cents: permit.escortCostCents || null,
        distance_miles: permit.distanceMiles || null,
        escort_count: permit.escortCount || null,
        pole_car_required: permit.poleCarRequired ?? false,
        notes: permit.notes || null,
      }))
      insertPromises.push(ctx.supabase.from('load_planner_permits').insert(permitInserts).then(r => r))
    }

    // Wait for all inserts
    await Promise.all(insertPromises)

    // Log activity
    await ctx.adminSupabase.from('activity_logs').insert({
      user_id: ctx.user.id,
      activity_type: 'quote_created',
      subject: `Load Planner quote ${quoteNumber} created`,
      description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} created Load Planner quote ${quoteNumber}`.trim(),
      metadata: {
        quote_id: quoteId,
        quote_number: quoteNumber,
        quote_type: 'load_planner',
      },
    })

    return {
      id: quoteId,
      quoteNumber,
    }
  }),

  /**
   * Update an existing quote
   */
  update: protectedProcedure
    .input(
      createQuoteInputSchema.extend({
        id: z.string().uuid(),
        status: quoteStatusSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, cargoItems, trucks, serviceItems, accessorials, permits, status, ...quoteData } =
        input

      // Verify quote exists
      const { data: existing, error: existingError } = await ctx.supabase
        .from('load_planner_quotes')
        .select('id, quote_number')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      checkSupabaseError(existingError, 'Load planner quote')

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        })
      }

      // Update quote
      const quoteUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      if (status !== undefined) quoteUpdate.status = status
      if (quoteData.customerName !== undefined) quoteUpdate.customer_name = quoteData.customerName
      if (quoteData.customerEmail !== undefined) quoteUpdate.customer_email = quoteData.customerEmail
      if (quoteData.customerPhone !== undefined) quoteUpdate.customer_phone = quoteData.customerPhone
      if (quoteData.customerCompany !== undefined) quoteUpdate.customer_company = quoteData.customerCompany
      if (quoteData.companyId !== undefined) quoteUpdate.company_id = quoteData.companyId
      if (quoteData.contactId !== undefined) quoteUpdate.contact_id = quoteData.contactId
      if (quoteData.customerAddressLine1 !== undefined) quoteUpdate.customer_address_line1 = quoteData.customerAddressLine1
      if (quoteData.customerAddressCity !== undefined) quoteUpdate.customer_address_city = quoteData.customerAddressCity
      if (quoteData.customerAddressState !== undefined) quoteUpdate.customer_address_state = quoteData.customerAddressState
      if (quoteData.customerAddressZip !== undefined) quoteUpdate.customer_address_zip = quoteData.customerAddressZip
      if (quoteData.pickupAddress !== undefined) quoteUpdate.pickup_address = quoteData.pickupAddress
      if (quoteData.pickupCity !== undefined) quoteUpdate.pickup_city = quoteData.pickupCity
      if (quoteData.pickupState !== undefined) quoteUpdate.pickup_state = quoteData.pickupState
      if (quoteData.pickupZip !== undefined) quoteUpdate.pickup_zip = quoteData.pickupZip
      if (quoteData.pickupLat !== undefined) quoteUpdate.pickup_lat = quoteData.pickupLat
      if (quoteData.pickupLng !== undefined) quoteUpdate.pickup_lng = quoteData.pickupLng
      if (quoteData.dropoffAddress !== undefined) quoteUpdate.dropoff_address = quoteData.dropoffAddress
      if (quoteData.dropoffCity !== undefined) quoteUpdate.dropoff_city = quoteData.dropoffCity
      if (quoteData.dropoffState !== undefined) quoteUpdate.dropoff_state = quoteData.dropoffState
      if (quoteData.dropoffZip !== undefined) quoteUpdate.dropoff_zip = quoteData.dropoffZip
      if (quoteData.dropoffLat !== undefined) quoteUpdate.dropoff_lat = quoteData.dropoffLat
      if (quoteData.dropoffLng !== undefined) quoteUpdate.dropoff_lng = quoteData.dropoffLng
      if (quoteData.distanceMiles !== undefined) quoteUpdate.distance_miles = quoteData.distanceMiles
      if (quoteData.durationMinutes !== undefined) quoteUpdate.duration_minutes = quoteData.durationMinutes
      if (quoteData.routePolyline !== undefined) quoteUpdate.route_polyline = quoteData.routePolyline
      if (quoteData.subtotalCents !== undefined) quoteUpdate.subtotal_cents = quoteData.subtotalCents
      if (quoteData.totalCents !== undefined) quoteUpdate.total_cents = quoteData.totalCents
      if (quoteData.internalNotes !== undefined) quoteUpdate.internal_notes = quoteData.internalNotes
      if (quoteData.quoteNotes !== undefined) quoteUpdate.quote_notes = quoteData.quoteNotes

      const { error: updateError } = await ctx.supabase
        .from('load_planner_quotes')
        .update(quoteUpdate)
        .eq('id', id)

      checkSupabaseError(updateError, 'Load planner quote')

      // Update related data using upsert pattern (preserves IDs and created_at)
      await upsertRelatedItems(ctx.supabase, 'load_planner_cargo_items', id, cargoItems, (item, quoteId, index) => ({
        id: item.id,
        quote_id: quoteId,
        sku: item.sku || null,
        description: item.description,
        quantity: item.quantity ?? 1,
        length_in: item.lengthIn || null,
        width_in: item.widthIn || null,
        height_in: item.heightIn || null,
        weight_lbs: item.weightLbs || null,
        stackable: item.stackable ?? false,
        bottom_only: item.bottomOnly ?? false,
        max_layers: item.maxLayers || null,
        fragile: item.fragile ?? false,
        hazmat: item.hazmat ?? false,
        notes: item.notes || null,
        orientation: item.orientation ?? 1,
        geometry: item.geometry ?? 'box',
        equipment_make_id: item.equipmentMakeId || null,
        equipment_model_id: item.equipmentModelId || null,
        dimensions_source: item.dimensionsSource || null,
        image_url: item.imageUrl || null,
        image_url_2: item.imageUrl2 || null,
        front_image_url: item.frontImageUrl || null,
        side_image_url: item.sideImageUrl || null,
        assigned_truck_index: item.assignedTruckIndex ?? null,
        placement_x: item.placementX || null,
        placement_y: item.placementY || null,
        placement_z: item.placementZ || null,
        placement_rotation: item.placementRotation || null,
        sort_order: item.sortOrder ?? index,
      }))

      await upsertRelatedItems(ctx.supabase, 'load_planner_trucks', id, trucks, (truck, quoteId) => ({
        id: truck.id,
        quote_id: quoteId,
        truck_index: truck.truckIndex,
        truck_type_id: truck.truckTypeId,
        truck_name: truck.truckName || null,
        truck_category: truck.truckCategory || null,
        deck_length_ft: truck.deckLengthFt || null,
        deck_width_ft: truck.deckWidthFt || null,
        deck_height_ft: truck.deckHeightFt || null,
        well_length_ft: truck.wellLengthFt || null,
        max_cargo_weight_lbs: truck.maxCargoWeightLbs || null,
        total_weight_lbs: truck.totalWeightLbs || null,
        total_items: truck.totalItems || null,
        is_legal: truck.isLegal ?? true,
        permits_required: truck.permitsRequired || null,
        warnings: truck.warnings || null,
        truck_score: truck.truckScore || null,
      }))

      await upsertRelatedItems(ctx.supabase, 'load_planner_service_items', id, serviceItems, (item, quoteId, index) => ({
        id: item.id,
        quote_id: quoteId,
        service_type_id: item.serviceTypeId || null,
        name: item.name,
        rate_cents: item.rateCents,
        quantity: item.quantity ?? 1,
        total_cents: item.totalCents,
        truck_index: item.truckIndex ?? null,
        sort_order: item.sortOrder ?? index,
      }))

      await upsertRelatedItems(ctx.supabase, 'load_planner_accessorials', id, accessorials, (item, quoteId, index) => ({
        id: item.id,
        quote_id: quoteId,
        accessorial_type_id: item.accessorialTypeId || null,
        name: item.name,
        billing_unit: item.billingUnit,
        rate_cents: item.rateCents,
        quantity: item.quantity ?? 1,
        total_cents: item.totalCents,
        notes: item.notes || null,
        sort_order: item.sortOrder ?? index,
      }))

      await upsertRelatedItems(ctx.supabase, 'load_planner_permits', id, permits, (permit, quoteId) => ({
        id: permit.id,
        quote_id: quoteId,
        state_code: permit.stateCode,
        state_name: permit.stateName || null,
        calculated_permit_fee_cents: permit.calculatedPermitFeeCents || null,
        calculated_escort_cost_cents: permit.calculatedEscortCostCents || null,
        permit_fee_cents: permit.permitFeeCents || null,
        escort_cost_cents: permit.escortCostCents || null,
        distance_miles: permit.distanceMiles || null,
        escort_count: permit.escortCount || null,
        pole_car_required: permit.poleCarRequired ?? false,
        notes: permit.notes || null,
      }))

      // Log activity
      await ctx.adminSupabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        activity_type: 'quote_updated',
        subject: `Load Planner quote ${existing.quote_number} updated`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} updated Load Planner quote ${existing.quote_number}`.trim(),
        metadata: {
          quote_id: id,
          quote_number: existing.quote_number,
          quote_type: 'load_planner',
        },
      })

      return { success: true }
    }),

  /**
   * Soft delete a quote
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get quote info for logging
      const { data: quote, error: fetchError } = await ctx.supabase
        .from('load_planner_quotes')
        .select('quote_number')
        .eq('id', input.id)
        .single()

      checkSupabaseError(fetchError, 'Load planner quote')

      // Soft delete
      const { error } = await ctx.supabase
        .from('load_planner_quotes')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', input.id)

      checkSupabaseError(error, 'Load planner quote')

      // Log activity
      if (quote) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'quote_deleted',
          subject: `Load Planner quote ${quote.quote_number} deleted`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} deleted Load Planner quote ${quote.quote_number}`.trim(),
          metadata: {
            quote_id: input.id,
            quote_number: quote.quote_number,
            quote_type: 'load_planner',
          },
        })
      }

      return { success: true }
    }),

  /**
   * Duplicate a quote
   */
  duplicate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch original quote with all related data
      const { data: original, error: fetchError } = await ctx.supabase
        .from('load_planner_quotes')
        .select('*')
        .eq('id', input.id)
        .eq('is_active', true)
        .single()

      checkSupabaseError(fetchError, 'Load planner quote')

      if (!original) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        })
      }

      // Fetch related data
      const [cargoResult, trucksResult, servicesResult, accessorialsResult, permitsResult] =
        await Promise.all([
          ctx.supabase.from('load_planner_cargo_items').select('*').eq('quote_id', input.id),
          ctx.supabase.from('load_planner_trucks').select('*').eq('quote_id', input.id),
          ctx.supabase.from('load_planner_service_items').select('*').eq('quote_id', input.id),
          ctx.supabase.from('load_planner_accessorials').select('*').eq('quote_id', input.id),
          ctx.supabase.from('load_planner_permits').select('*').eq('quote_id', input.id),
        ])

      // Generate new quote number
      const newQuoteNumber = await generateQuoteNumber(ctx.supabase)

      // Create new quote
      const { id: originalId, quote_number, created_at, updated_at, public_token, sent_at, viewed_at, ...quoteFields } = original

      const { data: newQuote, error: insertError } = await ctx.supabase
        .from('load_planner_quotes')
        .insert({
          ...quoteFields,
          quote_number: newQuoteNumber,
          status: 'draft',
          created_by: ctx.user.id,
        })
        .select()
        .single()

      checkSupabaseError(insertError, 'Load planner quote')

      const newQuoteId = newQuote.id

      // Duplicate related data
      const duplicatePromises: PromiseLike<any>[] = []

      if (cargoResult.data && cargoResult.data.length > 0) {
        const cargoInserts = cargoResult.data.map(({ id, quote_id, created_at, ...item }) => ({
          ...item,
          quote_id: newQuoteId,
        }))
        duplicatePromises.push(ctx.supabase.from('load_planner_cargo_items').insert(cargoInserts).then(r => r))
      }

      if (trucksResult.data && trucksResult.data.length > 0) {
        const truckInserts = trucksResult.data.map(({ id, quote_id, created_at, ...item }) => ({
          ...item,
          quote_id: newQuoteId,
        }))
        duplicatePromises.push(ctx.supabase.from('load_planner_trucks').insert(truckInserts).then(r => r))
      }

      if (servicesResult.data && servicesResult.data.length > 0) {
        const serviceInserts = servicesResult.data.map(({ id, quote_id, created_at, ...item }) => ({
          ...item,
          quote_id: newQuoteId,
        }))
        duplicatePromises.push(ctx.supabase.from('load_planner_service_items').insert(serviceInserts).then(r => r))
      }

      if (accessorialsResult.data && accessorialsResult.data.length > 0) {
        const accessorialInserts = accessorialsResult.data.map(({ id, quote_id, created_at, ...item }) => ({
          ...item,
          quote_id: newQuoteId,
        }))
        duplicatePromises.push(ctx.supabase.from('load_planner_accessorials').insert(accessorialInserts).then(r => r))
      }

      if (permitsResult.data && permitsResult.data.length > 0) {
        const permitInserts = permitsResult.data.map(({ id, quote_id, created_at, ...item }) => ({
          ...item,
          quote_id: newQuoteId,
        }))
        duplicatePromises.push(ctx.supabase.from('load_planner_permits').insert(permitInserts).then(r => r))
      }

      await Promise.all(duplicatePromises)

      // Log activity
      await ctx.adminSupabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        activity_type: 'quote_duplicated',
        subject: `Load Planner quote ${newQuoteNumber} created from ${original.quote_number}`,
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} duplicated Load Planner quote ${original.quote_number} to ${newQuoteNumber}`.trim(),
        metadata: {
          original_quote_id: input.id,
          original_quote_number: original.quote_number,
          new_quote_id: newQuoteId,
          new_quote_number: newQuoteNumber,
          quote_type: 'load_planner',
        },
      })

      return {
        id: newQuoteId,
        quoteNumber: newQuoteNumber,
      }
    }),

  /**
   * Update quote status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: quoteStatusSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, any> = {
        status: input.status,
        updated_at: new Date().toISOString(),
      }

      // Set sent_at if marking as sent
      if (input.status === 'sent') {
        updateData.sent_at = new Date().toISOString()
      }

      // Set viewed_at if marking as viewed
      if (input.status === 'viewed') {
        updateData.viewed_at = new Date().toISOString()
      }

      const { data, error } = await ctx.supabase
        .from('load_planner_quotes')
        .update(updateData)
        .eq('id', input.id)
        .eq('is_active', true)
        .select('quote_number')
        .single()

      checkSupabaseError(error, 'Load planner quote')

      // Log activity
      if (data) {
        await ctx.adminSupabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'quote_status_changed',
          subject: `Load Planner quote ${data.quote_number} status changed to ${input.status}`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} changed Load Planner quote ${data.quote_number} status to ${input.status}`.trim(),
          metadata: {
            quote_id: input.id,
            quote_number: data.quote_number,
            new_status: input.status,
            quote_type: 'load_planner',
          },
        })
      }

      return { success: true }
    }),

  /**
   * Get quote by public token (for public viewing)
   */
  getByPublicToken: protectedProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('load_planner_quotes')
        .select('*')
        .eq('public_token', input.token)
        .eq('is_active', true)
        .single()

      checkSupabaseError(error, 'Load planner quote')

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        })
      }

      return quoteRowToQuote(data as LoadPlannerQuoteRow)
    }),

  /**
   * Get summary stats for dashboard
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('load_planner_quotes')
      .select('status')
      .eq('is_active', true)

    checkSupabaseError(error, 'Load planner quotes')

    const stats = {
      total: 0,
      draft: 0,
      sent: 0,
      viewed: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
    }

    for (const row of data || []) {
      stats.total++
      const status = row.status as LoadPlannerQuoteStatus
      if (status in stats) {
        stats[status]++
      }
    }

    return stats
  }),
})
