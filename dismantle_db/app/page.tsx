'use client'

import { useState, useEffect } from 'react'
import PriceEntryView from '@/components/PriceEntryView'
import SearchView from '@/components/SearchView'
import AddNewView from '@/components/AddNewView'
import ManageView from '@/components/ManageView'
import QuoteView from '@/components/QuoteView'
import QuoteHistoryView from '@/components/QuoteHistoryView'
import SettingsView from '@/components/SettingsView'
import InlandSettingsView from '@/components/InlandSettingsView'
import DismantleSettingsView from '@/components/DismantleSettingsView'
// DimensionsView removed - dimensions now in Data Entry page
import InlandQuoteView from '@/components/InlandQuoteView'
import InlandHistoryView from '@/components/InlandHistoryView'
import ClientManagementView from '@/components/ClientManagementView'
import CompanyManagementView from '@/components/CompanyManagementView'
import QuotePipelineView from '@/components/QuotePipelineView'
import UpdatesView from '@/components/UpdatesView'
import TicketsView from '@/components/TicketsView'
import FloatingTicketButton from '@/components/FloatingTicketButton'
import Toast, { ToastProps } from '@/components/Toast'
import { InlandQuoteFormData } from '@/lib/supabase'

type Tab = 'price_entry' | 'search' | 'quote' | 'history' | 'pipeline' | 'add_new' | 'manage' | 'settings' | 'dismantle_settings' | 'inland_quote' | 'inland_history' | 'inland_settings' | 'clients' | 'companies' | 'updates' | 'tickets'

// Edit quote data type
interface EditInlandQuoteData {
  quoteNumber: string
  formData: InlandQuoteFormData
  quoteId: string
}

// Navigation item type
interface NavItem {
  id: Tab
  label: string
  shortLabel?: string
  icon: React.ReactNode
  badge?: string
}

// Navigation sections
const equipmentNav: NavItem[] = [
  {
    id: 'price_entry',
    label: 'Data Entry',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'search',
    label: 'Search',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  },
  {
    id: 'quote',
    label: 'Generate Quote',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    id: 'history',
    label: 'Quote History',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    badge: 'NEW'
  },
  {
    id: 'dismantle_settings',
    label: 'Dismantle Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    )
  }
]

const managementNav: NavItem[] = [
  {
    id: 'add_new',
    label: 'Add New Make',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    )
  },
  {
    id: 'manage',
    label: 'Manage Data',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  }
]

