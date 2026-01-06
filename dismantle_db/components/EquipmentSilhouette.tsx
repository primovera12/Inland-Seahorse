'use client'

import { EquipmentSilhouetteType } from '@/lib/supabase'

interface EquipmentSilhouetteProps {
  type: EquipmentSilhouetteType
  width?: number
  height?: number
  className?: string
  showDimensions?: boolean
  dimensions?: {
    length?: number | null
    width?: number | null
    height?: number | null
  }
}

// Detect equipment type based on make and model names
export function detectEquipmentType(make: string, model: string): EquipmentSilhouetteType {
  const makeLower = make.toLowerCase()
  const modelLower = model.toLowerCase()
  const combined = `${makeLower} ${modelLower}`

  // Excavators - check first as most common
  if (
    modelLower.match(/^3[0-9]{2}/) || // Cat 300 series
    modelLower.match(/^zx[0-9]/) || // Hitachi ZX
    modelLower.match(/^pc[0-9]/) || // Komatsu PC
    modelLower.match(/^ec[0-9]/) || // Volvo EC
    modelLower.match(/^cx[0-9]/) || // Case CX
    modelLower.match(/^sk[0-9]/) || // Kobelco SK
    modelLower.match(/^js[0-9]/) || // JCB JS
    modelLower.match(/^hx[0-9]/) || // Hyundai HX
    modelLower.match(/^dx[0-9]/) || // Doosan DX
    modelLower.match(/^r[0-9]{3}/) && makeLower === 'liebherr' || // Liebherr R
    modelLower.match(/^e[0-9]/) && makeLower === 'bobcat' || // Bobcat E series
    modelLower.match(/^tb[0-9]/) || // Takeuchi TB
    modelLower.match(/^kx[0-9]/) || // Kubota KX
    modelLower.match(/^u[0-9]/) && makeLower === 'kubota' || // Kubota U
    modelLower.match(/^vio[0-9]/) || // Yanmar VIO
    modelLower.match(/^sy[0-9]/) || // SANY SY
    modelLower.match(/^ez[0-9]/) || // Wacker Neuson EZ
    modelLower.match(/^sh[0-9]/) || // Sumitomo SH
    combined.includes('excavator') ||
    makeLower === 'link-belt' ||
    makeLower === 'ihi' ||
    makeLower === 'gradall' ||
    makeLower === 'sennebogen'
  ) {
    return 'excavator'
  }

  // Wheel Loaders
  if (
    modelLower.match(/^9[0-9]{2}/) && makeLower === 'caterpillar' || // Cat 9xx
    modelLower.match(/^wa[0-9]/) || // Komatsu WA
    modelLower.match(/^l[0-9]/) && makeLower === 'volvo' || // Volvo L
    modelLower.match(/^[0-9]+k$/) && makeLower === 'john deere' || // John Deere xxK
    modelLower.match(/^hl[0-9]/) || // Hyundai HL
    modelLower.match(/^dl[0-9]/) || // Doosan DL
    modelLower.match(/^l5[0-9]/) && makeLower === 'liebherr' || // Liebherr L5xx
    combined.includes('wheel loader') ||
    combined.includes('loader') && !combined.includes('track') && !combined.includes('skid')
  ) {
    return 'wheel_loader'
  }

  // Bulldozers/Dozers
  if (
    modelLower.match(/^d[5-9]$/) || modelLower.match(/^d[5-9][a-z]/) || // Cat D5-D9
    modelLower.match(/^d1[0-1]/) || // Cat D10, D11
    modelLower.match(/^d[0-9]/) && makeLower === 'komatsu' || // Komatsu D series
    modelLower.match(/^[0-9]+m$/) && makeLower === 'case' || // Case xxM dozers
    combined.includes('dozer') ||
    combined.includes('bulldozer')
  ) {
    return 'bulldozer'
  }

  // Compact Track Loaders (CTL)
  if (
    modelLower.match(/^2[0-9]{2}d3?$/) && makeLower === 'caterpillar' || // Cat 2xxD/D3
    modelLower.match(/^t[0-9]/) && makeLower === 'bobcat' || // Bobcat T series
    modelLower.match(/^tr[0-9]/) || // Case TR
    modelLower.match(/^3[1-3][0-9]g$/) && makeLower === 'john deere' || // John Deere 31xG-33xG
    modelLower.match(/^svl[0-9]/) || // Kubota SVL
    modelLower.match(/^tl[0-9]/) && makeLower === 'takeuchi' || // Takeuchi TL
    modelLower.match(/^rt/) && (makeLower === 'asv' || makeLower === 'mustang') || // ASV/Mustang RT
    modelLower.match(/^c[0-9]/) && makeLower === 'new holland' || // New Holland C
    combined.includes('track loader') ||
    combined.includes('ctl')
  ) {
    return 'compact_track_loader'
  }

  // Skid Steers
  if (
    modelLower.match(/^s[0-9]/) && makeLower === 'bobcat' || // Bobcat S series
    modelLower.match(/^sv[0-9]/) && makeLower === 'case' || // Case SV
    modelLower.match(/^ssv[0-9]/) || // Kubota SSV
    modelLower.match(/^l[0-9]/) && makeLower === 'new holland' || // New Holland L
    modelLower.match(/^r[0-9]/) && makeLower === 'gehl' || // Gehl R
    modelLower.match(/^v[0-9]/) && makeLower === 'gehl' || // Gehl V
    combined.includes('skid steer') ||
    combined.includes('skid-steer')
  ) {
    return 'skid_steer'
  }

  // Telehandlers
  if (
    modelLower.match(/^g[0-9]/) && makeLower === 'jlg' || // JLG G series
    modelLower.match(/^gth/) || // Genie GTH
    modelLower.match(/^mt[0-9]/) && makeLower === 'manitou' || // Manitou MT
    modelLower.match(/^th[0-9]/) || // CAT TH
    combined.includes('telehandler') ||
    combined.includes('reach forklift')
  ) {
    return 'telehandler'
  }

  // Backhoe Loaders
  if (
    modelLower.match(/^4[0-9]{2}f/) || modelLower.match(/^4[0-9]{2}xe/) || // Cat 4xxF
    modelLower.match(/^440/) && makeLower === 'caterpillar' ||
    modelLower.match(/^58[0-9]/) || modelLower.match(/^59[0-9]/) || // Case 580/590
    modelLower.match(/^[3-5]cx/) || // JCB 3CX/4CX/5CX
    modelLower.match(/^[34][0-9]{2}[ls]/) && makeLower === 'john deere' || // John Deere 3xxL/4xxL
    modelLower.match(/^b[0-9]/) && makeLower === 'new holland' || // New Holland B
    combined.includes('backhoe')
  ) {
    return 'backhoe'
  }

  // Articulated Dump Trucks (ADT)
  if (
    modelLower.match(/^7[234][05]$/) && makeLower === 'caterpillar' || // Cat 725/730/740
    modelLower.match(/^a[234][05]/) && makeLower === 'volvo' || // Volvo A25/A30/A40
    modelLower.match(/^hm[0-9]/) || // Komatsu HM
    modelLower.match(/^b[234][05]/) && makeLower === 'bell' || // Bell B25/B30/B40
    combined.includes('dump truck') ||
    combined.includes('articulated') ||
    combined.includes('adt')
  ) {
    return 'dump_truck'
  }

  // Motor Graders
  if (
    modelLower.match(/^1[246]0$/) || modelLower.match(/^1[246][0-9][a-z]/) || // Cat 120/140/160
    modelLower.match(/^gd[0-9]/) || // Komatsu GD
    modelLower.match(/^6[0-9]{2}g$/) && makeLower === 'john deere' || // John Deere 6xxG
    combined.includes('grader') ||
    combined.includes('motor grader')
  ) {
    return 'motor_grader'
  }

  // Rollers/Compactors
  if (
    modelLower.match(/^cb[0-9]/) || modelLower.match(/^cs[0-9]/) || modelLower.match(/^cc[0-9]/) || // Cat rollers
    makeLower === 'hamm' ||
    makeLower === 'dynapac' ||
    makeLower === 'bomag' ||
    makeLower === 'sakai' ||
    modelLower.match(/^dd[0-9]/) && makeLower === 'volvo' || // Volvo DD
    modelLower.match(/^sd[0-9]/) && makeLower === 'volvo' || // Volvo SD
    combined.includes('roller') ||
    combined.includes('compactor')
  ) {
    return 'roller'
  }

  // Forklifts
  if (
    combined.includes('forklift') ||
    combined.includes('fork lift') ||
    makeLower === 'hyster' ||
    makeLower === 'yale' ||
    makeLower === 'crown' ||
    makeLower === 'toyota forklift'
  ) {
    return 'forklift'
  }

  // Cranes
  if (
    combined.includes('crane') ||
    makeLower === 'grove' ||
    makeLower === 'tadano' ||
    makeLower === 'manitowoc' ||
    modelLower.match(/^ltm/) || modelLower.match(/^ltr/) // Liebherr cranes
  ) {
    return 'crane'
  }

  return 'other'
}

