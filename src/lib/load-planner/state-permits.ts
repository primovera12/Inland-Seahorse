/**
 * State Permit Database
 * Complete permit data for all 50 US states
 *
 * Data Format: All dimensions in feet, weights in pounds, fees in USD
 * Last Updated: January 2025
 */

import type { StatePermitData } from './types'

export const statePermits: StatePermitData[] = [
  // ALABAMA
  {
    stateCode: 'AL',
    stateName: 'Alabama',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 57 },
      maxWeight: { gross: 80000, perAxle: { single: 20000, tandem: 34000 } }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 20,
        dimensionSurcharges: {
          width: [{ threshold: 12, fee: 10 }, { threshold: 14, fee: 25 }],
          length: [{ threshold: 75, fee: 15 }]
        },
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 200 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 50,
        perMileFee: 0.04,
        weightBrackets: [
          { upTo: 100000, fee: 50 },
          { upTo: 120000, fee: 100 },
          { upTo: 150000, fee: 200 }
        ]
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15 },
      length: { oneEscort: 100, twoEscorts: 120 }
    },
    travelRestrictions: {
      noNightTravel: true,
      nightDefinition: '30 min before sunset to 30 min after sunrise',
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Alabama DOT',
      phone: '334-242-6300',
      website: 'https://www.dot.state.al.us/maweb/index.html'
    }
  },

  // ALASKA
  {
    stateCode: 'AK',
    stateName: 'Alaska',
    timezone: 'America/Anchorage',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 40, combination: 75 },
      maxWeight: { gross: 105500, perAxle: { single: 20000, tandem: 38000 } }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: '1-2 days',
        validity: '10 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 50
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15 }
    },
    travelRestrictions: {
      noNightTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Alaska DOT&PF',
      phone: '907-465-4070',
      website: 'http://www.dot.state.ak.us/'
    }
  },

  // ARIZONA
  {
    stateCode: 'AZ',
    stateName: 'Arizona',
    timezone: 'America/Phoenix',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 40, combination: 65 },
      maxWeight: { gross: 80000, perAxle: { single: 20000, tandem: 34000 } }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 15,
        dimensionSurcharges: {
          width: [{ threshold: 12, fee: 10 }, { threshold: 14, fee: 20 }],
          height: [{ threshold: 15, fee: 15 }],
          length: [{ threshold: 95, fee: 15 }]
        },
        processingTime: 'Immediate online',
        validity: '10 days'
      },
      annual: { baseFee: 150 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 15,
        weightBrackets: [
          { upTo: 105000, fee: 25 },
          { upTo: 130000, fee: 50 },
          { upTo: 200000, fee: 100 }
        ]
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 16 },
      length: { oneEscort: 100, twoEscorts: 125 }
    },
    travelRestrictions: {
      noNightTravel: true,
      nightDefinition: 'Sunset to sunrise',
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Arizona DOT',
      phone: '602-712-8159',
      website: 'https://azdot.gov/motor-vehicles/professional-services/oversize-overweight-permits'
    }
  },

  // ARKANSAS
  {
    stateCode: 'AR',
    stateName: 'Arkansas',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 65 },
      maxWeight: { gross: 80000, perAxle: { single: 20000, tandem: 34000 } }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 450 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 30,
        tonMileFee: 0.027
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14.5 },
      height: { poleCar: 15 },
      length: { oneEscort: 110 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Arkansas Highway and Transportation Dept',
      phone: '501-569-2381',
      website: 'https://www.ardot.gov/divisions/transportation-planning-policy/oversize-overweight/'
    }
  },

  // CALIFORNIA
  {
    stateCode: 'CA',
    stateName: 'California',
    timezone: 'America/Los_Angeles',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 40, combination: 65 },
      maxWeight: { gross: 80000, perAxle: { single: 20000, tandem: 34000 } }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 16,
        processingTime: 'Immediate online',
        validity: 'Single trip'
      },
      annual: { baseFee: 90 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 16,
        perMileFee: 0,
        extraLegalFees: { perTrip: 108 }
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 15 },
      length: { oneEscort: 100, twoEscorts: 120 },
      policeEscort: { width: 15, fee: 350 }
    },
    travelRestrictions: {
      noNightTravel: true,
      nightDefinition: 'Sunset to sunrise',
      noWeekendTravel: true,
      weekendDefinition: 'Friday 3pm to Monday 6am (varies by route)',
      noHolidayTravel: true
    },
    contact: {
      agency: 'Caltrans Transportation Permits',
      phone: '916-654-6261',
      website: 'https://dot.ca.gov/programs/traffic-operations/transportation-permits'
    },
    notes: [
      'California has complex route restrictions',
      'Many routes require annual permits',
      'Special requirements for wide loads on two-lane roads'
    ]
  },

  // COLORADO
  {
    stateCode: 'CO',
    stateName: 'Colorado',
    timezone: 'America/Denver',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14.5,
      maxLength: { single: 45, combination: 70 },
      maxWeight: { gross: 85000, perAxle: { single: 20000, tandem: 36000 } }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 15,
        dimensionSurcharges: {
          width: [{ threshold: 12, fee: 20 }, { threshold: 14, fee: 50 }],
          height: [{ threshold: 15, fee: 25 }],
          length: [{ threshold: 85, fee: 15 }]
        },
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 175 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 20,
        weightBrackets: [
          { upTo: 100000, fee: 50 },
          { upTo: 125000, fee: 100 },
          { upTo: 175000, fee: 200 }
        ]
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15.5 },
      length: { oneEscort: 100, twoEscorts: 120 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Colorado DOT Permits',
      phone: '303-757-9539',
      website: 'https://www.codot.gov/business/permits'
    }
  },

  // CONNECTICUT
  {
    stateCode: 'CT',
    stateName: 'Connecticut',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000, perAxle: { single: 22400, tandem: 36000 } }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 35,
        processingTime: '1-2 days',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 35,
        perMileFee: 0.10
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 14.5 },
      length: { oneEscort: 90 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: true,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Connecticut DOT',
      phone: '860-594-2872',
      website: 'https://portal.ct.gov/DOT/Permits-Office/Overweight-Oversize-Permits'
    }
  },

  // DELAWARE
  {
    stateCode: 'DE',
    stateName: 'Delaware',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 60 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: 'Same day',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 30,
        perMileFee: 0.15
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 14 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: true,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Delaware DOT',
      phone: '302-659-4600',
      website: 'https://deldot.gov/Business/trucking/'
    }
  },

  // FLORIDA
  {
    stateCode: 'FL',
    stateName: 'Florida',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 75 },
      maxWeight: { gross: 80000, perAxle: { single: 22000, tandem: 44000 } }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 15,
        dimensionSurcharges: {
          width: [{ threshold: 12, fee: 15 }, { threshold: 14, fee: 30 }],
          height: [{ threshold: 14.5, fee: 20 }],
          length: [{ threshold: 95, fee: 15 }]
        },
        processingTime: 'Immediate online',
        validity: '10 days'
      },
      annual: { baseFee: 100 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 30,
        weightBrackets: [
          { upTo: 100000, fee: 75 },
          { upTo: 130000, fee: 150 },
          { upTo: 200000, fee: 300 }
        ]
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14.5 },
      height: { poleCar: 15 },
      length: { oneEscort: 95, twoEscorts: 110 }
    },
    travelRestrictions: {
      noNightTravel: true,
      nightDefinition: '30 min before sunset to 30 min after sunrise',
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Florida DOT',
      phone: '850-410-5777',
      website: 'https://www.fdot.gov/maintenance/trucking.shtm'
    }
  },

  // GEORGIA
  {
    stateCode: 'GA',
    stateName: 'Georgia',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 42, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 600 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 50,
        perMileFee: 0.035
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15 },
      length: { oneEscort: 100, twoEscorts: 130 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Georgia DOT Permits Office',
      phone: '404-635-8022',
      website: 'http://www.dot.ga.gov/GDOT/Pages/Permits.aspx'
    }
  },

  // HAWAII
  {
    stateCode: 'HI',
    stateName: 'Hawaii',
    timezone: 'Pacific/Honolulu',
    legalLimits: {
      maxWidth: 9,
      maxHeight: 14,
      maxLength: { single: 40, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 25,
        processingTime: '1-2 days',
        validity: '30 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 50
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 15 },
      policeEscort: { width: 14, fee: 400 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noHolidayTravel: false,
      peakHourRestrictions: 'No travel during rush hour in urban areas'
    },
    contact: {
      agency: 'Hawaii DOT',
      phone: '808-692-7616',
      website: 'https://hidot.hawaii.gov/highways/'
    },
    notes: [
      'Inter-island transport requires separate permits per island',
      'Special restrictions on narrow mountain roads'
    ]
  },

  // IDAHO
  {
    stateCode: 'ID',
    stateName: 'Idaho',
    timezone: 'America/Boise',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 48, combination: 75 },
      maxWeight: { gross: 105500, perAxle: { single: 20000, tandem: 34000 } }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 27,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 270 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 27,
        perMileFee: 0.03
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15 },
      length: { oneEscort: 105, twoEscorts: 115 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Idaho Transportation Department',
      phone: '208-334-8420',
      website: 'https://itd.idaho.gov/osize/'
    }
  },

  // ILLINOIS
  {
    stateCode: 'IL',
    stateName: 'Illinois',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 42, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 50,
        dimensionSurcharges: {
          width: [{ threshold: 12, fee: 25 }, { threshold: 14, fee: 75 }],
          length: [{ threshold: 80, fee: 25 }]
        },
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 400 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 60,
        perMileFee: 0.14
      }
    },
    escortRules: {
      width: { oneEscort: 11, twoEscorts: 14.5 },
      height: { poleCar: 15 },
      length: { oneEscort: 85, twoEscorts: 115 },
      policeEscort: { width: 16, fee: 250 }
    },
    travelRestrictions: {
      noNightTravel: true,
      nightDefinition: 'Sunset to sunrise',
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Illinois DOT',
      phone: '217-785-1477',
      website: 'https://idot.illinois.gov/transportation-system/permits/vehicles'
    }
  },

  // INDIANA
  {
    stateCode: 'IN',
    stateName: 'Indiana',
    timezone: 'America/Indianapolis',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 60 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 20,
        processingTime: 'Same day',
        validity: '15 days'
      },
      annual: { baseFee: 300 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 20,
        perMileFee: 0.25,
        weightBrackets: [
          { upTo: 108000, fee: 50 },
          { upTo: 150000, fee: 150 }
        ]
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15 },
      length: { oneEscort: 100, twoEscorts: 120 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Indiana DOT',
      phone: '317-615-7320',
      website: 'https://www.in.gov/indot/2429.htm'
    }
  },

  // IOWA
  {
    stateCode: 'IA',
    stateName: 'Iowa',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 10,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 25 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 10,
        perMileFee: 0.06
      }
    },
    escortRules: {
      width: { oneEscort: 12.5, twoEscorts: 16 },
      height: { poleCar: 15.5 },
      length: { oneEscort: 100, twoEscorts: 120 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Iowa DOT',
      phone: '515-237-3264',
      website: 'https://iowadot.gov/mvd/motorcarriers/oversize-overweight'
    }
  },

  // KANSAS
  {
    stateCode: 'KS',
    stateName: 'Kansas',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 85500 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 25,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 125 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 25,
        perMileFee: 0.10
      }
    },
    escortRules: {
      width: { oneEscort: 11, twoEscorts: 16 },
      height: { poleCar: 16 },
      length: { oneEscort: 100 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Kansas DOT',
      phone: '785-271-3145',
      website: 'https://www.ksdot.org/osbepermit.asp'
    }
  },

  // KENTUCKY
  {
    stateCode: 'KY',
    stateName: 'Kentucky',
    timezone: 'America/Kentucky/Louisville',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: 'Same day',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 60,
        perMileFee: 0.035
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14.5 },
      height: { poleCar: 14.5 },
      length: { oneEscort: 100, twoEscorts: 120 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Kentucky Transportation Cabinet',
      phone: '502-564-7183',
      website: 'https://transportation.ky.gov/Permits/Pages/default.aspx'
    }
  },

  // LOUISIANA
  {
    stateCode: 'LA',
    stateName: 'Louisiana',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 20,
        processingTime: 'Same day',
        validity: '7 days'
      },
      annual: { baseFee: 400 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 35,
        perMileFee: 0.10
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15 },
      length: { oneEscort: 100 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Louisiana DOTD',
      phone: '225-379-1232',
      website: 'http://wwwsp.dotd.la.gov/Inside_LaDOTD/Divisions/Multimodal/Permit_Unit/Pages/default.aspx'
    }
  },

  // MAINE
  {
    stateCode: 'ME',
    stateName: 'Maine',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 48, combination: 74 },
      maxWeight: { gross: 100000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 50,
        processingTime: '1-2 days',
        validity: '7 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 100,
        perMileFee: 0.15
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 14 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: true,
      noHolidayTravel: true,
      weatherRestrictions: 'Spring weight restrictions March-May'
    },
    contact: {
      agency: 'Maine DOT',
      phone: '207-624-9000',
      website: 'https://www.maine.gov/mdot/trucking/'
    }
  },

  // MARYLAND
  {
    stateCode: 'MD',
    stateName: 'Maryland',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 60 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 25,
        processingTime: 'Same day',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 25,
        perMileFee: 0.10
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 14 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: true,
      noHolidayTravel: true,
      peakHourRestrictions: 'I-95, I-695, I-495 restricted during rush hours'
    },
    contact: {
      agency: 'Maryland DOT SHA',
      phone: '410-545-5603',
      website: 'https://www.roads.maryland.gov/mhso/osow.asp'
    }
  },

  // MASSACHUSETTS
  {
    stateCode: 'MA',
    stateName: 'Massachusetts',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 60,
        processingTime: '1-3 days',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 100,
        perMileFee: 0.15
      }
    },
    escortRules: {
      width: { oneEscort: 11, twoEscorts: 14 },
      height: { poleCar: 14 },
      policeEscort: { width: 12, fee: 300 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: true,
      noHolidayTravel: true,
      peakHourRestrictions: 'No travel 6am-9am, 3pm-7pm on major routes'
    },
    contact: {
      agency: 'MassDOT',
      phone: '857-368-9640',
      website: 'https://www.mass.gov/orgs/highway-division'
    }
  },

  // MICHIGAN
  {
    stateCode: 'MI',
    stateName: 'Michigan',
    timezone: 'America/Detroit',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 50, combination: 65 },
      maxWeight: { gross: 164000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 50,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 250 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 50,
        perMileFee: 0.06
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 14.5 },
      length: { oneEscort: 85, twoEscorts: 110 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true,
      weatherRestrictions: 'Spring weight restrictions February-May'
    },
    contact: {
      agency: 'Michigan DOT',
      phone: '517-335-9283',
      website: 'https://www.michigan.gov/mdot/programs/cvo'
    },
    notes: [
      'Michigan allows significantly higher weights on certain routes',
      '11-axle configurations can reach 164,000 lbs'
    ]
  },

  // MINNESOTA
  {
    stateCode: 'MN',
    stateName: 'Minnesota',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 75 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 15,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 120 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 15,
        perMileFee: 0.05
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14.5 },
      height: { poleCar: 15 },
      length: { oneEscort: 100 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true,
      weatherRestrictions: 'Spring weight restrictions March-May'
    },
    contact: {
      agency: 'MnDOT',
      phone: '651-296-6000',
      website: 'http://www.dot.state.mn.us/cvo/oversize.html'
    }
  },

  // MISSISSIPPI
  {
    stateCode: 'MS',
    stateName: 'Mississippi',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 20,
        processingTime: 'Same day',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 30,
        perMileFee: 0.05
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15 },
      length: { oneEscort: 100 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Mississippi DOT',
      phone: '601-359-7685',
      website: 'https://mdot.ms.gov/portal/oversize_overweight'
    }
  },

  // MISSOURI
  {
    stateCode: 'MO',
    stateName: 'Missouri',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 15,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 125 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 15,
        perMileFee: 0.03
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15 },
      length: { oneEscort: 100, twoEscorts: 120 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'MoDOT',
      phone: '800-877-8499',
      website: 'https://www.modot.org/motor-carrier-services'
    }
  },

  // MONTANA
  {
    stateCode: 'MT',
    stateName: 'Montana',
    timezone: 'America/Denver',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 53, combination: 93 },
      maxWeight: { gross: 131060 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 20,
        processingTime: 'Same day',
        validity: '10 days'
      },
      annual: { baseFee: 200 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 25,
        perMileFee: 0.03
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 16 },
      length: { oneEscort: 110 }
    },
    travelRestrictions: {
      noNightTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Montana DOT',
      phone: '406-444-7262',
      website: 'https://www.mdt.mt.gov/business/mcs/'
    },
    notes: [
      'Montana allows long combination vehicles (LCVs)',
      'Some routes allow up to 131,060 lbs'
    ]
  },

  // NEBRASKA
  {
    stateCode: 'NE',
    stateName: 'Nebraska',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 95000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 25,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 150 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 25,
        perMileFee: 0.05
      }
    },
    escortRules: {
      width: { oneEscort: 12.5, twoEscorts: 16 },
      height: { poleCar: 16 },
      length: { oneEscort: 100 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Nebraska DOT',
      phone: '402-471-4567',
      website: 'https://dot.nebraska.gov/business-center/permits/'
    }
  },

  // NEVADA
  {
    stateCode: 'NV',
    stateName: 'Nevada',
    timezone: 'America/Los_Angeles',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 48, combination: 70 },
      maxWeight: { gross: 129000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 20,
        processingTime: 'Same day',
        validity: '10 days'
      },
      annual: { baseFee: 200 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 30,
        perMileFee: 0.04
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 16 },
      length: { oneEscort: 100 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Nevada DOT',
      phone: '775-888-7410',
      website: 'https://www.nevadadot.com/doing-business/permits'
    }
  },

  // NEW HAMPSHIRE
  {
    stateCode: 'NH',
    stateName: 'New Hampshire',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 46, combination: 68 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 50,
        processingTime: '1-2 days',
        validity: '7 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 75,
        perMileFee: 0.10
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 14 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: true,
      noHolidayTravel: true,
      weatherRestrictions: 'Spring weight restrictions March-May'
    },
    contact: {
      agency: 'NH DOT',
      phone: '603-271-2591',
      website: 'https://www.nh.gov/dot/org/operations/highwaymaintenance/index.htm'
    }
  },

  // NEW JERSEY
  {
    stateCode: 'NJ',
    stateName: 'New Jersey',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 100,
        processingTime: '1-3 days',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 200,
        perMileFee: 0.25
      }
    },
    escortRules: {
      width: { oneEscort: 10.5, twoEscorts: 14 },
      height: { poleCar: 14 },
      policeEscort: { width: 14, fee: 400 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: true,
      noHolidayTravel: true,
      peakHourRestrictions: 'Very restrictive on NJ Turnpike and Garden State Parkway'
    },
    contact: {
      agency: 'NJ DOT Special Permits',
      phone: '609-530-3648',
      website: 'https://www.nj.gov/transportation/freight/trucking/'
    },
    notes: [
      'New Jersey has very restrictive permit requirements',
      'Many routes prohibited for oversize loads',
      'Early application recommended'
    ]
  },

  // NEW MEXICO
  {
    stateCode: 'NM',
    stateName: 'New Mexico',
    timezone: 'America/Denver',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 86400 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 25,
        processingTime: 'Same day',
        validity: '7 days'
      },
      annual: { baseFee: 150 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 25,
        perMileFee: 0.035
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 16 },
      length: { oneEscort: 110 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'New Mexico DOT',
      phone: '505-827-4589',
      website: 'http://dot.state.nm.us/content/nmdot/en/Motor_Vehicle.html'
    }
  },

  // NEW YORK
  {
    stateCode: 'NY',
    stateName: 'New York',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 75,
        dimensionSurcharges: {
          width: [{ threshold: 12, fee: 50 }, { threshold: 14, fee: 100 }],
          length: [{ threshold: 85, fee: 50 }]
        },
        processingTime: '1-3 days',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 100,
        perMileFee: 0.15
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 14 },
      policeEscort: { width: 15, fee: 350 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: true,
      noHolidayTravel: true,
      peakHourRestrictions: 'NYC metro area very restricted'
    },
    contact: {
      agency: 'NYS DOT Special Hauling Permits',
      phone: '518-457-1014',
      website: 'https://www.dot.ny.gov/divisions/operating/oom/transportation-systems/special-hauling-permits'
    },
    notes: [
      'NYC requires additional city permits',
      'Many bridges and parkways prohibited for oversize',
      'Long processing times during busy seasons'
    ]
  },

  // NORTH CAROLINA
  {
    stateCode: 'NC',
    stateName: 'North Carolina',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 60 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: 'Same day',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 100,
        perMileFee: 0.10
      }
    },
    escortRules: {
      width: { oneEscort: 11, twoEscorts: 14 },
      height: { poleCar: 14.5 },
      length: { oneEscort: 100 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'NC DOT Oversize/Overweight Permit Office',
      phone: '919-861-3032',
      website: 'https://connect.ncdot.gov/business/trucking/Pages/default.aspx'
    }
  },

  // NORTH DAKOTA
  {
    stateCode: 'ND',
    stateName: 'North Dakota',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 50, combination: 75 },
      maxWeight: { gross: 105500 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 20,
        processingTime: 'Same day',
        validity: '10 days'
      },
      annual: { baseFee: 200 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 20,
        perMileFee: 0.03
      }
    },
    escortRules: {
      width: { oneEscort: 14.5, twoEscorts: 18 },
      height: { poleCar: 16 },
      length: { oneEscort: 110 }
    },
    travelRestrictions: {
      noNightTravel: false,
      noWeekendTravel: false,
      noHolidayTravel: true,
      weatherRestrictions: 'Spring weight restrictions March-May'
    },
    contact: {
      agency: 'North Dakota DOT',
      phone: '701-328-4358',
      website: 'https://www.dot.nd.gov/business/motor-carrier/'
    }
  },

  // OHIO
  {
    stateCode: 'OH',
    stateName: 'Ohio',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 40,
        processingTime: 'Same day',
        validity: '7 days'
      },
      annual: { baseFee: 250 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 65,
        perMileFee: 0.08
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14.5 },
      height: { poleCar: 15 },
      length: { oneEscort: 100, twoEscorts: 120 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Ohio DOT',
      phone: '614-351-2300',
      website: 'https://www.transportation.ohio.gov/wps/portal/gov/odot/working/funding/special-hauling-permits'
    }
  },

  // OKLAHOMA
  {
    stateCode: 'OK',
    stateName: 'Oklahoma',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 90000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 35,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 250 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 60,
        perMileFee: 0.20
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 16 },
      length: { oneEscort: 110 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Oklahoma DOT',
      phone: '405-521-4046',
      website: 'https://oklahoma.gov/odot/programs-and-projects/motor-carrier-services.html'
    }
  },

  // OREGON
  {
    stateCode: 'OR',
    stateName: 'Oregon',
    timezone: 'America/Los_Angeles',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 45, combination: 75 },
      maxWeight: { gross: 105500 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: 'Same day',
        validity: '10 days'
      },
      annual: { baseFee: 150 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 40,
        perMileFee: 0.05
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15.5 },
      length: { oneEscort: 105, twoEscorts: 120 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Oregon DOT',
      phone: '503-378-6699',
      website: 'https://www.oregon.gov/odot/mct/Pages/TS.aspx'
    }
  },

  // PENNSYLVANIA
  {
    stateCode: 'PA',
    stateName: 'Pennsylvania',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 60 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 60,
        dimensionSurcharges: {
          width: [{ threshold: 12, fee: 30 }, { threshold: 14, fee: 75 }]
        },
        processingTime: '1-2 days',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 75,
        perMileFee: 0.12
      }
    },
    escortRules: {
      width: { oneEscort: 11, twoEscorts: 14 },
      height: { poleCar: 14.5 },
      length: { oneEscort: 80, twoEscorts: 100 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'PennDOT',
      phone: '717-787-7445',
      website: 'https://www.penndot.gov/Doing-Business/MovingOverdimensionalLoads/Pages/default.aspx'
    }
  },

  // RHODE ISLAND
  {
    stateCode: 'RI',
    stateName: 'Rhode Island',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 60 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 50,
        processingTime: '1-2 days',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 75,
        perMileFee: 0.20
      }
    },
    escortRules: {
      width: { oneEscort: 11, twoEscorts: 13 },
      height: { poleCar: 14 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: true,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Rhode Island DOT',
      phone: '401-222-2481',
      website: 'http://www.dot.ri.gov/permits/'
    }
  },

  // SOUTH CAROLINA
  {
    stateCode: 'SC',
    stateName: 'South Carolina',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 40, combination: 60 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: 'Same day',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 65,
        perMileFee: 0.05
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 14.5 },
      length: { oneEscort: 100 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'South Carolina DOT',
      phone: '803-737-1234',
      website: 'https://www.scdot.org/inside/OversizeOverweight.aspx'
    }
  },

  // SOUTH DAKOTA
  {
    stateCode: 'SD',
    stateName: 'South Dakota',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 50, combination: 80 },
      maxWeight: { gross: 129000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 25,
        processingTime: 'Same day',
        validity: '10 days'
      },
      annual: { baseFee: 200 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 25,
        perMileFee: 0.03
      }
    },
    escortRules: {
      width: { oneEscort: 14.5, twoEscorts: 18 },
      height: { poleCar: 17 },
      length: { oneEscort: 120 }
    },
    travelRestrictions: {
      noNightTravel: false,
      noWeekendTravel: false,
      noHolidayTravel: true,
      weatherRestrictions: 'Spring weight restrictions March-May'
    },
    contact: {
      agency: 'South Dakota DOT',
      phone: '605-773-3501',
      website: 'https://dot.sd.gov/transportation/operations/motor-carrier/oversize-overweight'
    }
  },

  // TENNESSEE
  {
    stateCode: 'TN',
    stateName: 'Tennessee',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 25,
        processingTime: 'Same day',
        validity: '7 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 25,
        tonMileFee: 0.023
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14.5 },
      height: { poleCar: 14.5 },
      length: { oneEscort: 95, twoEscorts: 115 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Tennessee DOT',
      phone: '615-399-4220',
      website: 'https://www.tn.gov/tdot/driver-services/oversize-overweight-permits.html'
    }
  },

  // TEXAS
  {
    stateCode: 'TX',
    stateName: 'Texas',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000, perAxle: { single: 20000, tandem: 34000, tridem: 42000 } }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 60,
        dimensionSurcharges: {
          width: [{ threshold: 12, fee: 30 }, { threshold: 14, fee: 60 }, { threshold: 16, fee: 120 }],
          height: [{ threshold: 15, fee: 30 }, { threshold: 17, fee: 90 }],
          length: [{ threshold: 110, fee: 30 }, { threshold: 125, fee: 60 }]
        },
        processingTime: 'Immediate online',
        validity: '5 days'
      },
      annual: { baseFee: 1200, maxWidth: 14, maxHeight: 16, maxLength: 110 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 75,
        weightBrackets: [
          { upTo: 120000, fee: 75 },
          { upTo: 160000, fee: 150 },
          { upTo: 200000, fee: 225 }
        ]
      }
    },
    superloadThresholds: {
      width: 16,
      height: 18,
      length: 125,
      weight: 200000,
      requiresRouteSurvey: true,
      requiresBridgeAnalysis: true
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16, front: true, rear: true },
      height: { poleCar: 17 },
      length: { oneEscort: 110, twoEscorts: 125 },
      policeEscort: { width: 18, height: 18, fee: 350 }
    },
    travelRestrictions: {
      noNightTravel: true,
      nightDefinition: '30 min before sunset to 30 min after sunrise',
      noWeekendTravel: false,
      noHolidayTravel: true,
      holidays: ['New Years Day', 'Memorial Day', 'Independence Day', 'Labor Day', 'Thanksgiving', 'Christmas']
    },
    contact: {
      agency: 'Texas DMV Motor Carrier Division',
      phone: '800-299-1700',
      email: 'MCD_Permits@txdmv.gov',
      website: 'https://www.txdmv.gov/motor-carriers/oversize-overweight-permits',
      permitPortal: 'https://www.txpros.txdmv.gov/'
    },
    notes: [
      'Texas allows 14ft height on designated routes without permit',
      'Manufactured housing has separate permit requirements',
      'Oil field equipment may have special permits',
      'Online permits available 24/7 through TxPROS'
    ]
  },

  // UTAH
  {
    stateCode: 'UT',
    stateName: 'Utah',
    timezone: 'America/Denver',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: 'Same day',
        validity: '10 days'
      },
      annual: { baseFee: 200 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 35,
        perMileFee: 0.04
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15.5 },
      length: { oneEscort: 105, twoEscorts: 120 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Utah DOT',
      phone: '801-965-4892',
      website: 'https://www.udot.utah.gov/connect/business/motor-carrier/'
    }
  },

  // VERMONT
  {
    stateCode: 'VT',
    stateName: 'Vermont',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 46, combination: 68 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 40,
        processingTime: '1-2 days',
        validity: '7 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 60,
        perMileFee: 0.10
      }
    },
    escortRules: {
      width: { oneEscort: 11, twoEscorts: 14 },
      height: { poleCar: 14 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: true,
      noHolidayTravel: true,
      weatherRestrictions: 'Spring weight restrictions March-May'
    },
    contact: {
      agency: 'VTrans',
      phone: '802-828-2059',
      website: 'https://vtrans.vermont.gov/operations/trucking'
    }
  },

  // VIRGINIA
  {
    stateCode: 'VA',
    stateName: 'Virginia',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 48, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 20,
        processingTime: 'Same day',
        validity: '7 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 25,
        perMileFee: 0.05
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 14.5 },
      length: { oneEscort: 90, twoEscorts: 110 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Virginia DMV',
      phone: '804-497-7100',
      website: 'https://www.dmv.virginia.gov/commercial/hauling.html'
    }
  },

  // WASHINGTON
  {
    stateCode: 'WA',
    stateName: 'Washington',
    timezone: 'America/Los_Angeles',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 46, combination: 75 },
      maxWeight: { gross: 105500 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: 'Same day',
        validity: '10 days'
      },
      annual: { baseFee: 150 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 30,
        perMileFee: 0.04
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16 },
      height: { poleCar: 15.5 },
      length: { oneEscort: 105, twoEscorts: 125 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'WSDOT',
      phone: '360-704-6340',
      website: 'https://www.wsdot.wa.gov/commercialvehicle/osos.htm'
    }
  },

  // WEST VIRGINIA
  {
    stateCode: 'WV',
    stateName: 'West Virginia',
    timezone: 'America/New_York',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 30,
        processingTime: 'Same day',
        validity: '5 days'
      }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 50,
        perMileFee: 0.08
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14 },
      height: { poleCar: 14.5 },
      length: { oneEscort: 80 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'West Virginia DOT',
      phone: '304-926-0510',
      website: 'http://transportation.wv.gov/highways/programplanning/trucking/Pages/default.aspx'
    },
    notes: [
      'Many mountainous routes with tight curves and low clearances',
      'Route survey often required for wide loads'
    ]
  },

  // WISCONSIN
  {
    stateCode: 'WI',
    stateName: 'Wisconsin',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 13.5,
      maxLength: { single: 45, combination: 75 },
      maxWeight: { gross: 80000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 20,
        processingTime: 'Same day',
        validity: '5 days'
      },
      annual: { baseFee: 90 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 20,
        perMileFee: 0.06
      }
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 14.5 },
      height: { poleCar: 15 },
      length: { oneEscort: 100 }
    },
    travelRestrictions: {
      noNightTravel: true,
      noWeekendTravel: false,
      noHolidayTravel: true,
      weatherRestrictions: 'Spring weight restrictions March-May'
    },
    contact: {
      agency: 'Wisconsin DOT',
      phone: '608-266-9900',
      website: 'https://wisconsindot.gov/Pages/dmv/com-drv-vehs/mtr-car-trkr/osowgeninfo.aspx'
    }
  },

  // WYOMING
  {
    stateCode: 'WY',
    stateName: 'Wyoming',
    timezone: 'America/Denver',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14,
      maxLength: { single: 60, combination: 85 },
      maxWeight: { gross: 117000 }
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 25,
        processingTime: 'Same day',
        validity: '10 days'
      },
      annual: { baseFee: 125 }
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 25,
        perMileFee: 0.02
      }
    },
    escortRules: {
      width: { oneEscort: 14.5, twoEscorts: 18 },
      height: { poleCar: 16 },
      length: { oneEscort: 120 }
    },
    travelRestrictions: {
      noNightTravel: false,
      noWeekendTravel: false,
      noHolidayTravel: true
    },
    contact: {
      agency: 'Wyoming DOT',
      phone: '307-777-4375',
      website: 'http://www.dot.state.wy.us/home/trucking_commercial_vehicles.html'
    },
    notes: [
      'Wyoming allows long combination vehicles',
      'Higher weight limits on designated routes'
    ]
  }
]

// Helper functions
export function getStateByCode(code: string): StatePermitData | undefined {
  return statePermits.find(s => s.stateCode === code.toUpperCase())
}

export function getStateByName(name: string): StatePermitData | undefined {
  return statePermits.find(s => s.stateName.toLowerCase() === name.toLowerCase())
}

export function getAllStateCodes(): string[] {
  return statePermits.map(s => s.stateCode)
}

export function getStatesRequiringEscort(width: number, height: number, length: number): StatePermitData[] {
  return statePermits.filter(state => {
    const rules = state.escortRules
    return (
      width >= rules.width.oneEscort ||
      (rules.height?.poleCar && height >= rules.height.poleCar) ||
      (rules.length?.oneEscort && length >= rules.length.oneEscort)
    )
  })
}

export function getStatesWithNightRestrictions(): StatePermitData[] {
  return statePermits.filter(s => s.travelRestrictions.noNightTravel)
}

export function getStatesWithWeekendRestrictions(): StatePermitData[] {
  return statePermits.filter(s => s.travelRestrictions.noWeekendTravel)
}