const inlandNav: NavItem[] = [
  {
    id: 'inland_quote',
    label: 'Inland Quote',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    )
  },
  {
    id: 'inland_history',
    label: 'Inland History',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  },
  {
    id: 'companies',
    label: 'Companies',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  {
    id: 'clients',
    label: 'Contacts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    id: 'inland_settings',
    label: 'Inland Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    )
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    )
  }
]

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('price_entry')
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)
  const [configError, setConfigError] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [editInlandQuote, setEditInlandQuote] = useState<EditInlandQuoteData | null>(null)

  useEffect(() => {
    // Check if Supabase credentials are configured
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
    ) {
      setConfigError(true)
    }
  }, [])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }

  const closeToast = () => {
    setToast(null)
  }

  // Close mobile sidebar when tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setMobileSidebarOpen(false)
    // Clear edit data when navigating away from inland quote
    if (tab !== 'inland_quote') {
      setEditInlandQuote(null)
    }
  }

  // Handle editing an inland quote from history
  const handleEditInlandQuote = (quoteData: EditInlandQuoteData) => {
    setEditInlandQuote(quoteData)
    setActiveTab('inland_quote')
    setMobileSidebarOpen(false)
  }

  // Navigation item renderer
  const NavItemButton = ({ item, isActive }: { item: NavItem; isActive: boolean }) => (
    <button
      onClick={() => handleTabChange(item.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 -ml-[4px] pl-[calc(0.75rem+4px)]'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className={isActive ? 'text-indigo-600' : 'text-gray-400'}>{item.icon}</span>
      {!sidebarCollapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full">
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  )

  // Section header renderer
  const SectionHeader = ({ title, color = 'gray' }: { title: string; color?: string }) => (
    <div className={`px-3 py-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
      <span className={`text-xs font-semibold uppercase tracking-wider ${
        color === 'purple' ? 'text-purple-500' : 'text-gray-400'
      }`}>
        {title}
      </span>
    </div>
  )

  if (configError) {
    return (
      <main className="min-h-screen py-8 px-4 flex items-center justify-center">
        <div className="max-w-2xl mx-auto bg-red-50 border-2 border-red-200 rounded-xl p-8">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h1 className="text-2xl font-bold text-red-800 mb-2">Configuration Error</h1>
            <p className="text-red-700 mb-4">
              Supabase credentials are not configured. Please add the following environment
              variables:
            </p>
            <div className="bg-white rounded-lg p-4 text-left font-mono text-sm space-y-2">
              <div>
                <span className="text-gray-600">NEXT_PUBLIC_SUPABASE_URL</span>
              </div>
              <div>
                <span className="text-gray-600">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
              </div>
            </div>
            <p className="text-red-600 mt-4 text-sm">
              If deploying on Vercel, add these in Settings → Environment Variables
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-gray-200 z-50
        transition-all duration-300 flex flex-col
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo/Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-800">Rate Manager</h1>
                <p className="text-[10px] text-gray-500">Equipment Dismantling</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Equipment Section */}
          <div>
            <SectionHeader title="Equipment" />
            <div className="px-2 space-y-1">
              {equipmentNav.map(item => (
                <NavItemButton key={item.id} item={item} isActive={activeTab === item.id} />
              ))}
            </div>
          </div>

          {/* Management Section */}
          <div>
            <SectionHeader title="Management" />
            <div className="px-2 space-y-1">
              {managementNav.map(item => (
                <NavItemButton key={item.id} item={item} isActive={activeTab === item.id} />
              ))}
            </div>
          </div>

          {/* Inland Transportation Section */}
          <div>
            <SectionHeader title="Inland Transportation" color="purple" />
            <div className="px-2 space-y-1">
              {inlandNav.map(item => (
                <NavItemButton key={item.id} item={item} isActive={activeTab === item.id} />
              ))}
            </div>
          </div>
        </nav>

        {/* Settings and Updates at bottom */}
        <div className="p-2 border-t border-gray-200 space-y-1">
          <NavItemButton
            item={{
              id: 'updates',
              label: 'Updates',
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              badge: 'NEW'
            }}
            isActive={activeTab === 'updates'}
          />
          <NavItemButton
            item={{
              id: 'settings',
              label: 'Settings',
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )
            }}
            isActive={activeTab === 'settings'}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Bar - Mobile */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Equipment Dismantling Rates</h1>
        </div>

        {/* Content Area */}
        <div className="p-4 md:p-6 lg:p-8">
          {/* Page Header - Desktop */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Equipment Dismantling Rates</h1>
            <p className="text-sm text-gray-500">Internal rate management tool</p>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[calc(100vh-12rem)]">
            <div className="p-4 md:p-6">
              {activeTab === 'price_entry' && <PriceEntryView onShowToast={showToast} />}
              {activeTab === 'search' && <SearchView onShowToast={showToast} />}
              {activeTab === 'quote' && <QuoteView showToast={showToast} />}
              {activeTab === 'history' && <QuoteHistoryView showToast={showToast} />}
              {activeTab === 'pipeline' && <QuotePipelineView showToast={showToast} />}
              {activeTab === 'add_new' && <AddNewView onShowToast={showToast} />}
              {activeTab === 'manage' && <ManageView onShowToast={showToast} />}
              {activeTab === 'settings' && <SettingsView showToast={showToast} />}
              {activeTab === 'dismantle_settings' && <DismantleSettingsView showToast={showToast} />}
              {activeTab === 'inland_settings' && <InlandSettingsView showToast={showToast} />}
              {activeTab === 'inland_quote' && (
                <InlandQuoteView
                  editQuote={editInlandQuote}
                  onClearEdit={() => setEditInlandQuote(null)}
                />
              )}
              {activeTab === 'inland_history' && (
                <InlandHistoryView onEditQuote={handleEditInlandQuote} />
              )}
              {activeTab === 'companies' && <CompanyManagementView onShowToast={showToast} />}
              {activeTab === 'clients' && <ClientManagementView onShowToast={showToast} />}
              {activeTab === 'updates' && <UpdatesView />}
              {activeTab === 'tickets' && <TicketsView showToast={showToast} />}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Ticket Button */}
      <FloatingTicketButton currentPage={activeTab} />

      {/* Toast Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  )
}
