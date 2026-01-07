import { jsPDF } from 'jspdf'

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
  }
}

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf'

  interface UserOptions {
    startY?: number
    head?: Array<string[]>
    body?: Array<string[]>
    foot?: Array<string[]>
    theme?: 'striped' | 'grid' | 'plain'
    headStyles?: {
      fillColor?: [number, number, number]
      textColor?: [number, number, number]
      fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic'
      halign?: 'left' | 'center' | 'right'
      valign?: 'top' | 'middle' | 'bottom'
    }
    bodyStyles?: {
      fillColor?: [number, number, number]
      textColor?: [number, number, number]
    }
    alternateRowStyles?: {
      fillColor?: [number, number, number]
    }
    columnStyles?: Record<number, {
      cellWidth?: number | 'auto' | 'wrap'
      halign?: 'left' | 'center' | 'right'
    }>
    margin?: {
      top?: number
      right?: number
      bottom?: number
      left?: number
    }
    styles?: {
      fontSize?: number
      cellPadding?: number
    }
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void
}
