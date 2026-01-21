/**
 * Load Planner UI Components
 *
 * React components for the load planner integration:
 * - UniversalDropzone: Drag-drop file upload with AI analysis
 * - TrailerDiagram: SVG top/side view visualizations
 * - LoadPlanVisualizer: Full load plan display with truck cards
 * - ExtractedItemsList: Editable cargo item list
 * - TruckSelector: Truck selection dropdown with fit analysis
 * - LoadPlanPDFRenderer: SVG rendering functions for PDF generation
 * - AICargoParser: AI-powered cargo parsing with confidence preview (Phase 7)
 * - RouteIntelligence: Route analysis with permits, seasonal, bridges (Phase 8)
 */

export { UniversalDropzone } from './UniversalDropzone'
export { AICargoParser } from './AICargoParser'
export { TrailerDiagram } from './TrailerDiagram'
export { LoadPlanVisualizer, getItemColor } from './LoadPlanVisualizer'
export { ExtractedItemsList } from './ExtractedItemsList'
export { TruckSelector } from './TruckSelector'

// PDF Rendering utilities (Phase 6)
export {
  renderTopViewSvg,
  renderSideViewSvg,
  svgToDataUrl,
  calculateMaxHeightUsed,
} from './LoadPlanPDFRenderer'

// Route Intelligence (Phase 8)
export { RouteIntelligence } from './RouteIntelligence'
export type { RouteIntelligenceProps, RouteIntelligenceState } from './RouteIntelligence'
