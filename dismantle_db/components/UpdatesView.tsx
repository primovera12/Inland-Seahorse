'use client'

import { useState } from 'react'

interface Update {
  title: string
  description: string
  type: 'feature' | 'improvement' | 'fix' | 'security'
}

interface DayUpdates {
  date: string
  dateLabel: string
  updates: Update[]
}

const updateHistory: DayUpdates[] = [
  {
    date: '2025-12-17',
    dateLabel: 'December 17, 2025',
    updates: [
      { title: 'Multi-Truck Load Blocks', description: 'Bundle multiple trucks with their cargo, rates, and accessorials into grouped load blocks. Each block is a complete shipment unit.', type: 'feature' },
      { title: 'Per-Cargo Image Upload', description: 'Upload individual images for each cargo item within a load block. Better documentation for complex shipments.', type: 'feature' },
      { title: 'Load Types Management', description: 'Add, edit, and remove custom cargo/load types from the settings panel. Manage your own list of load classifications.', type: 'feature' },
      { title: 'Inland Quote PDF Redesign', description: 'Redesigned inland quote PDF to match dismantle quote style with proper logo sizing, company info box on left, and quote details on right.', type: 'improvement' },
      { title: 'PDF Preview Enhancement', description: 'Removed sidebar from PDF preview for better visibility. Full page view without navigation panes.', type: 'improvement' },
      { title: 'Customer Selection in Inland Quote', description: 'Added customer dropdown to inland quote form with auto-population of client and billing information.', type: 'feature' },
      { title: 'Add New Customer Modal', description: 'Create new customers directly from the inland quote form without leaving the page.', type: 'feature' },
      { title: 'Work Order Number Field', description: 'Added work order number field to inland quotes for client reference tracking.', type: 'feature' },
      { title: 'Ft-In Dimension Format', description: 'Dimensions now use ft.in format (8.6 = 8 feet 6 inches) for easier data entry.', type: 'improvement' },
      { title: 'Customer Update Button', description: 'Save changes to existing customers directly from the quote form with the new "Save to Customer" button.', type: 'feature' },
    ]
  },
  {
    date: '2025-12-11',
    dateLabel: 'December 11, 2025',
    updates: [
      { title: 'PDF Layout Redesign', description: 'Company info box on left with logo, address, phone, email. Quote details on right. Removed header bar for cleaner look.', type: 'improvement' },
      { title: 'Comprehensive Security Features', description: 'Added rate limiting (100 req/min), bot detection, XSS/SQL injection protection, security headers, and input validation.', type: 'security' },
      { title: 'Quote Pipeline View', description: 'Kanban-style board to track quotes through stages: Draft → Sent → Accepted/Rejected. Visual pipeline management.', type: 'feature' },
      { title: 'CSV Import for Clients & Companies', description: 'Bulk import clients and companies from CSV files with automatic field mapping.', type: 'feature' },
      { title: 'Improved Image Handling', description: 'Support for all image formats (PNG, JPEG, GIF, WebP, BMP). Automatic format detection and dimension capture.', type: 'improvement' },
      { title: 'Sidebar Navigation', description: 'Converted top tabs to collapsible sidebar navigation. Mobile responsive with hamburger menu.', type: 'improvement' },
      { title: 'PDF Single Page Layout', description: 'Optimized spacing and font sizes to fit quotes on a single page.', type: 'improvement' },
      { title: 'Fixed Pipeline Values', description: 'Quote Pipeline now correctly shows quote totals instead of $0.', type: 'fix' },
    ]
  },
  {
    date: '2025-12-10',
    dateLabel: 'December 10, 2025',
    updates: [
      { title: 'SVG to PNG Conversion', description: 'Automatic conversion of SVG images to PNG for PDF compatibility.', type: 'fix' },
      { title: 'Remove Equipment Images', description: 'Added ability to remove front and side images from equipment individually.', type: 'feature' },
      { title: 'Customer Management', description: 'Full customer database with contact info, auto-complete in quotes, and customer history.', type: 'feature' },
      { title: 'Auto-Save Quote Drafts', description: 'Quotes are automatically saved as drafts. Resume where you left off.', type: 'feature' },
      { title: 'Enhanced Quote History', description: 'Search, filter by date range, amount, customer. Edit and re-download past quotes.', type: 'improvement' },
      { title: 'Inline Dimension Editing', description: 'Edit equipment dimensions directly in the quote view without navigating away.', type: 'improvement' },
      { title: 'Equipment Images Support', description: 'Upload front and side view images for equipment. Displayed in PDF quotes.', type: 'feature' },
      { title: 'Equipment Type Classification', description: 'Auto-categorization of equipment into types (Excavators, Dozers, Loaders, etc.).', type: 'feature' },
      { title: 'Database: 200+ Equipment Models', description: 'Added comprehensive equipment dimensions for 200+ models across all major manufacturers.', type: 'feature' },
    ]
  },
  {
    date: '2025-12-08',
    dateLabel: 'December 8, 2025',
    updates: [
      { title: 'Equipment Dimensions System', description: 'Track transport length, width, height, and operating weight for all equipment.', type: 'feature' },
      { title: 'PDF Preview', description: 'Preview PDF quotes before downloading. Make adjustments and regenerate.', type: 'feature' },
      { title: 'Company Branding Settings', description: 'Upload logo, set company colors, customize footer text and terms.', type: 'feature' },
      { title: 'Professional PDF Redesign', description: 'Modern, freight-quote style PDF layout with better typography and spacing.', type: 'improvement' },
    ]
  },
  {
    date: '2025-12-06',
    dateLabel: 'December 6, 2025',
    updates: [
      { title: 'Dynamic Miscellaneous Fees', description: 'Add unlimited custom fees to quotes with title, description, and amount.', type: 'feature' },
      { title: 'Cedar Rapids Equipment Support', description: 'Added all Cedar Rapids models with proper database linking.', type: 'feature' },
    ]
  },
  {
    date: '2025-12-03',
    dateLabel: 'December 3, 2025',
    updates: [
      { title: 'Create New Makes & Models', description: 'Add new equipment makes and models directly from the interface.', type: 'feature' },
      { title: 'Database Access Fixes', description: 'Fixed Row Level Security policies for proper frontend data access.', type: 'fix' },
    ]
  },
  {
    date: '2025-12-02',
    dateLabel: 'December 2, 2025',
    updates: [
      { title: 'Quote Version Tracking', description: 'Track revisions of quotes. See version history and changes.', type: 'feature' },
      { title: 'Quote History System', description: 'Complete history of all generated quotes with search and filters.', type: 'feature' },
      { title: 'Download & Edit Past Quotes', description: 'Re-download or edit any previously generated quote.', type: 'feature' },
      { title: 'Cost Toggle Feature', description: 'Enable/disable individual cost line items per quote.', type: 'feature' },
      { title: 'New Cost Fields', description: 'Added Dismantling & Loading, Waste Fluids Disposal Fee, Loading, and 5 other cost categories.', type: 'feature' },
      { title: 'Cost Descriptions', description: 'Add custom descriptions to each cost line item.', type: 'feature' },
      { title: 'Quote Templates', description: 'Save and load cost templates for different locations.', type: 'feature' },
      { title: 'Margin Calculator', description: 'Built-in margin percentage calculator with automatic total adjustment.', type: 'feature' },
      { title: 'Location-Based Pricing', description: 'Different default costs for each shipping location (NJ, Savannah, Houston, etc.).', type: 'feature' },
      { title: 'PDF Quote Export', description: 'Generate professional PDF quotes with company branding.', type: 'feature' },
    ]
  },
  {
    date: '2025-11-21',
    dateLabel: 'November 21, 2025',
    updates: [
      { title: 'Advanced Export Features', description: 'Export data to CSV and Excel formats.', type: 'feature' },
      { title: 'Bulk Price Updates', description: 'Update prices for multiple items at once.', type: 'feature' },
      { title: 'Data Validation', description: 'Input validation and error handling throughout the app.', type: 'improvement' },
      { title: 'Favorites System', description: 'Star frequently used equipment for quick access.', type: 'feature' },
      { title: 'Auto-Save Prices', description: 'Automatic saving of price changes as you type.', type: 'feature' },
      { title: 'Manage Tab', description: 'Delete makes/models and bulk reset prices.', type: 'feature' },
      { title: 'Mobile Responsive Design', description: 'Full mobile support with responsive layouts.', type: 'improvement' },
      { title: 'Popular Makes Sorting', description: 'Frequently used makes appear at the top of lists.', type: 'improvement' },
      { title: 'Initial Release', description: 'Equipment Dismantling Rates Tool launched with core functionality: price entry, search, and basic management.', type: 'feature' },
    ]
  },
]