// SVG silhouettes for each equipment type
const silhouettes: Record<EquipmentSilhouetteType, JSX.Element> = {
  excavator: (
    <g>
      {/* Track base */}
      <rect x="10" y="70" width="60" height="12" rx="3" fill="currentColor" />
      <rect x="8" y="68" width="64" height="4" rx="2" fill="currentColor" />
      {/* Upper structure */}
      <rect x="20" y="45" width="45" height="25" rx="3" fill="currentColor" />
      {/* Cab */}
      <rect x="45" y="35" width="18" height="15" rx="2" fill="currentColor" />
      {/* Boom */}
      <polygon points="25,50 5,25 10,22 32,48" fill="currentColor" />
      {/* Stick */}
      <polygon points="5,25 -5,45 0,47 10,27" fill="currentColor" />
      {/* Bucket */}
      <polygon points="-5,45 -15,55 -5,60 5,50" fill="currentColor" />
      {/* Counterweight */}
      <rect x="55" y="50" width="12" height="18" rx="2" fill="currentColor" />
    </g>
  ),
  wheel_loader: (
    <g>
      {/* Rear wheel */}
      <circle cx="20" cy="70" r="14" fill="currentColor" />
      <circle cx="20" cy="70" r="8" fill="white" opacity="0.3" />
      {/* Front wheel */}
      <circle cx="65" cy="70" r="14" fill="currentColor" />
      <circle cx="65" cy="70" r="8" fill="white" opacity="0.3" />
      {/* Body */}
      <rect x="10" y="45" width="55" height="20" rx="3" fill="currentColor" />
      {/* Cab */}
      <rect x="20" y="28" width="25" height="20" rx="2" fill="currentColor" />
      {/* Boom arms */}
      <polygon points="55,50 80,35 82,40 58,53" fill="currentColor" />
      <polygon points="55,55 80,45 82,50 58,58" fill="currentColor" />
      {/* Bucket */}
      <polygon points="78,32 95,30 95,55 78,50" fill="currentColor" />
    </g>
  ),
  bulldozer: (
    <g>
      {/* Tracks */}
      <rect x="5" y="65" width="70" height="15" rx="5" fill="currentColor" />
      {/* Body */}
      <rect x="15" y="40" width="55" height="28" rx="3" fill="currentColor" />
      {/* Cab */}
      <rect x="40" y="22" width="25" height="20" rx="2" fill="currentColor" />
      {/* Blade */}
      <rect x="-5" y="45" width="8" height="30" rx="2" fill="currentColor" />
      {/* Push arms */}
      <rect x="0" y="50" width="18" height="4" fill="currentColor" />
      <rect x="0" y="60" width="18" height="4" fill="currentColor" />
      {/* Ripper */}
      <polygon points="72,68 85,68 82,80 72,80" fill="currentColor" />
    </g>
  ),
  skid_steer: (
    <g>
      {/* Left wheels */}
      <circle cx="20" cy="70" r="10" fill="currentColor" />
      {/* Right wheels */}
      <circle cx="60" cy="70" r="10" fill="currentColor" />
      {/* Body */}
      <rect x="12" y="40" width="56" height="25" rx="3" fill="currentColor" />
      {/* Cab */}
      <rect x="25" y="25" width="30" height="18" rx="2" fill="currentColor" />
      {/* Lift arms */}
      <polygon points="65,45 85,30 87,35 68,48" fill="currentColor" />
      <polygon points="65,55 85,45 87,50 68,58" fill="currentColor" />
      {/* Bucket */}
      <polygon points="83,28 98,25 98,52 83,48" fill="currentColor" />
    </g>
  ),
  compact_track_loader: (
    <g>
      {/* Tracks */}
      <rect x="8" y="62" width="25" height="18" rx="5" fill="currentColor" />
      <rect x="47" y="62" width="25" height="18" rx="5" fill="currentColor" />
      {/* Body */}
      <rect x="12" y="38" width="56" height="28" rx="3" fill="currentColor" />
      {/* Cab */}
      <rect x="25" y="22" width="30" height="18" rx="2" fill="currentColor" />
      {/* Lift arms */}
      <polygon points="65,42 85,28 87,33 68,45" fill="currentColor" />
      <polygon points="65,55 85,45 87,50 68,58" fill="currentColor" />
      {/* Bucket */}
      <polygon points="83,25 98,22 98,52 83,48" fill="currentColor" />
    </g>
  ),
  backhoe: (
    <g>
      {/* Rear wheels */}
      <circle cx="18" cy="68" r="14" fill="currentColor" />
      <circle cx="18" cy="68" r="8" fill="white" opacity="0.3" />
      {/* Front wheels */}
      <circle cx="58" cy="72" r="8" fill="currentColor" />
      {/* Body */}
      <rect x="8" y="45" width="55" height="18" rx="3" fill="currentColor" />
      {/* Cab */}
      <rect x="28" y="28" width="22" height="20" rx="2" fill="currentColor" />
      {/* Front loader */}
      <polygon points="58,48 75,38 77,43 60,52" fill="currentColor" />
      <polygon points="73,35 88,32 88,50 73,46" fill="currentColor" />
      {/* Backhoe boom */}
      <polygon points="12,48 -5,30 -2,27 15,45" fill="currentColor" />
      {/* Backhoe stick */}
      <polygon points="-5,30 -15,48 -12,50 -2,33" fill="currentColor" />
      {/* Backhoe bucket */}
      <polygon points="-15,48 -22,58 -12,60 -8,52" fill="currentColor" />
    </g>
  ),
  forklift: (
    <g>
      {/* Rear wheel */}
      <circle cx="25" cy="72" r="10" fill="currentColor" />
      {/* Front wheel */}
      <circle cx="60" cy="72" r="8" fill="currentColor" />
      {/* Body */}
      <rect x="18" y="45" width="48" height="22" rx="3" fill="currentColor" />
      {/* Cab/cage */}
      <rect x="25" y="25" width="28" height="22" rx="2" fill="currentColor" />
      <rect x="28" y="28" width="22" height="12" rx="1" fill="white" opacity="0.2" />
      {/* Mast */}
      <rect x="62" y="15" width="4" height="55" fill="currentColor" />
      <rect x="68" y="15" width="4" height="55" fill="currentColor" />
      {/* Forks */}
      <rect x="72" y="55" width="22" height="3" fill="currentColor" />
      <rect x="72" y="62" width="22" height="3" fill="currentColor" />
      {/* Carriage */}
      <rect x="62" y="48" width="12" height="22" fill="currentColor" />
    </g>
  ),
  crane: (
    <g>
      {/* Outriggers */}
      <rect x="0" y="72" width="20" height="8" fill="currentColor" />
      <rect x="70" y="72" width="20" height="8" fill="currentColor" />
      {/* Carrier */}
      <rect x="8" y="55" width="74" height="20" rx="3" fill="currentColor" />
      {/* Superstructure */}
      <rect x="25" y="40" width="40" height="18" rx="3" fill="currentColor" />
      {/* Cab */}
      <rect x="55" y="28" width="15" height="15" rx="2" fill="currentColor" />
      {/* Boom */}
      <polygon points="30,42 -10,5 -5,2 35,38" fill="currentColor" />
      {/* Hook block */}
      <rect x="-12" y="0" width="8" height="8" fill="currentColor" />
      <rect x="-10" y="8" width="4" height="6" fill="currentColor" />
    </g>
  ),
  dump_truck: (
    <g>
      {/* Rear wheels (dual) */}
      <circle cx="18" cy="70" r="12" fill="currentColor" />
      <circle cx="18" cy="70" r="6" fill="white" opacity="0.3" />
      {/* Front wheel */}
      <circle cx="70" cy="70" r="12" fill="currentColor" />
      <circle cx="70" cy="70" r="6" fill="white" opacity="0.3" />
      {/* Dump body */}
      <polygon points="5,30 5,60 55,60 55,45 35,30" fill="currentColor" />
      {/* Cab */}
      <rect x="55" y="42" width="22" height="20" rx="3" fill="currentColor" />
      {/* Articulation joint */}
      <circle cx="55" cy="55" r="5" fill="currentColor" />
      {/* Exhaust */}
      <rect x="75" y="30" width="3" height="15" fill="currentColor" />
    </g>
  ),
  motor_grader: (
    <g>
      {/* Rear tandem wheels */}
      <circle cx="12" cy="70" r="10" fill="currentColor" />
      <circle cx="30" cy="70" r="10" fill="currentColor" />
      {/* Front wheels */}
      <circle cx="78" cy="70" r="8" fill="currentColor" />
      {/* Frame */}
      <rect x="5" y="50" width="80" height="15" rx="2" fill="currentColor" />
      {/* Engine housing */}
      <rect x="5" y="40" width="30" height="15" rx="2" fill="currentColor" />
      {/* Cab */}
      <rect x="40" y="28" width="25" height="25" rx="2" fill="currentColor" />
      {/* Blade circle */}
      <ellipse cx="55" cy="68" rx="15" ry="3" fill="currentColor" />
      {/* Blade */}
      <rect x="40" y="62" width="30" height="8" fill="currentColor" transform="rotate(-15, 55, 66)" />
      {/* Scarifier */}
      <polygon points="82,68 90,68 88,78 80,78" fill="currentColor" />
    </g>
  ),
  roller: (
    <g>
      {/* Rear drum */}
      <ellipse cx="22" cy="68" rx="18" ry="12" fill="currentColor" />
      <ellipse cx="22" cy="68" rx="12" ry="8" fill="white" opacity="0.2" />
      {/* Front drum */}
      <ellipse cx="68" cy="68" rx="18" ry="12" fill="currentColor" />
      <ellipse cx="68" cy="68" rx="12" ry="8" fill="white" opacity="0.2" />
      {/* Body */}
      <rect x="28" y="45" width="35" height="18" rx="3" fill="currentColor" />
      {/* Cab */}
      <rect x="35" y="28" width="22" height="20" rx="2" fill="currentColor" />
      {/* ROPS */}
      <rect x="33" y="22" width="2" height="30" fill="currentColor" />
      <rect x="55" y="22" width="2" height="30" fill="currentColor" />
      <rect x="33" y="20" width="24" height="4" fill="currentColor" />
    </g>
  ),
  telehandler: (
    <g>
      {/* Rear wheel */}
      <circle cx="18" cy="70" r="12" fill="currentColor" />
      <circle cx="18" cy="70" r="6" fill="white" opacity="0.3" />
      {/* Front wheel */}
      <circle cx="62" cy="70" r="12" fill="currentColor" />
      <circle cx="62" cy="70" r="6" fill="white" opacity="0.3" />
      {/* Body */}
      <rect x="10" y="48" width="55" height="18" rx="3" fill="currentColor" />
      {/* Cab */}
      <rect x="15" y="30" width="25" height="20" rx="2" fill="currentColor" />
      {/* Boom */}
      <polygon points="50,50 88,15 92,20 55,52" fill="currentColor" />
      {/* Carriage */}
      <rect x="85" y="8" width="10" height="15" fill="currentColor" />
      {/* Forks */}
      <rect x="88" y="22" width="12" height="3" fill="currentColor" />
      <rect x="88" y="28" width="12" height="3" fill="currentColor" />
    </g>
  ),
  other: (
    <g>
      {/* Generic equipment silhouette */}
      <rect x="10" y="55" width="70" height="25" rx="5" fill="currentColor" />
      <rect x="20" y="35" width="40" height="22" rx="3" fill="currentColor" />
      <circle cx="25" cy="75" r="8" fill="currentColor" />
      <circle cx="65" cy="75" r="8" fill="currentColor" />
    </g>
  ),
}

