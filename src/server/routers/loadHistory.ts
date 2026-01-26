/**
 * Load History Router
 *
 * tRPC router for managing completed loads with margin tracking
 * and business intelligence queries.
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'
import { TRPCError } from '@trpc/server'
import type {
  LoadHistoryStatus,
  EquipmentType,
  LoadHistory,
  LoadHistoryListItem,
  LoadHistoryDetail,
  LoadHistoryStats,
  LaneStats,
  CarrierPerformanceStats,
  SimilarLoad,
} from '@/types/load-history'

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const loadStatusSchema = z.enum(['booked', 'in_transit', 'delivered', 'completed', 'cancelled'])

const equipmentTypeSchema = z.enum([
  'flatbed',
  'step_deck',
  'rgn',
  'lowboy',
  'double_drop',
  'hotshot',
  'conestoga',
  'dry_van',
  'reefer',
  'power_only',
  'other',
])

// Create input schema
const createLoadHistorySchema = z.object({
  // Quote links
  loadPlannerQuoteId: z.string().uuid().optional(),
  inlandQuoteId: z.string().uuid().optional(),
  quoteNumber: z.string().optional(),

  // Customer
  customerName: z.string().optional(),
  customerCompany: z.string().optional(),

  // Carrier assignment
  carrierId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  truckId: z.string().uuid().optional(),

  // Route (required)
  originCity: z.string().min(1),
  originState: z.string().min(1).max(50),
  originZip: z.string().optional(),
  destinationCity: z.string().min(1),
  destinationState: z.string().min(1).max(50),
  destinationZip: z.string().optional(),
  totalMiles: z.number().int().positive().optional(),

  // Cargo
  cargoDescription: z.string().optional(),
  cargoPieces: z.number().int().positive().optional(),
  cargoLengthIn: z.number().int().positive().optional(),
  cargoWidthIn: z.number().int().positive().optional(),
  cargoHeightIn: z.number().int().positive().optional(),
  cargoWeightLbs: z.number().int().positive().optional(),
  isOversize: z.boolean().default(false),
  isOverweight: z.boolean().default(false),
  equipmentTypeUsed: equipmentTypeSchema.optional(),

  // Financials (in cents)
  customerRateCents: z.number().int().min(0).optional(),
  carrierRateCents: z.number().int().min(0).optional(),

  // Dates
  quoteDate: z.string().optional(),
  bookedDate: z.string().optional(),
  pickupDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  invoiceDate: z.string().optional(),
  paidDate: z.string().optional(),

  // Status
  status: loadStatusSchema.default('completed'),

  // Notes
  notes: z.string().optional(),
})

const updateLoadHistorySchema = createLoadHistorySchema.partial().extend({
  id: z.string().uuid(),
})

// Filter schema
const filterSchema = z.object({
  search: z.string().optional(),
  status: loadStatusSchema.optional(),
  carrierId: z.string().uuid().optional(),
  originState: z.string().optional(),
  destinationState: z.string().optional(),
  equipmentType: equipmentTypeSchema.optional(),
  isOversize: z.boolean().optional(),
  isOverweight: z.boolean().optional(),
  minMarginPercentage: z.number().optional(),
  maxMarginPercentage: z.number().optional(),
  pickupDateFrom: z.string().optional(),
  pickupDateTo: z.string().optional(),
  deliveryDateFrom: z.string().optional(),
  deliveryDateTo: z.string().optional(),
})

// Pagination schema
const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
  sortBy: z
    .enum(['pickupDate', 'deliveryDate', 'customerRateCents', 'marginPercentage', 'createdAt'])
    .default('pickupDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Similar loads query schema
const similarLoadsSchema = z.object({
  originState: z.string().min(1),
  destinationState: z.string().min(1),
  cargoLengthIn: z.number().int().positive().optional(),
  cargoWidthIn: z.number().int().positive().optional(),
  cargoHeightIn: z.number().int().positive().optional(),
  equipmentType: equipmentTypeSchema.optional(),
  monthsBack: z.number().int().positive().default(6),
  limit: z.number().int().positive().max(50).default(10),
})

// =============================================================================
// ROW TO TYPE CONVERTERS
// =============================================================================

interface LoadHistoryRow {
  id: string
  load_planner_quote_id: string | null
  inland_quote_id: string | null
  quote_number: string | null
  customer_name: string | null
  customer_company: string | null
  carrier_id: string | null
  driver_id: string | null
  truck_id: string | null
  origin_city: string
  origin_state: string
  origin_zip: string | null
  destination_city: string
  destination_state: string
  destination_zip: string | null
  total_miles: number | null
  cargo_description: string | null
  cargo_pieces: number | null
  cargo_length_in: number | null
  cargo_width_in: number | null
  cargo_height_in: number | null
  cargo_weight_lbs: number | null
  is_oversize: boolean
  is_overweight: boolean
  equipment_type_used: string | null
  customer_rate_cents: number | null
  carrier_rate_cents: number | null
  margin_cents: number | null
  margin_percentage: number | null
  rate_per_mile_customer_cents: number | null
  rate_per_mile_carrier_cents: number | null
  quote_date: string | null
  booked_date: string | null
  pickup_date: string | null
  delivery_date: string | null
  invoice_date: string | null
  paid_date: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

function rowToLoadHistory(row: LoadHistoryRow): LoadHistory {
  return {
    id: row.id,
    loadPlannerQuoteId: row.load_planner_quote_id,
    inlandQuoteId: row.inland_quote_id,
    quoteNumber: row.quote_number,
    customerName: row.customer_name,
    customerCompany: row.customer_company,
    carrierId: row.carrier_id,
    driverId: row.driver_id,
    truckId: row.truck_id,
    originCity: row.origin_city,
    originState: row.origin_state,
    originZip: row.origin_zip,
    destinationCity: row.destination_city,
    destinationState: row.destination_state,
    destinationZip: row.destination_zip,
    totalMiles: row.total_miles,
    cargoDescription: row.cargo_description,
    cargoPieces: row.cargo_pieces,
    cargoLengthIn: row.cargo_length_in,
    cargoWidthIn: row.cargo_width_in,
    cargoHeightIn: row.cargo_height_in,
    cargoWeightLbs: row.cargo_weight_lbs,
    isOversize: row.is_oversize,
    isOverweight: row.is_overweight,
    equipmentTypeUsed: row.equipment_type_used as EquipmentType | null,
    customerRateCents: row.customer_rate_cents,
    carrierRateCents: row.carrier_rate_cents,
    marginCents: row.margin_cents,
    marginPercentage: row.margin_percentage,
    ratePerMileCustomerCents: row.rate_per_mile_customer_cents,
    ratePerMileCarrierCents: row.rate_per_mile_carrier_cents,
    quoteDate: row.quote_date ? new Date(row.quote_date) : null,
    bookedDate: row.booked_date ? new Date(row.booked_date) : null,
    pickupDate: row.pickup_date ? new Date(row.pickup_date) : null,
    deliveryDate: row.delivery_date ? new Date(row.delivery_date) : null,
    invoiceDate: row.invoice_date ? new Date(row.invoice_date) : null,
    paidDate: row.paid_date ? new Date(row.paid_date) : null,
    status: row.status as LoadHistoryStatus,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// Sort field mapping
const sortFieldMap: Record<string, string> = {
  pickupDate: 'pickup_date',
  deliveryDate: 'delivery_date',
  customerRateCents: 'customer_rate_cents',
  marginPercentage: 'margin_percentage',
  createdAt: 'created_at',
}

// =============================================================================
// ROUTER
// =============================================================================

export const loadHistoryRouter = router({
  // ---------------------------------------------------------------------------
  // GET ALL (with filters and pagination)
  // ---------------------------------------------------------------------------
  getAll: protectedProcedure
    .input(
      z.object({
        filters: filterSchema.optional(),
        pagination: paginationSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx
      const filters = input.filters || {}
      const pagination = input.pagination || { page: 1, pageSize: 25, sortBy: 'pickupDate', sortOrder: 'desc' }

      // Build query
      let query = supabase
        .from('load_history')
        .select(
          `
          *,
          carriers:carrier_id (id, company_name)
        `,
          { count: 'exact' }
        )

      // Apply filters
      if (filters.search) {
        query = query.or(
          `customer_name.ilike.%${filters.search}%,customer_company.ilike.%${filters.search}%,quote_number.ilike.%${filters.search}%,cargo_description.ilike.%${filters.search}%`
        )
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.carrierId) {
        query = query.eq('carrier_id', filters.carrierId)
      }

      if (filters.originState) {
        query = query.eq('origin_state', filters.originState)
      }

      if (filters.destinationState) {
        query = query.eq('destination_state', filters.destinationState)
      }

      if (filters.equipmentType) {
        query = query.eq('equipment_type_used', filters.equipmentType)
      }

      if (filters.isOversize !== undefined) {
        query = query.eq('is_oversize', filters.isOversize)
      }

      if (filters.isOverweight !== undefined) {
        query = query.eq('is_overweight', filters.isOverweight)
      }

      if (filters.minMarginPercentage !== undefined) {
        query = query.gte('margin_percentage', filters.minMarginPercentage)
      }

      if (filters.maxMarginPercentage !== undefined) {
        query = query.lte('margin_percentage', filters.maxMarginPercentage)
      }

      if (filters.pickupDateFrom) {
        query = query.gte('pickup_date', filters.pickupDateFrom)
      }

      if (filters.pickupDateTo) {
        query = query.lte('pickup_date', filters.pickupDateTo)
      }

      if (filters.deliveryDateFrom) {
        query = query.gte('delivery_date', filters.deliveryDateFrom)
      }

      if (filters.deliveryDateTo) {
        query = query.lte('delivery_date', filters.deliveryDateTo)
      }

      // Apply sorting
      const sortField = sortFieldMap[pagination.sortBy] || 'pickup_date'
      query = query.order(sortField, { ascending: pagination.sortOrder === 'asc', nullsFirst: false })

      // Apply pagination
      const from = (pagination.page - 1) * pagination.pageSize
      const to = from + pagination.pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      checkSupabaseError(error)

      // Map to list items
      const items: LoadHistoryListItem[] = (data || []).map((row: any) => ({
        id: row.id,
        quoteNumber: row.quote_number,
        customerName: row.customer_name,
        customerCompany: row.customer_company,
        carrierId: row.carrier_id,
        carrierName: row.carriers?.company_name || null,
        originCity: row.origin_city,
        originState: row.origin_state,
        destinationCity: row.destination_city,
        destinationState: row.destination_state,
        totalMiles: row.total_miles,
        cargoDescription: row.cargo_description,
        cargoPieces: row.cargo_pieces,
        cargoWeightLbs: row.cargo_weight_lbs,
        equipmentTypeUsed: row.equipment_type_used as EquipmentType | null,
        isOversize: row.is_oversize,
        isOverweight: row.is_overweight,
        customerRateCents: row.customer_rate_cents,
        carrierRateCents: row.carrier_rate_cents,
        marginCents: row.margin_cents,
        marginPercentage: row.margin_percentage,
        pickupDate: row.pickup_date ? new Date(row.pickup_date) : null,
        deliveryDate: row.delivery_date ? new Date(row.delivery_date) : null,
        status: row.status as LoadHistoryStatus,
      }))

      return {
        data: items,
        total: count || 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil((count || 0) / pagination.pageSize),
      }
    }),

  // ---------------------------------------------------------------------------
  // GET BY ID
  // ---------------------------------------------------------------------------
  getById: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const { supabase } = ctx

    const { data, error } = await supabase
      .from('load_history')
      .select(
        `
        *,
        carriers:carrier_id (
          id, company_name, carrier_type, mc_number,
          primary_contact_name, primary_contact_phone
        ),
        carrier_drivers:driver_id (
          id, first_name, last_name, phone
        ),
        carrier_trucks:truck_id (
          id, unit_number, year, make, model, category, license_plate
        )
      `
      )
      .eq('id', input.id)
      .single()

    checkSupabaseError(error)

    if (!data) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Load not found' })
    }

    const load = rowToLoadHistory(data as LoadHistoryRow)
    const detail: LoadHistoryDetail = {
      ...load,
      carrier: data.carriers
        ? {
            id: data.carriers.id,
            companyName: data.carriers.company_name,
            carrierType: data.carriers.carrier_type,
            mcNumber: data.carriers.mc_number,
            primaryContactName: data.carriers.primary_contact_name,
            primaryContactPhone: data.carriers.primary_contact_phone,
          }
        : null,
      driver: data.carrier_drivers
        ? {
            id: data.carrier_drivers.id,
            firstName: data.carrier_drivers.first_name,
            lastName: data.carrier_drivers.last_name,
            phone: data.carrier_drivers.phone,
          }
        : null,
      truck: data.carrier_trucks
        ? {
            id: data.carrier_trucks.id,
            unitNumber: data.carrier_trucks.unit_number,
            year: data.carrier_trucks.year,
            make: data.carrier_trucks.make,
            model: data.carrier_trucks.model,
            category: data.carrier_trucks.category,
            licensePlate: data.carrier_trucks.license_plate,
          }
        : null,
    }

    return detail
  }),

  // ---------------------------------------------------------------------------
  // GET BY CARRIER
  // ---------------------------------------------------------------------------
  getByCarrier: protectedProcedure
    .input(
      z.object({
        carrierId: z.string().uuid(),
        limit: z.number().int().positive().max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data, error, count } = await supabase
        .from('load_history')
        .select('*', { count: 'exact' })
        .eq('carrier_id', input.carrierId)
        .order('pickup_date', { ascending: false, nullsFirst: false })
        .limit(input.limit)

      checkSupabaseError(error)

      const items = (data || []).map((row: LoadHistoryRow) => rowToLoadHistory(row))

      return {
        data: items,
        total: count || 0,
      }
    }),

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  create: protectedProcedure.input(createLoadHistorySchema).mutation(async ({ ctx, input }) => {
    const { supabase } = ctx

    const insertData = {
      load_planner_quote_id: input.loadPlannerQuoteId,
      inland_quote_id: input.inlandQuoteId,
      quote_number: input.quoteNumber,
      customer_name: input.customerName,
      customer_company: input.customerCompany,
      carrier_id: input.carrierId,
      driver_id: input.driverId,
      truck_id: input.truckId,
      origin_city: input.originCity,
      origin_state: input.originState,
      origin_zip: input.originZip,
      destination_city: input.destinationCity,
      destination_state: input.destinationState,
      destination_zip: input.destinationZip,
      total_miles: input.totalMiles,
      cargo_description: input.cargoDescription,
      cargo_pieces: input.cargoPieces,
      cargo_length_in: input.cargoLengthIn,
      cargo_width_in: input.cargoWidthIn,
      cargo_height_in: input.cargoHeightIn,
      cargo_weight_lbs: input.cargoWeightLbs,
      is_oversize: input.isOversize,
      is_overweight: input.isOverweight,
      equipment_type_used: input.equipmentTypeUsed,
      customer_rate_cents: input.customerRateCents,
      carrier_rate_cents: input.carrierRateCents,
      quote_date: input.quoteDate,
      booked_date: input.bookedDate,
      pickup_date: input.pickupDate,
      delivery_date: input.deliveryDate,
      invoice_date: input.invoiceDate,
      paid_date: input.paidDate,
      status: input.status,
      notes: input.notes,
    }

    const { data, error } = await supabase.from('load_history').insert(insertData).select().single()

    checkSupabaseError(error)

    return rowToLoadHistory(data as LoadHistoryRow)
  }),

  // ---------------------------------------------------------------------------
  // CREATE FROM QUOTE (Record as Load)
  // ---------------------------------------------------------------------------
  createFromQuote: protectedProcedure
    .input(
      z.object({
        quoteId: z.string().uuid(),
        carrierRateCents: z.number().int().min(0).optional(),
        pickupDate: z.string().optional(),
        deliveryDate: z.string().optional(),
        status: loadStatusSchema.default('completed'),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      // Fetch the quote with cargo items
      const { data: quote, error: quoteError } = await supabase
        .from('load_planner_quotes')
        .select(
          `
          *,
          load_planner_cargo_items (*),
          load_planner_trucks (*)
        `
        )
        .eq('id', input.quoteId)
        .single()

      if (quoteError || !quote) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        })
      }

      // Calculate aggregated cargo info
      const cargoItems = quote.load_planner_cargo_items || []
      const trucks = quote.load_planner_trucks || []

      // Get largest cargo dimensions
      let maxLength = 0
      let maxWidth = 0
      let maxHeight = 0
      let totalWeight = 0
      let totalPieces = 0

      for (const item of cargoItems) {
        totalPieces += item.quantity || 1
        totalWeight += (item.weight_lbs || 0) * (item.quantity || 1)
        if (item.length_in && item.length_in > maxLength) maxLength = item.length_in
        if (item.width_in && item.width_in > maxWidth) maxWidth = item.width_in
        if (item.height_in && item.height_in > maxHeight) maxHeight = item.height_in
      }

      // Build cargo description from items
      const cargoDescription = cargoItems
        .map((item: any) => `${item.quantity || 1}x ${item.description}`)
        .join(', ')

      // Get equipment type from first truck
      const equipmentType = trucks.length > 0 ? (trucks[0].truck_category || 'flatbed').toLowerCase() : null

      // Determine if oversize/overweight from truck warnings
      let isOversize = false
      let isOverweight = false
      for (const truck of trucks) {
        const permitsRequired = truck.permits_required || []
        if (permitsRequired.some((p: string) => p.toLowerCase().includes('oversize'))) {
          isOversize = true
        }
        if (permitsRequired.some((p: string) => p.toLowerCase().includes('overweight'))) {
          isOverweight = true
        }
      }

      // Create the load history entry
      const insertData = {
        load_planner_quote_id: input.quoteId,
        quote_number: quote.quote_number,
        customer_name: quote.customer_name,
        customer_company: quote.customer_company,
        carrier_id: quote.carrier_id,
        driver_id: quote.driver_id,
        truck_id: quote.truck_id,
        origin_city: quote.pickup_city,
        origin_state: quote.pickup_state,
        origin_zip: quote.pickup_zip,
        destination_city: quote.dropoff_city,
        destination_state: quote.dropoff_state,
        destination_zip: quote.dropoff_zip,
        total_miles: quote.distance_miles,
        cargo_description: cargoDescription || null,
        cargo_pieces: totalPieces > 0 ? totalPieces : null,
        cargo_length_in: maxLength > 0 ? maxLength : null,
        cargo_width_in: maxWidth > 0 ? maxWidth : null,
        cargo_height_in: maxHeight > 0 ? maxHeight : null,
        cargo_weight_lbs: totalWeight > 0 ? totalWeight : null,
        is_oversize: isOversize,
        is_overweight: isOverweight,
        equipment_type_used: equipmentType,
        customer_rate_cents: quote.total_cents,
        carrier_rate_cents: input.carrierRateCents ?? quote.carrier_rate_cents,
        quote_date: quote.created_at,
        booked_date: new Date().toISOString().split('T')[0],
        pickup_date: input.pickupDate,
        delivery_date: input.deliveryDate,
        status: input.status,
        notes: input.notes,
      }

      const { data, error } = await supabase.from('load_history').insert(insertData).select().single()

      checkSupabaseError(error)

      return rowToLoadHistory(data as LoadHistoryRow)
    }),

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------
  update: protectedProcedure.input(updateLoadHistorySchema).mutation(async ({ ctx, input }) => {
    const { supabase } = ctx
    const { id, ...updates } = input

    const updateData: Record<string, any> = {}

    if (updates.loadPlannerQuoteId !== undefined)
      updateData.load_planner_quote_id = updates.loadPlannerQuoteId
    if (updates.inlandQuoteId !== undefined) updateData.inland_quote_id = updates.inlandQuoteId
    if (updates.quoteNumber !== undefined) updateData.quote_number = updates.quoteNumber
    if (updates.customerName !== undefined) updateData.customer_name = updates.customerName
    if (updates.customerCompany !== undefined) updateData.customer_company = updates.customerCompany
    if (updates.carrierId !== undefined) updateData.carrier_id = updates.carrierId
    if (updates.driverId !== undefined) updateData.driver_id = updates.driverId
    if (updates.truckId !== undefined) updateData.truck_id = updates.truckId
    if (updates.originCity !== undefined) updateData.origin_city = updates.originCity
    if (updates.originState !== undefined) updateData.origin_state = updates.originState
    if (updates.originZip !== undefined) updateData.origin_zip = updates.originZip
    if (updates.destinationCity !== undefined) updateData.destination_city = updates.destinationCity
    if (updates.destinationState !== undefined) updateData.destination_state = updates.destinationState
    if (updates.destinationZip !== undefined) updateData.destination_zip = updates.destinationZip
    if (updates.totalMiles !== undefined) updateData.total_miles = updates.totalMiles
    if (updates.cargoDescription !== undefined) updateData.cargo_description = updates.cargoDescription
    if (updates.cargoPieces !== undefined) updateData.cargo_pieces = updates.cargoPieces
    if (updates.cargoLengthIn !== undefined) updateData.cargo_length_in = updates.cargoLengthIn
    if (updates.cargoWidthIn !== undefined) updateData.cargo_width_in = updates.cargoWidthIn
    if (updates.cargoHeightIn !== undefined) updateData.cargo_height_in = updates.cargoHeightIn
    if (updates.cargoWeightLbs !== undefined) updateData.cargo_weight_lbs = updates.cargoWeightLbs
    if (updates.isOversize !== undefined) updateData.is_oversize = updates.isOversize
    if (updates.isOverweight !== undefined) updateData.is_overweight = updates.isOverweight
    if (updates.equipmentTypeUsed !== undefined) updateData.equipment_type_used = updates.equipmentTypeUsed
    if (updates.customerRateCents !== undefined) updateData.customer_rate_cents = updates.customerRateCents
    if (updates.carrierRateCents !== undefined) updateData.carrier_rate_cents = updates.carrierRateCents
    if (updates.quoteDate !== undefined) updateData.quote_date = updates.quoteDate
    if (updates.bookedDate !== undefined) updateData.booked_date = updates.bookedDate
    if (updates.pickupDate !== undefined) updateData.pickup_date = updates.pickupDate
    if (updates.deliveryDate !== undefined) updateData.delivery_date = updates.deliveryDate
    if (updates.invoiceDate !== undefined) updateData.invoice_date = updates.invoiceDate
    if (updates.paidDate !== undefined) updateData.paid_date = updates.paidDate
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.notes !== undefined) updateData.notes = updates.notes

    if (Object.keys(updateData).length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' })
    }

    const { data, error } = await supabase
      .from('load_history')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    checkSupabaseError(error)

    return rowToLoadHistory(data as LoadHistoryRow)
  }),

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------
  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const { supabase } = ctx

    const { error } = await supabase.from('load_history').delete().eq('id', input.id)

    checkSupabaseError(error)

    return { success: true }
  }),

  // ---------------------------------------------------------------------------
  // GET SIMILAR LOADS (for pricing reference)
  // ---------------------------------------------------------------------------
  getSimilarLoads: protectedProcedure.input(similarLoadsSchema).query(async ({ ctx, input }) => {
    const { supabase } = ctx

    let query = supabase
      .from('load_history')
      .select(
        `
        id,
        pickup_date,
        origin_city,
        origin_state,
        destination_city,
        destination_state,
        cargo_length_in,
        cargo_width_in,
        cargo_height_in,
        cargo_weight_lbs,
        equipment_type_used,
        customer_rate_cents,
        carrier_rate_cents,
        margin_percentage
      `
      )
      .eq('origin_state', input.originState)
      .eq('destination_state', input.destinationState)
      .gte('pickup_date', new Date(Date.now() - input.monthsBack * 30 * 24 * 60 * 60 * 1000).toISOString())

    // Filter by similar dimensions (within 20%)
    if (input.cargoLengthIn) {
      query = query
        .gte('cargo_length_in', Math.floor(input.cargoLengthIn * 0.8))
        .lte('cargo_length_in', Math.ceil(input.cargoLengthIn * 1.2))
    }

    if (input.cargoWidthIn) {
      query = query
        .gte('cargo_width_in', Math.floor(input.cargoWidthIn * 0.8))
        .lte('cargo_width_in', Math.ceil(input.cargoWidthIn * 1.2))
    }

    if (input.cargoHeightIn) {
      query = query
        .gte('cargo_height_in', Math.floor(input.cargoHeightIn * 0.8))
        .lte('cargo_height_in', Math.ceil(input.cargoHeightIn * 1.2))
    }

    if (input.equipmentType) {
      query = query.eq('equipment_type_used', input.equipmentType)
    }

    query = query.order('pickup_date', { ascending: false }).limit(input.limit)

    const { data, error } = await query

    checkSupabaseError(error)

    const similarLoads: SimilarLoad[] = (data || []).map((row: any) => ({
      id: row.id,
      pickupDate: row.pickup_date ? new Date(row.pickup_date) : null,
      origin: `${row.origin_city}, ${row.origin_state}`,
      destination: `${row.destination_city}, ${row.destination_state}`,
      dimensions:
        row.cargo_length_in && row.cargo_width_in && row.cargo_height_in
          ? `${row.cargo_length_in}"L x ${row.cargo_width_in}"W x ${row.cargo_height_in}"H`
          : null,
      cargoWeightLbs: row.cargo_weight_lbs,
      equipmentTypeUsed: row.equipment_type_used as EquipmentType | null,
      customerRateCents: row.customer_rate_cents,
      carrierRateCents: row.carrier_rate_cents,
      marginPercentage: row.margin_percentage,
    }))

    return similarLoads
  }),

  // ---------------------------------------------------------------------------
  // GET STATS
  // ---------------------------------------------------------------------------
  getStats: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      let query = supabase.from('load_history').select(
        `
          customer_rate_cents,
          carrier_rate_cents,
          margin_cents,
          margin_percentage,
          rate_per_mile_customer_cents
        `
      )

      if (input?.dateFrom) {
        query = query.gte('pickup_date', input.dateFrom)
      }

      if (input?.dateTo) {
        query = query.lte('pickup_date', input.dateTo)
      }

      const { data, error } = await query

      checkSupabaseError(error)

      const loads = data || []
      const totalLoads = loads.length

      if (totalLoads === 0) {
        return {
          totalLoads: 0,
          totalRevenueCents: 0,
          totalCarrierCostCents: 0,
          totalMarginCents: 0,
          averageMarginPercentage: 0,
          averageRatePerMileCents: 0,
        } as LoadHistoryStats
      }

      const totalRevenueCents = loads.reduce((sum, l) => sum + (l.customer_rate_cents || 0), 0)
      const totalCarrierCostCents = loads.reduce((sum, l) => sum + (l.carrier_rate_cents || 0), 0)
      const totalMarginCents = loads.reduce((sum, l) => sum + (l.margin_cents || 0), 0)

      const marginsWithValues = loads.filter((l) => l.margin_percentage !== null)
      const averageMarginPercentage =
        marginsWithValues.length > 0
          ? marginsWithValues.reduce((sum, l) => sum + (l.margin_percentage || 0), 0) / marginsWithValues.length
          : 0

      const rpmWithValues = loads.filter((l) => l.rate_per_mile_customer_cents !== null)
      const averageRatePerMileCents =
        rpmWithValues.length > 0
          ? Math.round(
              rpmWithValues.reduce((sum, l) => sum + (l.rate_per_mile_customer_cents || 0), 0) /
                rpmWithValues.length
            )
          : 0

      return {
        totalLoads,
        totalRevenueCents,
        totalCarrierCostCents,
        totalMarginCents,
        averageMarginPercentage: Math.round(averageMarginPercentage * 100) / 100,
        averageRatePerMileCents,
      } as LoadHistoryStats
    }),

  // ---------------------------------------------------------------------------
  // GET LANE STATS
  // ---------------------------------------------------------------------------
  getLaneStats: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          limit: z.number().int().positive().max(50).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      // Supabase doesn't support GROUP BY well, so we fetch and aggregate in JS
      let query = supabase.from('load_history').select(
        `
          origin_state,
          destination_state,
          customer_rate_cents,
          carrier_rate_cents,
          margin_cents,
          margin_percentage
        `
      )

      if (input?.dateFrom) {
        query = query.gte('pickup_date', input.dateFrom)
      }

      if (input?.dateTo) {
        query = query.lte('pickup_date', input.dateTo)
      }

      const { data, error } = await query

      checkSupabaseError(error)

      // Aggregate by lane
      const laneMap = new Map<string, LaneStats>()

      for (const row of data || []) {
        const key = `${row.origin_state}-${row.destination_state}`

        if (!laneMap.has(key)) {
          laneMap.set(key, {
            originState: row.origin_state,
            destinationState: row.destination_state,
            loadCount: 0,
            totalRevenueCents: 0,
            totalMarginCents: 0,
            averageMarginPercentage: 0,
            averageCustomerRateCents: 0,
            averageCarrierRateCents: 0,
          })
        }

        const lane = laneMap.get(key)!
        lane.loadCount++
        lane.totalRevenueCents += row.customer_rate_cents || 0
        lane.totalMarginCents += row.margin_cents || 0
      }

      // Calculate averages
      for (const lane of laneMap.values()) {
        if (lane.loadCount > 0) {
          lane.averageCustomerRateCents = Math.round(lane.totalRevenueCents / lane.loadCount)
          lane.averageCarrierRateCents = Math.round(
            (lane.totalRevenueCents - lane.totalMarginCents) / lane.loadCount
          )
          lane.averageMarginPercentage =
            lane.totalRevenueCents > 0
              ? Math.round((lane.totalMarginCents / lane.totalRevenueCents) * 10000) / 100
              : 0
        }
      }

      // Sort by total margin and return top N
      const lanes = Array.from(laneMap.values())
        .sort((a, b) => b.totalMarginCents - a.totalMarginCents)
        .slice(0, input?.limit || 20)

      return lanes
    }),

  // ---------------------------------------------------------------------------
  // GET CARRIER PERFORMANCE
  // ---------------------------------------------------------------------------
  getCarrierPerformance: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          limit: z.number().int().positive().max(50).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      let query = supabase.from('load_history').select(
        `
          carrier_id,
          carrier_rate_cents,
          margin_percentage,
          carriers:carrier_id (company_name)
        `
      )

      if (input?.dateFrom) {
        query = query.gte('pickup_date', input.dateFrom)
      }

      if (input?.dateTo) {
        query = query.lte('pickup_date', input.dateTo)
      }

      query = query.not('carrier_id', 'is', null)

      const { data, error } = await query

      checkSupabaseError(error)

      // Aggregate by carrier
      const carrierMap = new Map<
        string,
        {
          carrierId: string
          carrierName: string
          loadCount: number
          totalPaid: number
          margins: number[]
        }
      >()

      for (const row of data || []) {
        if (!row.carrier_id) continue

        if (!carrierMap.has(row.carrier_id)) {
          carrierMap.set(row.carrier_id, {
            carrierId: row.carrier_id,
            carrierName: (row.carriers as any)?.company_name || 'Unknown',
            loadCount: 0,
            totalPaid: 0,
            margins: [],
          })
        }

        const carrier = carrierMap.get(row.carrier_id)!
        carrier.loadCount++
        carrier.totalPaid += row.carrier_rate_cents || 0
        if (row.margin_percentage !== null) {
          carrier.margins.push(row.margin_percentage)
        }
      }

      // Calculate stats
      const carriers: CarrierPerformanceStats[] = Array.from(carrierMap.values())
        .map((c) => ({
          carrierId: c.carrierId,
          carrierName: c.carrierName,
          loadCount: c.loadCount,
          totalPaidCents: c.totalPaid,
          averageRateCents: c.loadCount > 0 ? Math.round(c.totalPaid / c.loadCount) : 0,
          averageMarginWhenUsed:
            c.margins.length > 0
              ? Math.round((c.margins.reduce((a, b) => a + b, 0) / c.margins.length) * 100) / 100
              : 0,
        }))
        .sort((a, b) => b.loadCount - a.loadCount)
        .slice(0, input?.limit || 20)

      return carriers
    }),
})
