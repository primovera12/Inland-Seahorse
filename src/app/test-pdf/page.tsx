'use client'

import { QuotePDFPreview } from '@/lib/pdf'
import type { UnifiedPDFData } from '@/lib/pdf'

// Sample data for testing
const samplePDFData: UnifiedPDFData = {
  quoteType: 'dismantle',
  quoteNumber: 'QT-2024-0892',
  issueDate: 'Jan 12, 2026',
  validUntil: 'Feb 12, 2026',
  version: 1,

  company: {
    name: 'Seahorse Express',
    address: '123 Shipping Lane, Houston, TX 77001',
    phone: '+1 (555) 123-4567',
    email: 'quotes@seahorseexpress.com',
    website: 'www.seahorseexpress.com',
    primaryColor: '#1e3a8a',
    secondaryColor: '#475569',
  },

  customer: {
    name: 'Robert Chen',
    company: 'Apex Global Traders Inc.',
    email: 'r.chen@apex-global.com',
    phone: '+1 (415) 555-0128',
    address: '452 Commerce Blvd, Suite 800',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
  },

  equipment: [
    {
      id: 'eq-1',
      makeName: 'Caterpillar',
      modelName: 'CAT 320',
      location: 'Long Beach',
      quantity: 2,
      dimensions: {
        length_inches: 384, // 32 feet
        width_inches: 120, // 10 feet
        height_inches: 132, // 11 feet
        weight_lbs: 48000,
      },
      frontImageUrl: 'https://images.unsplash.com/photo-1580901368919-7738efb0f87e?w=400&h=300&fit=crop',
      sideImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      costs: {
        dismantling_loading_cost: 1500000, // $15,000
        loading_cost: 0,
        blocking_bracing_cost: 250000, // $2,500
        rigging_cost: 350000, // $3,500
        storage_cost: 0,
        transport_cost: 450000, // $4,500
        equipment_cost: 0,
        labor_cost: 0,
        permit_cost: 75000, // $750
        escort_cost: 125000, // $1,250
        miscellaneous_cost: 0,
      },
      enabledCosts: {
        dismantling_loading_cost: true,
        loading_cost: false,
        blocking_bracing_cost: true,
        rigging_cost: true,
        storage_cost: false,
        transport_cost: true,
        equipment_cost: false,
        labor_cost: false,
        permit_cost: true,
        escort_cost: true,
        miscellaneous_cost: false,
      },
      costOverrides: {
        dismantling_loading_cost: null,
        loading_cost: null,
        blocking_bracing_cost: null,
        rigging_cost: null,
        storage_cost: null,
        transport_cost: null,
        equipment_cost: null,
        labor_cost: null,
        permit_cost: null,
        escort_cost: null,
        miscellaneous_cost: null,
      },
      miscFees: [
        {
          id: 'fee-1',
          title: 'Rush Processing',
          description: 'Expedited handling fee',
          amount: 50000, // $500
          is_percentage: false,
        },
      ],
      subtotal: 2750000, // $27,500
      miscFeesTotal: 50000,
      totalWithQuantity: 5500000, // $55,000 (x2)
    },
  ],

  isMultiEquipment: false,
  location: 'Long Beach',

  equipmentSubtotal: 5500000,
  miscFeesTotal: 100000,
  inlandTotal: 0,
  grandTotal: 5600000, // $56,000

  customerNotes: 'Equipment will be available for pickup starting Monday. Please coordinate with site manager John Smith at (555) 987-6543.',
  termsAndConditions: 'Quote is valid for 30 days from issue date. Payment terms: 50% deposit upon acceptance, balance due upon completion. All prices in USD. Subject to final site inspection. Cancellation fees may apply within 48 hours of scheduled service.',
}

// Multi-equipment sample
const multiEquipmentData: UnifiedPDFData = {
  ...samplePDFData,
  quoteNumber: 'QT-2024-0893',
  isMultiEquipment: true,
  equipment: [
    {
      ...samplePDFData.equipment[0],
      id: 'eq-1',
      quantity: 2,
    },
    {
      id: 'eq-2',
      makeName: 'Komatsu',
      modelName: 'PC200',
      location: 'Long Beach',
      quantity: 1,
      dimensions: {
        length_inches: 312, // 26 feet
        width_inches: 108, // 9 feet
        height_inches: 120, // 10 feet
        weight_lbs: 42000,
      },
      costs: {
        dismantling_loading_cost: 1200000, // $12,000
        loading_cost: 0,
        blocking_bracing_cost: 200000, // $2,000
        rigging_cost: 300000, // $3,000
        storage_cost: 0,
        transport_cost: 400000, // $4,000
        equipment_cost: 0,
        labor_cost: 0,
        permit_cost: 60000, // $600
        escort_cost: 100000, // $1,000
        miscellaneous_cost: 0,
      },
      enabledCosts: {
        dismantling_loading_cost: true,
        loading_cost: false,
        blocking_bracing_cost: true,
        rigging_cost: true,
        storage_cost: false,
        transport_cost: true,
        equipment_cost: false,
        labor_cost: false,
        permit_cost: true,
        escort_cost: true,
        miscellaneous_cost: false,
      },
      costOverrides: {
        dismantling_loading_cost: null,
        loading_cost: null,
        blocking_bracing_cost: null,
        rigging_cost: null,
        storage_cost: null,
        transport_cost: null,
        equipment_cost: null,
        labor_cost: null,
        permit_cost: null,
        escort_cost: null,
        miscellaneous_cost: null,
      },
      miscFees: [],
      subtotal: 2260000, // $22,600
      miscFeesTotal: 0,
      totalWithQuantity: 2260000,
    },
  ],
  equipmentSubtotal: 7760000, // $77,600
  miscFeesTotal: 100000,
  grandTotal: 7860000, // $78,600
}

export default function TestPDFPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">PDF Template Test</h1>

        <div className="space-y-12">
          {/* Single Equipment Quote */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Single Equipment Quote</h2>
            <QuotePDFPreview data={samplePDFData} showControls />
          </div>

          {/* Multi-Equipment Quote */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Multi-Equipment Quote</h2>
            <QuotePDFPreview data={multiEquipmentData} showControls />
          </div>
        </div>
      </div>
    </div>
  )
}
