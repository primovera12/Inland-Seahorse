'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface FieldMapping {
  csvColumn: string
  systemField: string | null
  createNew: boolean
  newFieldName: string
  newFieldType: 'text' | 'number' | 'date' | 'boolean' | 'json'
  sampleValues: string[]
}

interface CustomField {
  id: string
  table_name: string
  field_name: string
  field_type: string
  display_name: string
  is_required: boolean
  default_value: string | null
  created_at: string
}

interface AdvancedImportViewProps {
  targetTable: 'companies' | 'customers' | 'contacts' | 'inland_quotes'
  onShowToast: (message: string, type: 'success' | 'error') => void
  onImportComplete?: () => void
  onClose?: () => void
}

export default function AdvancedImportView({
  targetTable,
  onShowToast,
  onImportComplete,
  onClose
}: AdvancedImportViewProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload')
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // System fields for each table
  const systemFields: Record<string, { name: string; type: string; required: boolean }[]> = {
    companies: [
      { name: 'name', type: 'text', required: true },
      { name: 'industry', type: 'text', required: false },
      { name: 'website', type: 'text', required: false },
      { name: 'phone', type: 'text', required: false },
      { name: 'address', type: 'text', required: false },
      { name: 'city', type: 'text', required: false },
      { name: 'state', type: 'text', required: false },
      { name: 'zip', type: 'text', required: false },
      { name: 'status', type: 'text', required: false },
      { name: 'tags', type: 'json', required: false },
      { name: 'notes', type: 'text', required: false },
      { name: 'mc_number', type: 'text', required: false },
      { name: 'dot_number', type: 'text', required: false },
      { name: 'credit_limit', type: 'number', required: false },
      { name: 'payment_terms', type: 'text', required: false },
      { name: 'billing_email', type: 'text', required: false },
    ],
    customers: [
      { name: 'name', type: 'text', required: true },
      { name: 'company', type: 'text', required: false },
      { name: 'email', type: 'text', required: false },
      { name: 'phone', type: 'text', required: false },
      { name: 'address', type: 'text', required: false },
      { name: 'billing_address', type: 'text', required: false },
      { name: 'billing_city', type: 'text', required: false },
      { name: 'billing_state', type: 'text', required: false },
      { name: 'billing_zip', type: 'text', required: false },
      { name: 'payment_terms', type: 'text', required: false },
      { name: 'notes', type: 'text', required: false },
      { name: 'mc_number', type: 'text', required: false },
      { name: 'dot_number', type: 'text', required: false },
      { name: 'credit_limit', type: 'number', required: false },
    ],
    contacts: [
      { name: 'first_name', type: 'text', required: true },
      { name: 'last_name', type: 'text', required: false },
      { name: 'title', type: 'text', required: false },
      { name: 'email', type: 'text', required: false },
      { name: 'phone', type: 'text', required: false },
      { name: 'mobile', type: 'text', required: false },
      { name: 'role', type: 'text', required: false },
      { name: 'company_name', type: 'text', required: false },
      { name: 'notes', type: 'text', required: false },
      { name: 'is_primary', type: 'boolean', required: false },
    ],
    inland_quotes: [
      { name: 'quote_number', type: 'text', required: false },
      { name: 'customer_name', type: 'text', required: true },
      { name: 'origin_address', type: 'text', required: true },
      { name: 'destination_address', type: 'text', required: true },
      { name: 'equipment_type', type: 'text', required: false },
      { name: 'weight_lbs', type: 'number', required: false },
      { name: 'length_inches', type: 'number', required: false },
      { name: 'width_inches', type: 'number', required: false },
      { name: 'height_inches', type: 'number', required: false },
      { name: 'total_price', type: 'number', required: false },
      { name: 'notes', type: 'text', required: false },
    ]
  }

  // Load existing custom fields for this table
  useEffect(() => {
    loadCustomFields()
  }, [targetTable])

  const loadCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('table_name', targetTable)
        .order('display_name')

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading custom fields:', error)
      }
      if (data) setCustomFields(data)
    } catch (err) {
      console.error('Failed to load custom fields:', err)
    }
  }

  const parseCSV = (text: string): { headers: string[]; data: Record<string, string>[] } => {
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
          i++
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
          if (char === '\r') i++
        } else if (char !== '\r') {
          currentCell += char
        }
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim())
      if (currentRow.some(c => c !== '')) {
        rows.push(currentRow)
      }
    }

    if (rows.length < 2) {
      return { headers: [], data: [] }
    }

    const headers = rows[0]
    const data = rows.slice(1).map(row => {
      const obj: Record<string, string> = {}
      headers.forEach((header, i) => {
        obj[header] = row[i] || ''
      })
      return obj
    })

    return { headers, data }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const csvText = event.target?.result as string
      const { headers, data } = parseCSV(csvText)

      if (headers.length === 0 || data.length === 0) {
        onShowToast('Invalid CSV file. Please check the format.', 'error')
        return
      }

      setCsvHeaders(headers)
      setCsvData(data)

      // Initialize field mappings with smart auto-matching
      const mappings: FieldMapping[] = headers.map(csvCol => {
        const normalizedCsvCol = csvCol.toLowerCase().replace(/[\s_-]+/g, '_').trim()

        // Try to auto-match to system fields
        const sysFields = systemFields[targetTable] || []
        const customFieldsList = customFields || []

        // Check system fields first
        let matchedField: string | null = null
        for (const sf of sysFields) {
          const normalizedSysField = sf.name.toLowerCase().replace(/[\s_-]+/g, '_')
          if (normalizedCsvCol === normalizedSysField ||
              normalizedCsvCol.includes(normalizedSysField) ||
              normalizedSysField.includes(normalizedCsvCol)) {
            matchedField = sf.name
            break
          }
        }

        // Check custom fields if no system match
        if (!matchedField) {
          for (const cf of customFieldsList) {
            const normalizedCustomField = cf.field_name.toLowerCase().replace(/[\s_-]+/g, '_')
            if (normalizedCsvCol === normalizedCustomField ||
                normalizedCsvCol.includes(normalizedCustomField)) {
              matchedField = `custom:${cf.field_name}`
              break
            }
          }
        }

        // Get sample values
        const sampleValues = data.slice(0, 5).map(row => row[csvCol]).filter(Boolean)

        return {
          csvColumn: csvCol,
          systemField: matchedField,
          createNew: false,
          newFieldName: csvCol.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, ''),
          newFieldType: detectFieldType(sampleValues),
          sampleValues
        }
      })

      setFieldMappings(mappings)
      setStep('mapping')
    }

    reader.readAsText(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const detectFieldType = (samples: string[]): FieldMapping['newFieldType'] => {
    if (samples.length === 0) return 'text'

    const allNumbers = samples.every(s => !isNaN(Number(s)) && s.trim() !== '')
    if (allNumbers) return 'number'

    const datePattern = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$|^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/
    const allDates = samples.every(s => datePattern.test(s.trim()))
    if (allDates) return 'date'

    const boolPattern = /^(true|false|yes|no|1|0)$/i
    const allBooleans = samples.every(s => boolPattern.test(s.trim()))
    if (allBooleans) return 'boolean'

    return 'text'
  }

  const updateMapping = (index: number, updates: Partial<FieldMapping>) => {
    setFieldMappings(prev => prev.map((m, i) =>
      i === index ? { ...m, ...updates } : m
    ))
  }

  const createCustomField = async (mapping: FieldMapping): Promise<boolean> => {
    try {
      const { error } = await supabase.from('custom_fields').insert({
        table_name: targetTable,
        field_name: mapping.newFieldName,
        field_type: mapping.newFieldType,
        display_name: mapping.csvColumn,
        is_required: false,
        default_value: null
      })

      if (error) {
        console.error('Error creating custom field:', error)
        return false
      }

      // Reload custom fields
      await loadCustomFields()
      return true
    } catch (err) {
      console.error('Failed to create custom field:', err)
      return false
    }
  }

  const handleProceedToPreview = async () => {
    // Create any new custom fields first
    const newFieldMappings = fieldMappings.filter(m => m.createNew && m.newFieldName)

    for (const mapping of newFieldMappings) {
      const success = await createCustomField(mapping)
      if (!success) {
        onShowToast(`Failed to create field: ${mapping.newFieldName}`, 'error')
        return
      }
    }

    setStep('preview')
  }

  const getMappedData = (): Record<string, unknown>[] => {
    return csvData.map(row => {
      const mappedRow: Record<string, unknown> = {}

      fieldMappings.forEach(mapping => {
        const value = row[mapping.csvColumn]

        if (mapping.systemField) {
          // Map to system field
          const fieldName = mapping.systemField.startsWith('custom:')
            ? mapping.systemField.replace('custom:', '')
            : mapping.systemField
          mappedRow[fieldName] = convertValue(value, mapping)
        } else if (mapping.createNew && mapping.newFieldName) {
          // Will be stored in custom_data JSON column
          if (!mappedRow.custom_data) {
            mappedRow.custom_data = {}
          }
          (mappedRow.custom_data as Record<string, unknown>)[mapping.newFieldName] = convertValue(value, mapping)
        }
      })

      return mappedRow
    })
  }

  const convertValue = (value: string, mapping: FieldMapping): unknown => {
    if (!value || value.trim() === '') return null

    const type = mapping.systemField
      ? systemFields[targetTable]?.find(f => f.name === mapping.systemField)?.type || 'text'
      : mapping.newFieldType

    switch (type) {
      case 'number':
        const num = parseFloat(value.replace(/[,$]/g, ''))
        return isNaN(num) ? null : num
      case 'boolean':
        return ['true', 'yes', '1'].includes(value.toLowerCase())
      case 'date':
        try {
          return new Date(value).toISOString()
        } catch {
          return null
        }
      case 'json':
        if (value.includes(';')) {
          return value.split(';').map(v => v.trim()).filter(Boolean)
        }
        return value
      default:
        return value.trim()
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setStep('importing')
    setImportErrors([])

    const mappedData = getMappedData()
    setImportProgress({ current: 0, total: mappedData.length })

    const errors: string[] = []
    let successCount = 0

    for (let i = 0; i < mappedData.length; i++) {
      const row = mappedData[i]
      setImportProgress({ current: i + 1, total: mappedData.length })

      try {
        if (targetTable === 'companies') {
          if (!row.name) {
            errors.push(`Row ${i + 2}: Name is required`)
            continue
          }

          const companyData = {
            name: row.name as string,
            industry: row.industry || null,
            website: row.website || null,
            phone: row.phone || null,
            address: row.address || null,
            city: row.city || null,
            state: row.state || null,
            zip: row.zip || null,
            status: (['active', 'inactive', 'prospect', 'vip'].includes(row.status as string) ? row.status : 'active'),
            tags: Array.isArray(row.tags) ? row.tags : [],
            notes: row.notes || null,
            mc_number: row.mc_number || null,
            dot_number: row.dot_number || null,
            credit_limit: row.credit_limit || null,
            payment_terms: row.payment_terms || null,
            billing_email: row.billing_email || null,
            custom_data: row.custom_data || null
          }

          const { error } = await supabase.from('companies').insert(companyData)
          if (error) throw error

        } else if (targetTable === 'customers') {
          if (!row.name) {
            errors.push(`Row ${i + 2}: Name is required`)
            continue
          }

          const customerData = {
            name: row.name as string,
            company: row.company || null,
            email: row.email || null,
            phone: row.phone || null,
            address: row.address || null,
            billing_address: row.billing_address || null,
            billing_city: row.billing_city || null,
            billing_state: row.billing_state || null,
            billing_zip: row.billing_zip || null,
            payment_terms: row.payment_terms || null,
            notes: row.notes || null,
            mc_number: row.mc_number || null,
            dot_number: row.dot_number || null,
            credit_limit: row.credit_limit || null,
            custom_data: row.custom_data || null
          }

          const { error } = await supabase.from('customers').insert(customerData)
          if (error) throw error

        } else if (targetTable === 'contacts') {
          if (!row.first_name) {
            errors.push(`Row ${i + 2}: First name is required`)
            continue
          }

          // Look up company ID if company_name provided
          let companyId = null
          if (row.company_name) {
            const { data: company } = await supabase
              .from('companies')
              .select('id')
              .ilike('name', row.company_name as string)
              .single()
            if (company) companyId = company.id
          }

          const contactData = {
            first_name: row.first_name as string,
            last_name: row.last_name || null,
            title: row.title || null,
            email: row.email || null,
            phone: row.phone || null,
            mobile: row.mobile || null,
            role: (['general', 'decision_maker', 'billing', 'operations', 'technical'].includes(row.role as string) ? row.role : 'general'),
            company_id: companyId,
            notes: row.notes || null,
            is_primary: row.is_primary || false,
            custom_data: row.custom_data || null
          }

          const { error } = await supabase.from('contacts').insert(contactData)
          if (error) throw error
        }

        successCount++
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Row ${i + 2}: ${errorMsg}`)
      }
    }

    setImportErrors(errors)
    setIsImporting(false)

    if (successCount > 0) {
      onShowToast(`Successfully imported ${successCount} records`, 'success')
      if (errors.length === 0) {
        onImportComplete?.()
        onClose?.()
      }
    } else if (errors.length > 0) {
      onShowToast('Import failed. Check errors below.', 'error')
    }
  }

  const getUnmappedRequired = () => {
    const required = systemFields[targetTable]?.filter(f => f.required) || []
    const mappedFields = fieldMappings
      .filter(m => m.systemField)
      .map(m => m.systemField)

    return required.filter(r => !mappedFields.includes(r.name))
  }

  const renderUploadStep = () => (
    <div className="p-8 text-center">
      <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Your CSV File</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Import {targetTable} from your existing TMS. We&apos;ll help you map fields to match your data.
      </p>
      <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Select CSV File
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>
      <p className="text-xs text-gray-400 mt-4">
        Supported format: CSV (comma-separated values)
      </p>
    </div>
  )

  const renderMappingStep = () => {
    const unmappedRequired = getUnmappedRequired()
    const allSystemFields = [
      ...(systemFields[targetTable] || []),
      ...customFields.map(cf => ({ name: `custom:${cf.field_name}`, type: cf.field_type, required: cf.is_required, displayName: cf.display_name }))
    ]

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Map Your Fields</h3>
          <p className="text-sm text-gray-500 mt-1">
            Match CSV columns to system fields. Unmapped columns can be skipped or added as custom fields.
          </p>
          {unmappedRequired.length > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Required fields not mapped:</span>{' '}
                {unmappedRequired.map(f => f.name).join(', ')}
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {fieldMappings.map((mapping, index) => (
              <div key={mapping.csvColumn} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {/* CSV Column Info */}
                  <div className="w-1/3">
                    <div className="font-medium text-gray-900">{mapping.csvColumn}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Samples: {mapping.sampleValues.slice(0, 3).join(', ') || 'No data'}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center pt-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>

                  {/* Mapping Options */}
                  <div className="flex-1 space-y-2">
                    {!mapping.createNew ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={mapping.systemField || ''}
                          onChange={(e) => updateMapping(index, { systemField: e.target.value || null })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                        >
                          <option value="">-- Skip this field --</option>
                          <optgroup label="System Fields">
                            {systemFields[targetTable]?.map(f => (
                              <option key={f.name} value={f.name}>
                                {f.name.replace(/_/g, ' ')} {f.required ? '*' : ''}
                              </option>
                            ))}
                          </optgroup>
                          {customFields.length > 0 && (
                            <optgroup label="Custom Fields">
                              {customFields.map(cf => (
                                <option key={cf.id} value={`custom:${cf.field_name}`}>
                                  {cf.display_name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <button
                          onClick={() => updateMapping(index, { createNew: true })}
                          className="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg whitespace-nowrap"
                        >
                          + New Field
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-indigo-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-indigo-800">Create New Custom Field</span>
                          <button
                            onClick={() => updateMapping(index, { createNew: false })}
                            className="text-xs text-indigo-600 hover:text-indigo-700"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={mapping.newFieldName}
                            onChange={(e) => updateMapping(index, {
                              newFieldName: e.target.value.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '')
                            })}
                            placeholder="field_name"
                            className="px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-200"
                          />
                          <select
                            value={mapping.newFieldType}
                            onChange={(e) => updateMapping(index, { newFieldType: e.target.value as FieldMapping['newFieldType'] })}
                            className="px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-200"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="boolean">Yes/No</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => setStep('upload')}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={handleProceedToPreview}
            disabled={unmappedRequired.length > 0}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Preview
          </button>
        </div>
      </div>
    )
  }

  const renderPreviewStep = () => {
    const mappedData = getMappedData()
    const activeMappings = fieldMappings.filter(m => m.systemField || (m.createNew && m.newFieldName))

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Preview Import</h3>
          <p className="text-sm text-gray-500 mt-1">
            Review your data before importing. {mappedData.length} records will be imported.
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                  {activeMappings.map(m => (
                    <th key={m.csvColumn} className="px-3 py-2 text-left font-medium text-gray-500">
                      {m.systemField?.replace('custom:', '') || m.newFieldName}
                      <span className="block text-xs font-normal text-gray-400">
                        from: {m.csvColumn}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappedData.slice(0, 50).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    {activeMappings.map(m => {
                      const fieldName = m.systemField?.replace('custom:', '') || m.newFieldName
                      let value = row[fieldName]

                      // Check custom_data for new fields
                      if (!value && m.createNew && row.custom_data) {
                        value = (row.custom_data as Record<string, unknown>)[m.newFieldName]
                      }

                      return (
                        <td key={m.csvColumn} className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                          {value !== null && value !== undefined ? String(value) : '-'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {mappedData.length > 50 && (
              <p className="text-center text-gray-500 text-sm mt-4">
                Showing first 50 of {mappedData.length} records
              </p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => setStep('mapping')}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            Back to Mapping
          </button>
          <button
            onClick={handleImport}
            className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Import {mappedData.length} Records
          </button>
        </div>
      </div>
    )
  }

  const renderImportingStep = () => (
    <div className="p-8 text-center">
      <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
        {isImporting ? (
          <svg className="animate-spin w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {isImporting ? (
        <>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Importing...</h3>
          <p className="text-gray-500 mb-4">
            {importProgress.current} of {importProgress.total} records
          </p>
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete</h3>
          <p className="text-gray-500 mb-4">
            Successfully imported {importProgress.total - importErrors.length} of {importProgress.total} records
          </p>

          {importErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left max-h-48 overflow-auto">
              <h4 className="font-medium text-red-800 mb-2">Errors ({importErrors.length})</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {importErrors.slice(0, 20).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {importErrors.length > 20 && (
                  <li className="text-red-600">...and {importErrors.length - 20} more errors</li>
                )}
              </ul>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
          >
            Done
          </button>
        </>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Import {targetTable.charAt(0).toUpperCase() + targetTable.slice(1)}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              {['upload', 'mapping', 'preview', 'importing'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step === s ? 'bg-indigo-600 text-white' :
                    ['upload', 'mapping', 'preview', 'importing'].indexOf(step) > i ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {['upload', 'mapping', 'preview', 'importing'].indexOf(step) > i ? '✓' : i + 1}
                  </div>
                  {i < 3 && (
                    <div className={`w-8 h-0.5 ${
                      ['upload', 'mapping', 'preview', 'importing'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          {step !== 'importing' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {step === 'upload' && renderUploadStep()}
          {step === 'mapping' && renderMappingStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'importing' && renderImportingStep()}
        </div>
      </div>
    </div>
  )
}
