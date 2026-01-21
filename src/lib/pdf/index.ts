// Unified PDF Generator
// Professional quote PDF generation with HTML/CSS design

// Types
export type {
  UnifiedPDFData,
  CompanyInfo,
  CustomerInfo,
  EquipmentInfo,
  EquipmentDimensions,
  AddressInfo,
  InlandTransportInfo,
  ServiceLineItem,
  CostCategory,
} from './types'

export {
  COST_FIELD_CATEGORIES,
  CATEGORY_STYLES,
  COST_LABELS,
  transformQuoteDataToPDF,
  settingsToCompanyInfo,
  buildUnifiedPDFData,
  generateServiceLineItems,
  unifiedPDFDataToMultiEquipmentPDF,
} from './types'

// Utilities
export {
  formatCurrency,
  formatDimension,
  formatWeight,
  formatDimensionWithMetric,
  formatWeightWithMetric,
  formatAddress,
  formatAddressMultiline,
  getLocationInfo,
  getQuoteTitle,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  hexToRgb,
  loadImageAsBase64,
  preloadPDFImages,
  PRINT_STYLES,
} from './pdf-utils'

// Components
export { QuotePDFTemplate, default as QuotePDFTemplateDefault } from './components/QuotePDFTemplate'
export { QuotePDFPreview, QuotePDFDownloadButton } from './components/QuotePDFPreview'

// Generator functions
export {
  generatePDFFromElement,
  downloadUnifiedPDF,
  getUnifiedPDFBlob,
  getUnifiedPDFDataUrl,
  generateUnifiedPDFDirect,
  printQuote,
  previewUnifiedPDF,
  type GeneratePDFOptions,
} from './unified-pdf-generator'

// Hooks
export { useQuotePDF, type UseQuotePDFReturn } from './hooks/useQuotePDF'

// Legacy exports (keep backward compatibility)
export {
  generateQuotePDFAsync,
  generateQuotePDF,
  downloadQuotePDF,
  downloadQuotePDFAsync,
  getQuotePDFBlob,
  getQuotePDFBlobAsync,
  getQuotePDFDataUrl,
  getQuotePDFDataUrlAsync,
  type QuotePDFData,
  type InlandTransportPDFData,
  // Multi-equipment support
  generateMultiEquipmentQuotePDFAsync,
  generateMultiEquipmentQuotePDF,
  downloadMultiEquipmentQuotePDFAsync,
  downloadMultiEquipmentQuotePDF,
  getMultiEquipmentQuotePDFBlobAsync,
  getMultiEquipmentQuotePDFDataUrlAsync,
  type MultiEquipmentPDFData,
  type EquipmentBlockPDF,
} from './quote-generator'

export {
  generateInlandQuotePDFAsync,
  generateInlandQuotePDF,
  downloadInlandQuotePDF,
  downloadInlandQuotePDFAsync,
  getInlandQuotePDFBlob,
  getInlandQuotePDFBlobAsync,
  getInlandQuotePDFDataUrl,
  getInlandQuotePDFDataUrlAsync,
  type InlandQuotePDFData,
} from './inland-quote-generator'

// Load Plan PDF Integration (Phase 6)
export {
  addLoadPlanSection,
  addPermitSummary,
  preRenderLoadPlanSvgs,
  type LoadPlanSectionOptions,
  type PermitSummaryData,
  type PermitSummaryOptions,
} from './load-plan-pdf'
