/**
 * Seasonal Weight Restrictions for Load Planner
 *
 * Spring thaw (frost law) restrictions and other seasonal weight limits
 * that affect heavy haul operations in northern US states.
 *
 * These restrictions typically run from late February through late May
 * and can reduce allowed weight by 25-35%.
 */

export interface SeasonalRestriction {
  stateCode: string
  stateName: string
  restrictionName: string
  description: string
  // Typical date range (varies by year based on weather)
  typicalStartMonth: number // 1-12
  typicalStartDay: number
  typicalEndMonth: number
  typicalEndDay: number
  // Weight reduction
  weightReductionPercent: number
  maxGrossWeight?: number // Override max weight during restriction
  axleReductions?: {
    single?: number
    tandem?: number
    tridem?: number
  }
  // Which roads are affected
  affectedRoads: string[]
  exemptRoads: string[]
  // Permit options
  permitAvailable: boolean
  permitFee?: number
  // Resources
  checkWebsite?: string
  phoneNumber?: string
  notes: string[]
}

/**
 * States with spring thaw / frost law restrictions
 * These are states where frozen ground thaws in spring, making roads vulnerable
 */
export const SEASONAL_RESTRICTIONS: SeasonalRestriction[] = [
  {
    stateCode: 'MN',
    stateName: 'Minnesota',
    restrictionName: 'Spring Load Restrictions',
    description: 'Road weight limits reduced during spring thaw to protect road infrastructure',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 15,
    weightReductionPercent: 35,
    maxGrossWeight: 52000,
    axleReductions: {
      single: 13000,
      tandem: 22000,
    },
    affectedRoads: [
      'All state highways (posted roads)',
      'County roads (varies by county)',
      'Township roads',
    ],
    exemptRoads: [
      'Interstate highways',
      '10-ton designated routes',
    ],
    permitAvailable: true,
    permitFee: 120,
    checkWebsite: 'https://www.dot.state.mn.us/loadlimits/',
    phoneNumber: '651-296-3000',
    notes: [
      'Restrictions announced annually based on weather conditions',
      'Check MnDOT website for current road postings',
      'Heavy loads may require alternative routing via interstates',
      'Frost-free dates vary by region (southern MN lifts earlier)',
    ],
  },
  {
    stateCode: 'WI',
    stateName: 'Wisconsin',
    restrictionName: 'Seasonal Weight Limits',
    description: 'Posted weight limits on county and town roads during spring thaw',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 31,
    weightReductionPercent: 25,
    affectedRoads: [
      'Town roads',
      'County trunk highways (when posted)',
      'Some state highways (when posted)',
    ],
    exemptRoads: [
      'Interstate highways',
      'US highways (unless posted)',
    ],
    permitAvailable: true,
    permitFee: 100,
    checkWebsite: 'https://wisconsindot.gov/Pages/doing-bus/businesses/weight-posting.aspx',
    phoneNumber: '608-266-1113',
    notes: [
      'Road postings vary by county - check local road conditions',
      'Posting signs indicate reduced weight limits',
      'Penalties for violations can exceed $500 per offense',
    ],
  },
  {
    stateCode: 'MI',
    stateName: 'Michigan',
    restrictionName: 'Seasonal Weight Restrictions (Frost Law)',
    description: 'Reduced axle weights on state trunklines during spring thaw',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 15,
    weightReductionPercent: 35,
    axleReductions: {
      single: 13230,
      tandem: 22050,
    },
    affectedRoads: [
      'All state trunklines (M-routes)',
      'US routes through Michigan',
      'County primary roads',
    ],
    exemptRoads: [
      'Interstate highways',
      'Designated "all-season" routes',
    ],
    permitAvailable: true,
    permitFee: 150,
    checkWebsite: 'https://www.michigan.gov/mdot/travel/truck-services/oversize-overweight/seasonal-load-restrictions',
    phoneNumber: '517-241-2600',
    notes: [
      'Restrictions typically announced in February',
      'Lifted in stages based on road conditions',
      'All-season route maps available on MDOT website',
      'Penalties start at $150 and increase with severity',
    ],
  },
  {
    stateCode: 'ND',
    stateName: 'North Dakota',
    restrictionName: 'Spring Road Restrictions',
    description: 'Weight restrictions on county and township roads during spring thaw',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 31,
    weightReductionPercent: 30,
    maxGrossWeight: 56000,
    affectedRoads: [
      'County roads',
      'Township roads',
      'Some state highways',
    ],
    exemptRoads: [
      'Interstate highways',
      'US highways',
      'Most numbered state highways',
    ],
    permitAvailable: true,
    permitFee: 75,
    checkWebsite: 'https://www.dot.nd.gov/divisions/maintenance/springloadrestrictions.htm',
    phoneNumber: '701-328-4444',
    notes: [
      'Counties set their own restriction dates',
      'Check with county road departments for current status',
      'Oil field traffic may face additional restrictions',
    ],
  },
  {
    stateCode: 'SD',
    stateName: 'South Dakota',
    restrictionName: 'Frost Law Restrictions',
    description: 'Spring weight restrictions to protect thawing roads',
    typicalStartMonth: 3,
    typicalStartDay: 15,
    typicalEndMonth: 5,
    typicalEndDay: 15,
    weightReductionPercent: 30,
    affectedRoads: [
      'County roads',
      'Township roads',
      'Secondary state highways',
    ],
    exemptRoads: [
      'Interstate highways',
      'Primary state highways',
    ],
    permitAvailable: true,
    permitFee: 50,
    checkWebsite: 'https://dot.sd.gov/transportation/trucking/permitting',
    phoneNumber: '605-773-3265',
    notes: [
      'Restrictions vary by county and road conditions',
      'Eastern SD typically has longer restriction periods',
    ],
  },
  {
    stateCode: 'MT',
    stateName: 'Montana',
    restrictionName: 'Spring Thaw Restrictions',
    description: 'Weight restrictions on secondary highways and local roads',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 31,
    weightReductionPercent: 25,
    affectedRoads: [
      'Secondary highways',
      'County roads',
      'Local roads',
    ],
    exemptRoads: [
      'Interstate highways',
      'Primary state highways',
    ],
    permitAvailable: true,
    permitFee: 100,
    checkWebsite: 'https://www.mdt.mt.gov/travinfo/truckers.aspx',
    phoneNumber: '406-444-6200',
    notes: [
      'Mountain passes may have additional restrictions',
      'Check MDT road reports for current conditions',
    ],
  },
  {
    stateCode: 'WY',
    stateName: 'Wyoming',
    restrictionName: 'Seasonal Load Restrictions',
    description: 'Weight restrictions during spring breakup',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 15,
    weightReductionPercent: 20,
    affectedRoads: [
      'County roads',
      'Some state highways',
    ],
    exemptRoads: [
      'Interstate highways',
      'US highways',
    ],
    permitAvailable: true,
    permitFee: 50,
    checkWebsite: 'http://www.dot.state.wy.us/home/trucking_commercial_vehicles.html',
    phoneNumber: '307-777-4437',
    notes: [
      'Check with county road departments for local restrictions',
      'Wind restrictions may also apply to oversize loads',
    ],
  },
  {
    stateCode: 'ME',
    stateName: 'Maine',
    restrictionName: 'Spring Weight Limits',
    description: 'Posted weight limits during spring thaw',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 31,
    weightReductionPercent: 30,
    affectedRoads: [
      'Town roads',
      'State aid roads',
      'Some state highways',
    ],
    exemptRoads: [
      'Interstate highways',
      'Major numbered routes',
    ],
    permitAvailable: true,
    permitFee: 75,
    checkWebsite: 'https://www.maine.gov/mdot/traffic/trucking/',
    phoneNumber: '207-624-3600',
    notes: [
      'Town roads typically have strictest limits',
      'Logging trucks may have exemptions',
      'Check with local municipalities for road status',
    ],
  },
  {
    stateCode: 'VT',
    stateName: 'Vermont',
    restrictionName: 'Seasonal Road Posting',
    description: 'Weight restrictions on town highways during mud season',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 15,
    weightReductionPercent: 30,
    affectedRoads: [
      'Town highways',
      'Class 2 town highways',
      'Class 3 town highways',
    ],
    exemptRoads: [
      'State highways',
      'US routes',
      'Interstate highways',
    ],
    permitAvailable: false,
    checkWebsite: 'https://vtrans.vermont.gov/operations/trucking',
    phoneNumber: '802-828-2657',
    notes: [
      'Towns post restrictions individually - check town clerk',
      'Known locally as "mud season"',
      'Gravel roads most affected',
    ],
  },
  {
    stateCode: 'NH',
    stateName: 'New Hampshire',
    restrictionName: 'Spring Weight Restrictions',
    description: 'Posted weight limits on town and some state roads',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 15,
    weightReductionPercent: 25,
    affectedRoads: [
      'Town roads',
      'Some state routes',
    ],
    exemptRoads: [
      'Interstate highways',
      'Major state routes',
    ],
    permitAvailable: true,
    permitFee: 50,
    checkWebsite: 'https://www.nh.gov/dot/org/operations/highway/',
    phoneNumber: '603-271-3734',
    notes: [
      'Northern NH typically has longer restriction periods',
      'Check with local road agents for status',
    ],
  },
  {
    stateCode: 'IA',
    stateName: 'Iowa',
    restrictionName: 'Spring Weight Embargoes',
    description: 'Reduced weight limits during spring thaw',
    typicalStartMonth: 2,
    typicalStartDay: 15,
    typicalEndMonth: 5,
    typicalEndDay: 15,
    weightReductionPercent: 25,
    affectedRoads: [
      'Primary roads (when posted)',
      'Secondary roads',
      'Farm-to-market roads',
    ],
    exemptRoads: [
      'Interstate highways',
      'Most primary highways',
    ],
    permitAvailable: true,
    permitFee: 60,
    checkWebsite: 'https://iowadot.gov/mvd/motorcarriers/embargoes',
    phoneNumber: '515-237-3264',
    notes: [
      'Embargoes posted on DOT website and at weigh stations',
      'Check county engineer offices for local roads',
      'Agricultural exemptions may apply',
    ],
  },
  {
    stateCode: 'ID',
    stateName: 'Idaho',
    restrictionName: 'Seasonal Load Limits',
    description: 'Spring weight restrictions on state highways',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 15,
    weightReductionPercent: 20,
    affectedRoads: [
      'State highways (when posted)',
      'County roads',
    ],
    exemptRoads: [
      'Interstate highways',
      'Most US routes',
    ],
    permitAvailable: true,
    permitFee: 75,
    checkWebsite: 'https://itd.idaho.gov/highways/ops/loadlimits/',
    phoneNumber: '208-334-8420',
    notes: [
      'Northern Idaho has more restrictive periods',
      'Check 511 for current road conditions',
    ],
  },

  // ===========================
  // ADDITIONAL STATES (EXPANDED)
  // ===========================

  {
    stateCode: 'AK',
    stateName: 'Alaska',
    restrictionName: 'Breakup Season Restrictions',
    description: 'Severe weight restrictions during spring breakup when frost leaves ground',
    typicalStartMonth: 4,
    typicalStartDay: 1,
    typicalEndMonth: 6,
    typicalEndDay: 15,
    weightReductionPercent: 50,
    maxGrossWeight: 40000,
    axleReductions: {
      single: 10000,
      tandem: 18000,
    },
    affectedRoads: [
      'All state highways',
      'Secondary roads',
      'Remote access roads',
      'Dalton Highway (Haul Road)',
    ],
    exemptRoads: [
      'Major paved highways (when lifted)',
    ],
    permitAvailable: true,
    permitFee: 200,
    checkWebsite: 'https://dot.alaska.gov/mscve/webpermits/',
    phoneNumber: '907-269-8642',
    notes: [
      'Most restrictive in the nation during breakup',
      'Dalton Highway may close to heavy loads entirely',
      'Restrictions lifted progressively from south to north',
      'Ice roads may be only option for remote locations until breakup',
      'Essential loads may require DOT escort',
    ],
  },
  {
    stateCode: 'NE',
    stateName: 'Nebraska',
    restrictionName: 'Spring Weight Restrictions',
    description: 'Posted weight limits during frost-out period',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 1,
    weightReductionPercent: 25,
    affectedRoads: [
      'County roads',
      'Township roads',
      'Some state links',
    ],
    exemptRoads: [
      'Interstate highways',
      'US highways',
      'State highways (most)',
    ],
    permitAvailable: true,
    permitFee: 50,
    checkWebsite: 'https://dot.nebraska.gov/business-center/trucking/',
    phoneNumber: '402-471-4567',
    notes: [
      'County road restrictions vary significantly',
      'Eastern Nebraska lifts earlier than Sandhills region',
      'Check with county highway departments',
    ],
  },
  {
    stateCode: 'NY',
    stateName: 'New York',
    restrictionName: 'Seasonal Posted Highways',
    description: 'Weight restrictions on town and county roads during spring thaw',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 15,
    weightReductionPercent: 20,
    affectedRoads: [
      'Town highways',
      'County roads (when posted)',
      'Unpaved roads',
    ],
    exemptRoads: [
      'Interstate highways',
      'State routes',
      'US routes',
    ],
    permitAvailable: true,
    permitFee: 85,
    checkWebsite: 'https://www.dot.ny.gov/divisions/operating/oom/transportation-systems/truck-trailer-size-weight',
    phoneNumber: '518-457-6500',
    notes: [
      'Upstate NY has significant restrictions',
      'Adirondack region may have extended periods',
      'Hudson Valley lifts earlier than northern regions',
      'Town road postings are independent - check locally',
    ],
  },
  {
    stateCode: 'PA',
    stateName: 'Pennsylvania',
    restrictionName: 'Posted Weight Limits',
    description: 'Spring weight restrictions on local roads in northern counties',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 4,
    typicalEndDay: 30,
    weightReductionPercent: 20,
    affectedRoads: [
      'Township roads (when posted)',
      'Some county roads',
      'Unpaved roads',
    ],
    exemptRoads: [
      'Interstate highways',
      'US routes',
      'State routes (PA-numbered)',
    ],
    permitAvailable: true,
    permitFee: 60,
    checkWebsite: 'https://www.penndot.pa.gov/Doing-Business/Motor-Carrier/Pages/Motor-Carrier-Services.aspx',
    phoneNumber: '717-787-6746',
    notes: [
      'Northern tier counties most affected',
      'Restrictions less common than other northeastern states',
      'Check with township supervisors for local postings',
    ],
  },
  {
    stateCode: 'OH',
    stateName: 'Ohio',
    restrictionName: 'Seasonal Road Postings',
    description: 'Local road weight restrictions during spring thaw',
    typicalStartMonth: 2,
    typicalStartDay: 15,
    typicalEndMonth: 4,
    typicalEndDay: 30,
    weightReductionPercent: 20,
    affectedRoads: [
      'Township roads',
      'Some county roads (when posted)',
    ],
    exemptRoads: [
      'Interstate highways',
      'US routes',
      'State routes',
      'County roads (most)',
    ],
    permitAvailable: true,
    permitFee: 45,
    checkWebsite: 'https://www.transportation.ohio.gov/working/permits/special-hauling-permits',
    phoneNumber: '614-466-4243',
    notes: [
      'Northern Ohio has more restrictions',
      'Lake effect areas may have longer periods',
      'Township trustees set local postings',
    ],
  },
  {
    stateCode: 'IL',
    stateName: 'Illinois',
    restrictionName: 'Seasonal Load Limits',
    description: 'Posted weight restrictions during spring thaw period',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 1,
    weightReductionPercent: 25,
    affectedRoads: [
      'Township roads',
      'County highways (when posted)',
    ],
    exemptRoads: [
      'Interstate highways',
      'US routes',
      'State routes (IL-numbered)',
    ],
    permitAvailable: true,
    permitFee: 55,
    checkWebsite: 'https://idot.illinois.gov/transportation-system/local-transportation-partners/county-engineers-and-local-public-agencies',
    phoneNumber: '217-782-2694',
    notes: [
      'Northern Illinois most affected',
      'County highway departments set posting dates',
      'Agricultural exemptions may apply for farm-to-market',
    ],
  },
  {
    stateCode: 'WA',
    stateName: 'Washington',
    restrictionName: 'Seasonal Frost Restrictions',
    description: 'Weight restrictions on mountain and rural routes during spring',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 5,
    typicalEndDay: 1,
    weightReductionPercent: 20,
    affectedRoads: [
      'Mountain pass routes (during thaw)',
      'Some state routes',
      'County roads',
    ],
    exemptRoads: [
      'Interstate highways',
      'Most US routes',
      'Puget Sound lowland routes',
    ],
    permitAvailable: true,
    permitFee: 70,
    checkWebsite: 'https://wsdot.wa.gov/travel/commercial-vehicles',
    phoneNumber: '360-705-7000',
    notes: [
      'Cascades mountain routes most affected',
      'Eastern Washington has some restrictions',
      'Check WSDOT pass conditions',
    ],
  },
  {
    stateCode: 'OR',
    stateName: 'Oregon',
    restrictionName: 'Spring Load Restrictions',
    description: 'Weight limits on certain routes during frost-out',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 4,
    typicalEndDay: 30,
    weightReductionPercent: 20,
    affectedRoads: [
      'Mountain routes',
      'Some state highways',
      'County roads (when posted)',
    ],
    exemptRoads: [
      'Interstate highways',
      'US routes (most)',
      'Valley floor routes',
    ],
    permitAvailable: true,
    permitFee: 65,
    checkWebsite: 'https://www.oregon.gov/odot/MCT/Pages/index.aspx',
    phoneNumber: '503-378-6699',
    notes: [
      'Cascade and Blue Mountain routes affected',
      'Coast Range has less severe restrictions',
      'Check Trip Check for current conditions',
    ],
  },
  {
    stateCode: 'CO',
    stateName: 'Colorado',
    restrictionName: 'Seasonal Mountain Restrictions',
    description: 'Weight restrictions on mountain passes during spring thaw',
    typicalStartMonth: 3,
    typicalStartDay: 15,
    typicalEndMonth: 5,
    typicalEndDay: 15,
    weightReductionPercent: 15,
    affectedRoads: [
      'Mountain passes',
      'High altitude routes',
      'Some county roads',
    ],
    exemptRoads: [
      'Interstate highways (except tunnels)',
      'US routes (most)',
      'Front Range urban routes',
    ],
    permitAvailable: true,
    permitFee: 80,
    checkWebsite: 'https://www.codot.gov/business/trucking',
    phoneNumber: '303-757-9011',
    notes: [
      'High mountain passes may have extended periods',
      'Eisenhower Tunnel has separate restrictions',
      'Chain laws may apply simultaneously',
      'San Juan mountains have unique restrictions',
    ],
  },
  {
    stateCode: 'UT',
    stateName: 'Utah',
    restrictionName: 'Spring Load Restrictions',
    description: 'Weight limits during frost leaving period',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 4,
    typicalEndDay: 30,
    weightReductionPercent: 15,
    affectedRoads: [
      'Mountain routes',
      'Some state highways',
      'County roads (when posted)',
    ],
    exemptRoads: [
      'Interstate highways',
      'US routes (most)',
      'Salt Lake Valley routes',
    ],
    permitAvailable: true,
    permitFee: 60,
    checkWebsite: 'https://www.udot.utah.gov/connect/business/motor-carrier/',
    phoneNumber: '801-965-4892',
    notes: [
      'Northern Utah mountains most affected',
      'Southern Utah rarely has restrictions',
      'Check UDOT for current road conditions',
    ],
  },
  {
    stateCode: 'NV',
    stateName: 'Nevada',
    restrictionName: 'Mountain Route Restrictions',
    description: 'Seasonal weight limits on mountain routes',
    typicalStartMonth: 3,
    typicalStartDay: 1,
    typicalEndMonth: 4,
    typicalEndDay: 15,
    weightReductionPercent: 15,
    affectedRoads: [
      'Mountain routes (Lake Tahoe area)',
      'Some northern state routes',
    ],
    exemptRoads: [
      'Interstate highways',
      'US routes',
      'Most state routes',
    ],
    permitAvailable: true,
    permitFee: 50,
    checkWebsite: 'https://dmv.nv.gov/commercial.htm',
    phoneNumber: '775-684-4711',
    notes: [
      'Limited restrictions compared to northern states',
      'Sierra Nevada routes most affected',
      'Check NDOT for mountain conditions',
    ],
  },
]