const typeColors = {
  feature: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500', dot: 'bg-green-500' },
  improvement: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500', dot: 'bg-blue-500' },
  fix: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-500', dot: 'bg-orange-500' },
  security: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-500', dot: 'bg-purple-500' },
}

const typeLabels = {
  feature: 'New Feature',
  improvement: 'Improvement',
  fix: 'Bug Fix',
  security: 'Security',
}

export default function UpdatesView() {
  const [filter, setFilter] = useState<'all' | 'feature' | 'improvement' | 'fix' | 'security'>('all')

  const filteredHistory = updateHistory.map(day => ({
    ...day,
    updates: day.updates.filter(u => filter === 'all' || u.type === filter)
  })).filter(day => day.updates.length > 0)

  const totalUpdates = updateHistory.reduce((sum, day) => sum + day.updates.length, 0)
  const totalFeatures = updateHistory.reduce((sum, day) => sum + day.updates.filter(u => u.type === 'feature').length, 0)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">New Features & Updates</h1>
        <p className="text-gray-600">
          Track all the improvements and new features added to the Equipment Dismantling Rate Manager.
        </p>
        <div className="flex gap-4 mt-4 text-sm">
          <div className="bg-gray-100 rounded-lg px-4 py-2">
            <span className="font-semibold text-gray-900">{totalUpdates}</span>
            <span className="text-gray-600 ml-1">Total Updates</span>
          </div>
          <div className="bg-green-100 rounded-lg px-4 py-2">
            <span className="font-semibold text-green-800">{totalFeatures}</span>
            <span className="text-green-700 ml-1">New Features</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Updates
        </button>
        {(['feature', 'improvement', 'fix', 'security'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === type
                ? `${typeColors[type].bg} ${typeColors[type].text}`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {typeLabels[type]}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {filteredHistory.map((day, dayIndex) => (
          <div key={day.date} className="mb-8">
            {/* Date header */}
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center z-10">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="ml-4 text-lg font-semibold text-gray-900">{day.dateLabel}</h2>
              <span className="ml-3 text-sm text-gray-500">
                {day.updates.length} update{day.updates.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Updates for this day */}
            <div className="ml-4 pl-8 border-l-2 border-gray-100 space-y-3">
              {day.updates.map((update, updateIndex) => (
                <div
                  key={updateIndex}
                  className={`relative bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow ${typeColors[update.type].border} border-l-4`}
                >
                  {/* Dot on timeline */}
                  <div className={`absolute -left-[25px] top-5 w-3 h-3 rounded-full ${typeColors[update.type].dot}`} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{update.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[update.type].bg} ${typeColors[update.type].text}`}>
                          {typeLabels[update.type]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{update.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* End of timeline */}
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center z-10">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="ml-4 text-gray-500 text-sm">More updates coming soon...</p>
        </div>
      </div>
    </div>
  )
}
