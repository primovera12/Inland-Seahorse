'use client'

import { useState, useRef } from 'react'
import { supabase, Company, Customer, Contact } from '@/lib/supabase'

interface ImportExportViewProps {
  type: 'companies' | 'customers' | 'contacts'
  onShowToast: (message: string, type: 'success' | 'error') => void
  onImportComplete?: () => void
}

export default function ImportExportView({ type, onShowToast, onImportComplete }: ImportExportViewProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getColumns = () => {
    if (type === 'companies') {
      return ['name', 'industry', 'website', 'phone', 'address', 'city', 'state', 'zip', 'status', 'tags', 'notes']
    } else if (type === 'customers') {
      return ['name', 'company', 'email', 'phone', 'address', 'billing_address', 'billing_city', 'billing_state', 'billing_zip', 'payment_terms', 'notes']
    } else {
      return ['first_name', 'last_name', 'title', 'email', 'phone', 'mobile', 'role', 'company_name', 'notes']
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      let data: unknown[] = []

      if (type === 'companies') {
        const { data: companies, error } = await supabase.from('companies').select('*').order('name')
        if (error) throw error
        data = companies || []
      } else if (type === 'customers') {
        const { data: customers, error } = await supabase.from('customers').select('*').order('name')
        if (error) throw error
        data = customers || []
      } else {
        const { data: contacts, error } = await supabase
          .from('contacts')
          .select('*, company:companies(name)')
          .order('first_name')
        if (error) throw error
        data = (contacts || []).map((c: Contact & { company?: { name: string } }) => ({
          ...c,
          company_name: c.company?.name || ''
        }))
      }

      if (data.length === 0) {
        onShowToast(`No ${type} to export`, 'error')
        return
      }

      // Convert to CSV
      const columns = getColumns()
      const outputRows: string[] = [columns.join(',')]

      // Data rows
      for (const item of data as Record<string, unknown>[]) {
        const row = columns.map(col => {
          let value = item[col]
          if (Array.isArray(value)) {
            value = value.join('; ')
          }
          if (value === null || value === undefined) {
            value = ''
          }
          // Escape quotes and wrap in quotes if contains comma
          const strValue = String(value)
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`
          }
          return strValue
        })
        outputRows.push(row.join(','))
      }

      // Download
      const csvContent = outputRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      onShowToast(`Exported ${data.length} ${type}`, 'success')
    } catch (err) {
      console.error('Export error:', err)
      onShowToast('Export failed', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string
        const rows = parseCSV(csvText)

        if (rows.length < 2) {
          setImportErrors(['CSV file must have headers and at least one data row'])
          return
        }

        const headers = rows[0].map(h => h.toLowerCase().trim().replace(/\s+/g, '_'))
        const dataRows = rows.slice(1)

        // Validate headers
        const requiredColumns = type === 'companies' ? ['name'] :
                                type === 'customers' ? ['name'] :
                                ['first_name']

        const missingColumns = requiredColumns.filter(col => !headers.includes(col))
        if (missingColumns.length > 0) {
          setImportErrors([`Missing required columns: ${missingColumns.join(', ')}`])
          return
        }

        // Parse data
        const parsedData = dataRows.map(row => {
          const obj: Record<string, string> = {}
          headers.forEach((header, i) => {
            obj[header] = row[i] || ''
          })
          return obj
        }).filter(obj => {
          // Filter out empty rows
          return Object.values(obj).some(v => v.trim() !== '')
        })

        setImportPreview(parsedData)
        setImportErrors([])
        setShowImportModal(true)
      } catch (err) {
        console.error('Parse error:', err)
        setImportErrors(['Failed to parse CSV file'])
      }
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentCell = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentCell += '"'
          i++ // Skip next quote
        } else if (char === '"') {
          inQuotes = false
        } else {
          currentCell += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          currentRow.push(currentCell.trim())
          currentCell = ''
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          currentRow.push(currentCell.trim())
          if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
            rows.push(currentRow)
          }
          currentRow = []
          currentCell = ''
          if (char === '\r') i++ // Skip LF after CR
        } else if (char !== '\r') {
          currentCell += char
        }
      }
    }

    // Handle last row
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim())
      if (currentRow.some(c => c !== '')) {
        rows.push(currentRow)
      }
    }

    return rows
  }

  const handleImport = async () => {
    if (importPreview.length === 0) return

    setIsImporting(true)
    const errors: string[] = []
    let successCount = 0

    try {
      for (let i = 0; i < importPreview.length; i++) {
        const row = importPreview[i]

        try {
          if (type === 'companies') {
            const companyData = {
              name: row.name,
              industry: row.industry || null,
              website: row.website || null,
              phone: row.phone || null,
              address: row.address || null,
              city: row.city || null,
              state: row.state || null,
              zip: row.zip || null,
              status: (['active', 'inactive', 'prospect', 'vip'].includes(row.status) ? row.status : 'active'),
              tags: row.tags ? row.tags.split(';').map((t: string) => t.trim()).filter(Boolean) : [],
              notes: row.notes || null
            }

            const { error } = await supabase.from('companies').insert(companyData)
            if (error) throw error
          } else if (type === 'customers') {
            const customerData = {
              name: row.name,
              company: row.company || null,
              email: row.email || null,
              phone: row.phone || null,
              address: row.address || null,
              billing_address: row.billing_address || null,
              billing_city: row.billing_city || null,
              billing_state: row.billing_state || null,
              billing_zip: row.billing_zip || null,
              payment_terms: row.payment_terms || null,
              notes: row.notes || null
            }

            const { error } = await supabase.from('customers').insert(customerData)
            if (error) throw error
          } else {
            // Contacts - need to look up company ID
            let companyId = null
            if (row.company_name) {
              const { data: company } = await supabase
                .from('companies')
                .select('id')
                .ilike('name', row.company_name)
                .single()
              if (company) companyId = company.id
            }

            const contactData = {
              first_name: row.first_name,
              last_name: row.last_name || null,
              title: row.title || null,
              email: row.email || null,
              phone: row.phone || null,
              mobile: row.mobile || null,
              role: (['general', 'decision_maker', 'billing', 'operations', 'technical'].includes(row.role) ? row.role : 'general'),
              company_id: companyId,
              notes: row.notes || null
            }

            const { error } = await supabase.from('contacts').insert(contactData)
            if (error) throw error
          }

          successCount++
        } catch (err) {
          errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      if (successCount > 0) {
        onShowToast(`Imported ${successCount} ${type}`, 'success')
        onImportComplete?.()
      }

      if (errors.length > 0) {
        setImportErrors(errors)
      } else {
        setShowImportModal(false)
        setImportPreview([])
      }
    } catch (err) {
      console.error('Import error:', err)
      onShowToast('Import failed', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const columns = getColumns()
    const csvContent = columns.join(',') + '\n'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${type}_template.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
        >
          {isExporting ? (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          Export CSV
        </button>

        {/* Import Button */}
        <label className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import CSV
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {/* Template Download */}
        <button
          onClick={downloadTemplate}
          className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Download CSV template"
        >
          Template
        </button>
      </div>

      {/* Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Import Preview ({importPreview.length} records)
              </h3>
              <button
                onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]) }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 overflow-auto max-h-[60vh]">
              {importErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Errors ({importErrors.length})</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {importErrors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {importErrors.length > 10 && (
                      <li>...and {importErrors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              {importPreview.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                        {getColumns().slice(0, 6).map(col => (
                          <th key={col} className="px-3 py-2 text-left font-medium text-gray-500">
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importPreview.slice(0, 20).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          {getColumns().slice(0, 6).map(col => (
                            <td key={col} className="px-3 py-2 text-gray-700 truncate max-w-[150px]">
                              {row[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreview.length > 20 && (
                    <p className="text-center text-gray-500 text-sm mt-2">
                      ...and {importPreview.length - 20} more rows
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]) }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || importPreview.length === 0}
                className="px-4 py-2 text-white bg-indigo-600 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isImporting && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Import {importPreview.length} Records
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