/**
 * Check if a state has seasonal restrictions in effect for a given date
 */
export function hasSeasonalRestrictions(stateCode: string, date?: Date): boolean {
  const checkDate = date || new Date()
  const restriction = SEASONAL_RESTRICTIONS.find(
    (r) => r.stateCode === stateCode.toUpperCase()
  )

  if (!restriction) return false

  const month = checkDate.getMonth() + 1 // getMonth() is 0-indexed
  const day = checkDate.getDate()

  // Check if date falls within typical restriction period
  const startDate = restriction.typicalStartMonth * 100 + restriction.typicalStartDay
  const endDate = restriction.typicalEndMonth * 100 + restriction.typicalEndDay
  const currentDate = month * 100 + day

  return currentDate >= startDate && currentDate <= endDate
}

/**
 * Get seasonal restriction details for a state
 */
export function getSeasonalRestriction(stateCode: string): SeasonalRestriction | null {
  return SEASONAL_RESTRICTIONS.find((r) => r.stateCode === stateCode.toUpperCase()) || null
}

/**
 * Get all states with active seasonal restrictions for a given date
 */
export function getActiveRestrictions(date?: Date): SeasonalRestriction[] {
  return SEASONAL_RESTRICTIONS.filter((r) => hasSeasonalRestrictions(r.stateCode, date))
}