export default function EquipmentSilhouette({
  type,
  width = 100,
  height = 80,
  className = '',
  showDimensions = false,
  dimensions,
}: EquipmentSilhouetteProps) {
  return (
    <div className={`relative ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="-25 0 125 85"
        className="text-gray-600"
      >
        {silhouettes[type]}
      </svg>
      {showDimensions && dimensions && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Length annotation */}
          {dimensions.length && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] text-blue-600 font-medium bg-white/80 px-1 rounded">
              L: {dimensions.length}"
            </div>
          )}
          {/* Width annotation */}
          {dimensions.width && (
            <div className="absolute top-1/2 right-0 -translate-y-1/2 text-[8px] text-green-600 font-medium bg-white/80 px-1 rounded">
              W: {dimensions.width}"
            </div>
          )}
          {/* Height annotation */}
          {dimensions.height && (
            <div className="absolute top-0 left-0 text-[8px] text-orange-600 font-medium bg-white/80 px-1 rounded">
              H: {dimensions.height}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Equipment type labels for display
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentSilhouetteType, string> = {
  excavator: 'Excavator',
  wheel_loader: 'Wheel Loader',
  bulldozer: 'Bulldozer',
  skid_steer: 'Skid Steer',
  compact_track_loader: 'Compact Track Loader',
  backhoe: 'Backhoe Loader',
  forklift: 'Forklift',
  crane: 'Crane',
  dump_truck: 'Dump Truck',
  motor_grader: 'Motor Grader',
  roller: 'Roller/Compactor',
  telehandler: 'Telehandler',
  other: 'Other Equipment',
}

// Get all equipment types for dropdown
export const EQUIPMENT_TYPES: EquipmentSilhouetteType[] = [
  'excavator',
  'wheel_loader',
  'bulldozer',
  'skid_steer',
  'compact_track_loader',
  'backhoe',
  'forklift',
  'crane',
  'dump_truck',
  'motor_grader',
  'roller',
  'telehandler',
  'other',
]
