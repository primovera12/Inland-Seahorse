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
 */

export { UniversalDropzone } from './UniversalDropzone'
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