/**
 * Check route for seasonal restriction warnings
 */
export function checkRouteSeasonalRestrictions(
  statesTraversed: string[],
  date?: Date
): {
  hasRestrictions: boolean
  affectedStates: SeasonalRestriction[]
  warnings: string[]
  recommendations: string[]
} {
  const checkDate = date || new Date()
  const affectedStates: SeasonalRestriction[] = []
  const warnings: string[] = []
  const recommendations: string[] = []

  for (const stateCode of statesTraversed) {
    if (hasSeasonalRestrictions(stateCode, checkDate)) {
      const restriction = getSeasonalRestriction(stateCode)
      if (restriction) {
        affectedStates.push(restriction)
        warnings.push(
          `${restriction.stateName}: ${restriction.restrictionName} in effect - ` +
            `weight reduced by ${restriction.weightReductionPercent}%`
        )
      }
    }
  }

  if (affectedStates.length > 0) {
    recommendations.push('Consider using interstate highways where possible (typically exempt)')
    recommendations.push('Verify current road postings with state DOT before departure')
    recommendations.push('Consider delaying shipment if weight reduction is problematic')

    if (affectedStates.some((s) => s.permitAvailable)) {
      recommendations.push('Special permits may be available for essential loads')
    }
  }

  return {
    hasRestrictions: affectedStates.length > 0,
    affectedStates,
    warnings,
    recommendations,
  }
}

