/**
 * Tanzania Health Facilities Data
 * Real facility types and structure based on MOH hierarchy
 */

export const TANZANIA_REGIONS = [
  'Dar es Salaam',
  'Mwanza',
  'Arusha',
  'Dodoma',
  'Mbeya',
  'Morogoro',
  'Tanga',
  'Kagera',
  'Mara',
  'Kilimanjaro',
  'Tabora',
  'Kigoma',
  'Mtwara',
  'Ruvuma',
  'Iringa',
  'Lindi',
  'Singida',
  'Shinyanga',
  'Rukwa',
  'Katavi',
  'Simiyu',
  'Geita',
  'Njombe',
  'Songwe',
  'Pwani'
];

export const FACILITY_TYPES = {
  NATIONAL: 'National Referral',
  ZONAL: 'Zonal Referral',
  REGIONAL: 'Regional Referral',
  DISTRICT: 'District Hospital',
  HEALTH_CENTRE: 'Health Centre',
  DISPENSARY: 'Dispensary'
};

export const SAMPLE_FACILITIES = [
  // National Referral Hospitals
  {
    id: 'FAC-001',
    name: 'Muhimbili National Hospital',
    shortName: 'MNH',
    region: 'Dar es Salaam',
    district: 'Ilala',
    type: FACILITY_TYPES.NATIONAL,
    beds: 1500,
    specialties: ['Cardiology', 'Oncology', 'Neurology', 'Surgery', 'Pediatrics'],
    dhis2Code: 'TZ-MNH-001',
    latitude: -6.7924,
    longitude: 39.2083
  },
  {
    id: 'FAC-002',
    name: 'Bugando Medical Centre',
    shortName: 'BMC',
    region: 'Mwanza',
    district: 'Nyamagana',
    type: FACILITY_TYPES.ZONAL,
    beds: 900,
    specialties: ['Surgery', 'Medicine', 'Pediatrics', 'Obstetrics'],
    dhis2Code: 'TZ-BMC-002',
    latitude: -2.5164,
    longitude: 32.9175
  },
  {
    id: 'FAC-003',
    name: 'Kilimanjaro Christian Medical Centre',
    shortName: 'KCMC',
    region: 'Kilimanjaro',
    district: 'Moshi Urban',
    type: FACILITY_TYPES.ZONAL,
    beds: 630,
    specialties: ['Orthopedics', 'Surgery', 'Medicine', 'Pediatrics'],
    dhis2Code: 'TZ-KCMC-003',
    latitude: -3.3359,
    longitude: 37.3419
  },

  // Zonal/Regional Hospitals
  {
    id: 'FAC-004',
    name: 'Mbeya Zonal Referral Hospital',
    shortName: 'MZRH',
    region: 'Mbeya',
    district: 'Mbeya Urban',
    type: FACILITY_TYPES.ZONAL,
    beds: 600,
    specialties: ['Medicine', 'Surgery', 'Pediatrics', 'Obstetrics'],
    dhis2Code: 'TZ-MZRH-004',
    latitude: -8.9094,
    longitude: 33.4606
  },
  {
    id: 'FAC-005',
    name: 'Temeke Regional Referral Hospital',
    shortName: 'TRRH',
    region: 'Dar es Salaam',
    district: 'Temeke',
    type: FACILITY_TYPES.REGIONAL,
    beds: 400,
    specialties: ['Medicine', 'Surgery', 'Obstetrics'],
    dhis2Code: 'TZ-TRRH-005',
    latitude: -6.8519,
    longitude: 39.2651
  },
  {
    id: 'FAC-006',
    name: 'Dodoma Regional Referral Hospital',
    shortName: 'DRRH',
    region: 'Dodoma',
    district: 'Dodoma Urban',
    type: FACILITY_TYPES.REGIONAL,
    beds: 350,
    specialties: ['Medicine', 'Surgery', 'Pediatrics'],
    dhis2Code: 'TZ-DRRH-006',
    latitude: -6.1630,
    longitude: 35.7516
  },

  // District Hospitals
  {
    id: 'FAC-007',
    name: 'Kilosa District Hospital',
    shortName: 'KDH',
    region: 'Morogoro',
    district: 'Kilosa',
    type: FACILITY_TYPES.DISTRICT,
    beds: 150,
    specialties: ['General Medicine', 'Surgery'],
    dhis2Code: 'TZ-KDH-007',
    latitude: -6.8330,
    longitude: 36.9833
  },
  {
    id: 'FAC-008',
    name: 'Tanga Urban District Hospital',
    shortName: 'TUDH',
    region: 'Tanga',
    district: 'Tanga Urban',
    type: FACILITY_TYPES.DISTRICT,
    beds: 180,
    specialties: ['General Medicine', 'Surgery', 'Pediatrics'],
    dhis2Code: 'TZ-TUDH-008',
    latitude: -5.0689,
    longitude: 39.0986
  },
  {
    id: 'FAC-009',
    name: 'Morogoro Regional Hospital',
    shortName: 'MRH',
    region: 'Morogoro',
    district: 'Morogoro Urban',
    type: FACILITY_TYPES.REGIONAL,
    beds: 320,
    specialties: ['Medicine', 'Surgery', 'Obstetrics'],
    dhis2Code: 'TZ-MRH-009',
    latitude: -6.8211,
    longitude: 37.6631
  },

  // Health Centres
  {
    id: 'FAC-010',
    name: 'Kibaha Health Centre',
    shortName: 'KHC',
    region: 'Pwani',
    district: 'Kibaha',
    type: FACILITY_TYPES.HEALTH_CENTRE,
    beds: 50,
    specialties: ['General Medicine', 'Maternal Health'],
    dhis2Code: 'TZ-KHC-010',
    latitude: -6.7666,
    longitude: 38.9166
  },
  {
    id: 'FAC-011',
    name: 'Mwananyamala Health Centre',
    shortName: 'MHC',
    region: 'Dar es Salaam',
    district: 'Kinondoni',
    type: FACILITY_TYPES.HEALTH_CENTRE,
    beds: 60,
    specialties: ['General Medicine', 'Maternal Health', 'Pediatrics'],
    dhis2Code: 'TZ-MHC-011',
    latitude: -6.7733,
    longitude: 39.2294
  },

  // Dispensaries
  {
    id: 'FAC-012',
    name: 'Mbagala Dispensary',
    shortName: 'MBD',
    region: 'Dar es Salaam',
    district: 'Temeke',
    type: FACILITY_TYPES.DISPENSARY,
    beds: 10,
    specialties: ['Primary Care'],
    dhis2Code: 'TZ-MBD-012',
    latitude: -6.8833,
    longitude: 39.2500
  }
];

export const getFacilitiesByRegion = (region) => {
  return SAMPLE_FACILITIES.filter(f => f.region === region);
};

export const getFacilitiesByType = (type) => {
  return SAMPLE_FACILITIES.filter(f => f.type === type);
};

export const getFacilityById = (id) => {
  return SAMPLE_FACILITIES.find(f => f.id === id);
};

export default SAMPLE_FACILITIES;