/**
 * Calculate adjusted weight limits for a route considering seasonal restrictions
 */
export function calculateAdjustedWeightLimits(
  statesTraversed: string[],
  baseGrossWeight: number = 80000,
  date?: Date
): {
  adjustedMaxWeight: number
  reductionPercent: number
  mostRestrictiveState: string | null
} {
  let lowestMaxWeight = baseGrossWeight
  let highestReductionPercent = 0
  let mostRestrictiveState: string | null = null

  for (const stateCode of statesTraversed) {
    if (hasSeasonalRestrictions(stateCode, date)) {
      const restriction = getSeasonalRestriction(stateCode)
      if (restriction) {
        const adjustedWeight = restriction.maxGrossWeight
          ? restriction.maxGrossWeight
          : baseGrossWeight * (1 - restriction.weightReductionPercent / 100)

        if (adjustedWeight < lowestMaxWeight) {
          lowestMaxWeight = adjustedWeight
          highestReductionPercent = restriction.weightReductionPercent
          mostRestrictiveState = stateCode
        }
      }
    }
  }

  return {
    adjustedMaxWeight: Math.round(lowestMaxWeight),
    reductionPercent: highestReductionPercent,
    mostRestrictiveState,
  }
}

/**
 * Format seasonal restriction period as readable string
 */
export function formatRestrictionPeriod(restriction: SeasonalRestriction): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const startMonth = months[restriction.typicalStartMonth - 1]
  const endMonth = months[restriction.typicalEndMonth - 1]

  return `${startMonth} ${restriction.typicalStartDay} - ${endMonth} ${restriction.typicalEndDay}`
}

/**
 * Get states with no seasonal restrictions
 */
export function getStatesWithoutSeasonalRestrictions(): string[] {
  const statesWithRestrictions = new Set(SEASONAL_RESTRICTIONS.map((r) => r.stateCode))

  const allStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
  ]

  return allStates.filter((s) => !statesWithRestrictions.has(s))
}
