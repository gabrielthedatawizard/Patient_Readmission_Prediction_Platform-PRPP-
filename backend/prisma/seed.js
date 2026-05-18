const { RiskTier, Priority, TaskStatus } = require('@prisma/client');
const { ROLE_PERMISSIONS } = require('../src/config/roles');
const { hash } = require('../src/lib/passwordHash');
const { prisma } = require('../src/lib/prisma');

const DEMO_PASSWORD = 'Trip@2026';

// Tanzania 7 geographic zones (mainland + Zanzibar grouped under Eastern)
const zones = [
  { id: 'ZN-LAK', code: 'LAK', name: 'Lake Zone' },
  { id: 'ZN-NOR', code: 'NOR', name: 'Northern Zone' },
  { id: 'ZN-CEN', code: 'CEN', name: 'Central Zone' },
  { id: 'ZN-SHL', code: 'SHL', name: 'Southern Highlands Zone' },
  { id: 'ZN-EAS', code: 'EAS', name: 'Eastern Zone' },
  { id: 'ZN-SOU', code: 'SOU', name: 'Southern Zone' },
  { id: 'ZN-WES', code: 'WES', name: 'Western Zone' }
];

// All 31 Tanzania administrative regions mapped to zones
const regions = [
  // Lake Zone (6)
  { code: 'MWZ', name: 'Mwanza',       zoneCode: 'LAK' },
  { code: 'GEI', name: 'Geita',        zoneCode: 'LAK' },
  { code: 'SIM', name: 'Simiyu',       zoneCode: 'LAK' },
  { code: 'MAR', name: 'Mara',         zoneCode: 'LAK' },
  { code: 'KAG', name: 'Kagera',       zoneCode: 'LAK' },
  { code: 'SHY', name: 'Shinyanga',    zoneCode: 'LAK' },
  // Northern Zone (4)
  { code: 'ARU', name: 'Arusha',       zoneCode: 'NOR' },
  { code: 'KIL', name: 'Kilimanjaro',  zoneCode: 'NOR' },
  { code: 'MAN', name: 'Manyara',      zoneCode: 'NOR' },
  { code: 'TAN', name: 'Tanga',        zoneCode: 'NOR' },
  // Central Zone (2)
  { code: 'DOD', name: 'Dodoma',       zoneCode: 'CEN' },
  { code: 'SIN', name: 'Singida',      zoneCode: 'CEN' },
  // Southern Highlands Zone (5)
  { code: 'MBE', name: 'Mbeya',        zoneCode: 'SHL' },
  { code: 'SON', name: 'Songwe',       zoneCode: 'SHL' },
  { code: 'IRI', name: 'Iringa',       zoneCode: 'SHL' },
  { code: 'NJO', name: 'Njombe',       zoneCode: 'SHL' },
  { code: 'RUK', name: 'Rukwa',        zoneCode: 'SHL' },
  // Eastern Zone — mainland (5) + Zanzibar (5) = 10
  { code: 'DAR', name: 'Dar es Salaam', zoneCode: 'EAS' },
  { code: 'MOR', name: 'Morogoro',     zoneCode: 'EAS' },
  { code: 'PWA', name: 'Pwani',        zoneCode: 'EAS' },
  { code: 'LIN', name: 'Lindi',        zoneCode: 'EAS' },
  { code: 'MTW', name: 'Mtwara',       zoneCode: 'EAS' },
  { code: 'ZNP', name: 'Kaskazini Pemba',          zoneCode: 'EAS' },
  { code: 'ZSP', name: 'Kusini Pemba',             zoneCode: 'EAS' },
  { code: 'ZNU', name: 'Kaskazini Unguja',          zoneCode: 'EAS' },
  { code: 'ZSU', name: 'Kusini na Kati Unguja',     zoneCode: 'EAS' },
  { code: 'ZMM', name: 'Mjini Magharibi (Zanzibar)', zoneCode: 'EAS' },
  // Southern Zone (2)
  { code: 'RUV', name: 'Ruvuma',       zoneCode: 'SOU' },
  { code: 'KAT', name: 'Katavi',       zoneCode: 'SOU' },
  // Western Zone (2)
  { code: 'TAB', name: 'Tabora',       zoneCode: 'WES' },
  { code: 'KIG', name: 'Kigoma',       zoneCode: 'WES' }
];

const facilities = [
  { id: 'FAC-MNH-001', name: 'Muhimbili National Hospital',  level: 'national_referral', district: 'Ilala',     regionCode: 'DAR' },
  { id: 'FAC-ARH-001', name: 'Arusha Regional Hospital',     level: 'regional_referral', district: 'Arusha',    regionCode: 'ARU' },
  { id: 'FAC-MWZ-001', name: 'Mwanza Regional Hospital',     level: 'regional_referral', district: 'Nyamagana', regionCode: 'MWZ' },
  { id: 'FAC-DOD-001', name: 'Dodoma District Hospital',     level: 'district',          district: 'Dodoma',    regionCode: 'DOD' },
  { id: 'FAC-MBE-001', name: 'Mbeya Zonal Hospital',         level: 'zonal_referral',    district: 'Mbeya',     regionCode: 'MBE' },
  { id: 'FAC-RUV-001', name: 'Ruvuma District Hospital',     level: 'district',          district: 'Songea',    regionCode: 'RUV' },
  { id: 'FAC-TAB-001', name: 'Tabora Regional Hospital',     level: 'regional_referral', district: 'Tabora',    regionCode: 'TAB' }
];

const roleAssignments = {
  moh: {},
  auditor: {},
  rhmt: { regionCode: 'DAR' },
  chmt: { regionCode: 'ARU', district: 'Arusha' },
  dhio: { regionCode: 'DAR', district: 'Ilala' },
  facility_manager: { facilityId: 'FAC-MNH-001' },
  tfadmin: { facilityId: 'FAC-MBE-001' },
  clinician: { facilityId: 'FAC-ARH-001', ward: 'Medical Ward A' },
  nurse: { facilityId: 'FAC-ARH-001', ward: 'Medical Ward A' },
  pharmacist: { facilityId: 'FAC-MWZ-001' },
  hro: { facilityId: 'FAC-DOD-001' },
  chw: { facilityId: 'FAC-DOD-001' },
  ml_engineer: {}
};

// ─── Comprehensive demo dataset — 22 patients across all 7 facilities ─────────
// Covers all 4 risk tiers, Tanzania-specific conditions, and realistic
// social risk factors so every dashboard and analytics view has data to show.

const patientSeeds = [
  // ── FAC-MNH-001 Muhimbili National Hospital, Dar es Salaam ──────────────────
  {
    id: 'PT-2026-0001',
    name: 'Amina Mwambungu',
    age: 67, gender: 'female',
    phone: '+255700100001',
    address: 'Ilala, Dar es Salaam',
    insurance: 'NHIF', status: 'admitted', facilityId: 'FAC-MNH-001',
    clinicalProfile: {
      age: 67, priorAdmissions12m: 3, lengthOfStayDays: 9,
      charlsonIndex: 4, egfr: 52, hemoglobin: 9.6, hba1c: 8.9,
      phoneAccess: true, transportationDifficulty: true, livesAlone: false,
      highRiskMedicationCount: 2, icuStayDays: 0, bpSystolic: 148, bpDiastolic: 92,
      hasHeartFailure: false, hasDiabetes: true, hasCkd: true
    }
  },
  {
    id: 'PT-2026-0004',
    name: 'Salma Jumbe',
    age: 78, gender: 'female',
    phone: null,
    address: 'Kinondoni, Dar es Salaam',
    insurance: 'NHIF', status: 'discharge_planning', facilityId: 'FAC-MNH-001',
    clinicalProfile: {
      age: 78, priorAdmissions12m: 4, lengthOfStayDays: 14,
      charlsonIndex: 8, egfr: 24, hemoglobin: 8.8, hba1c: null,
      phoneAccess: false, transportationDifficulty: true, livesAlone: true,
      highRiskMedicationCount: 3, icuStayDays: 3, bpSystolic: 168, bpDiastolic: 100,
      hasHeartFailure: true, hasDiabetes: false, hasCkd: true
    }
  },
  {
    id: 'PT-2026-0005',
    name: 'Hassan Abdallah',
    age: 55, gender: 'male',
    phone: '+255700100005',
    address: 'Temeke, Dar es Salaam',
    insurance: 'Cash', status: 'admitted', facilityId: 'FAC-MNH-001',
    clinicalProfile: {
      age: 55, priorAdmissions12m: 2, lengthOfStayDays: 6,
      charlsonIndex: 3, egfr: 71, hemoglobin: 10.8, hba1c: 9.2,
      phoneAccess: true, transportationDifficulty: false, livesAlone: false,
      highRiskMedicationCount: 2, icuStayDays: 0, bpSystolic: 152, bpDiastolic: 94,
      hasHeartFailure: false, hasDiabetes: true, hasMalaria: true
    }
  },
  {
    id: 'PT-2026-0006',
    name: 'Fatuma Ally',
    age: 38, gender: 'female',
    phone: '+255700100006',
    address: 'Mwananyamala, Dar es Salaam',
    insurance: 'None', status: 'admitted', facilityId: 'FAC-MNH-001',
    clinicalProfile: {
      age: 38, priorAdmissions12m: 1, lengthOfStayDays: 8,
      charlsonIndex: 2, egfr: 88, hemoglobin: 7.9, hba1c: null,
      phoneAccess: false, transportationDifficulty: true, livesAlone: false,
      highRiskMedicationCount: 2, icuStayDays: 0, bpSystolic: 110, bpDiastolic: 70,
      hasTuberculosis: true, hasSevereAcuteMalnutrition: true
    }
  },
  {
    id: 'PT-2026-0007',
    name: 'Zawadi Mkuya',
    age: 29, gender: 'female',
    phone: '+255700100007',
    address: 'Ubungo, Dar es Salaam',
    insurance: 'NHIF', status: 'admitted', facilityId: 'FAC-MNH-001',
    clinicalProfile: {
      age: 29, priorAdmissions12m: 0, lengthOfStayDays: 2,
      charlsonIndex: 0, egfr: 98, hemoglobin: 13.2, hba1c: null,
      phoneAccess: true, transportationDifficulty: false, livesAlone: false,
      highRiskMedicationCount: 0, icuStayDays: 0, bpSystolic: 112, bpDiastolic: 72
    }
  },

  // ── FAC-ARH-001 Arusha Regional Hospital ────────────────────────────────────
  {
    id: 'PT-2026-0002',
    name: 'Juma Kweka',
    age: 44, gender: 'male',
    phone: '+255700100002',
    address: 'Arusha City, Arusha',
    insurance: 'Cash', status: 'admitted', facilityId: 'FAC-ARH-001',
    clinicalProfile: {
      age: 44, priorAdmissions12m: 1, lengthOfStayDays: 4,
      charlsonIndex: 2, egfr: 82, hemoglobin: 12.5, hba1c: 7.2,
      phoneAccess: true, transportationDifficulty: false, livesAlone: false,
      highRiskMedicationCount: 0, icuStayDays: 0, bpSystolic: 130, bpDiastolic: 85
    }
  },
  {
    id: 'PT-2026-0008',
    name: 'Ibrahim Rashid',
    age: 70, gender: 'male',
    phone: '+255700100008',
    address: 'Arusha, Arusha',
    insurance: 'NHIF', status: 'discharge_planning', facilityId: 'FAC-ARH-001',
    clinicalProfile: {
      age: 70, priorAdmissions12m: 4, lengthOfStayDays: 13,
      charlsonIndex: 7, egfr: 31, hemoglobin: 9.2, hba1c: null,
      phoneAccess: true, transportationDifficulty: true, livesAlone: true,
      highRiskMedicationCount: 3, icuStayDays: 2, bpSystolic: 160, bpDiastolic: 95,
      hasHeartFailure: true, hasCkd: true
    }
  },
  {
    id: 'PT-2026-0009',
    name: 'Zainabu Mkwawa',
    age: 50, gender: 'female',
    phone: '+255700100009',
    address: 'Monduli, Arusha',
    insurance: 'NHIF', status: 'admitted', facilityId: 'FAC-ARH-001',
    clinicalProfile: {
      age: 50, priorAdmissions12m: 2, lengthOfStayDays: 7,
      charlsonIndex: 3, egfr: 68, hemoglobin: 9.8, hba1c: 9.6,
      phoneAccess: true, transportationDifficulty: true, livesAlone: false,
      highRiskMedicationCount: 3, icuStayDays: 0, bpSystolic: 145, bpDiastolic: 90,
      hasDiabetes: true, hasTuberculosis: true
    }
  },
  {
    id: 'PT-2026-0010',
    name: 'Peter Kimaro',
    age: 40, gender: 'male',
    phone: '+255700100010',
    address: 'Moshi, Kilimanjaro',
    insurance: 'Cash', status: 'admitted', facilityId: 'FAC-ARH-001',
    clinicalProfile: {
      age: 40, priorAdmissions12m: 0, lengthOfStayDays: 5,
      charlsonIndex: 1, egfr: 85, hemoglobin: 10.2, hba1c: null,
      phoneAccess: true, transportationDifficulty: false, livesAlone: false,
      highRiskMedicationCount: 1, icuStayDays: 0, bpSystolic: 122, bpDiastolic: 78,
      hasMalaria: true
    }
  },

  // ── FAC-MWZ-001 Mwanza Regional Hospital ────────────────────────────────────
  {
    id: 'PT-2026-0011',
    name: 'John Mwita',
    age: 74, gender: 'male',
    phone: null,
    address: 'Nyamagana, Mwanza',
    insurance: 'None', status: 'discharge_planning', facilityId: 'FAC-MWZ-001',
    clinicalProfile: {
      age: 74, priorAdmissions12m: 5, lengthOfStayDays: 16,
      charlsonIndex: 9, egfr: 19, hemoglobin: 8.4, hba1c: null,
      phoneAccess: false, transportationDifficulty: true, livesAlone: true,
      highRiskMedicationCount: 3, icuStayDays: 4, bpSystolic: 172, bpDiastolic: 102,
      hasHeartFailure: true, hasCkd: true
    }
  },
  {
    id: 'PT-2026-0012',
    name: 'Agnes Wambura',
    age: 58, gender: 'female',
    phone: '+255700100012',
    address: 'Ilemela, Mwanza',
    insurance: 'Cash', status: 'admitted', facilityId: 'FAC-MWZ-001',
    clinicalProfile: {
      age: 58, priorAdmissions12m: 2, lengthOfStayDays: 10,
      charlsonIndex: 3, egfr: 62, hemoglobin: 7.6, hba1c: null,
      phoneAccess: true, transportationDifficulty: true, livesAlone: false,
      highRiskMedicationCount: 2, icuStayDays: 1, bpSystolic: 118, bpDiastolic: 74,
      hasSevereAcuteMalnutrition: true, hasTuberculosis: true
    }
  },
  {
    id: 'PT-2026-0013',
    name: 'David Shayo',
    age: 33, gender: 'male',
    phone: '+255700100013',
    address: 'Sengerema, Mwanza',
    insurance: 'NHIF', status: 'admitted', facilityId: 'FAC-MWZ-001',
    clinicalProfile: {
      age: 33, priorAdmissions12m: 1, lengthOfStayDays: 4,
      charlsonIndex: 2, egfr: 79, hemoglobin: 9.1, hba1c: null,
      phoneAccess: true, transportationDifficulty: false, livesAlone: false,
      highRiskMedicationCount: 1, icuStayDays: 0, bpSystolic: 128, bpDiastolic: 82,
      hasSickleCellDisease: true
    }
  },

  // ── FAC-DOD-001 Dodoma District Hospital ────────────────────────────────────
  {
    id: 'PT-2026-0003',
    name: 'Rehema Mussa',
    age: 73, gender: 'female',
    phone: null,
    address: 'Chamwino, Dodoma',
    insurance: 'NHIF', status: 'discharge_planning', facilityId: 'FAC-DOD-001',
    clinicalProfile: {
      age: 73, priorAdmissions12m: 2, lengthOfStayDays: 11,
      charlsonIndex: 5, egfr: null, hemoglobin: 10.1, hba1c: null,
      phoneAccess: false, transportationDifficulty: true, livesAlone: true,
      highRiskMedicationCount: 1, icuStayDays: 1, bpSystolic: null, bpDiastolic: null
    }
  },
  {
    id: 'PT-2026-0014',
    name: 'Celestina Ndege',
    age: 65, gender: 'female',
    phone: '+255700100014',
    address: 'Dodoma City, Dodoma',
    insurance: 'NHIF', status: 'admitted', facilityId: 'FAC-DOD-001',
    clinicalProfile: {
      age: 65, priorAdmissions12m: 2, lengthOfStayDays: 8,
      charlsonIndex: 4, egfr: 44, hemoglobin: 10.4, hba1c: 9.8,
      phoneAccess: true, transportationDifficulty: true, livesAlone: false,
      highRiskMedicationCount: 2, icuStayDays: 0, bpSystolic: 156, bpDiastolic: 96,
      hasDiabetes: true, hasCkd: true
    }
  },
  {
    id: 'PT-2026-0015',
    name: 'Ahmed Mwanga',
    age: 47, gender: 'male',
    phone: '+255700100015',
    address: 'Kondoa, Dodoma',
    insurance: 'None', status: 'admitted', facilityId: 'FAC-DOD-001',
    clinicalProfile: {
      age: 47, priorAdmissions12m: 1, lengthOfStayDays: 6,
      charlsonIndex: 1, egfr: 76, hemoglobin: 9.4, hba1c: null,
      phoneAccess: true, transportationDifficulty: true, livesAlone: false,
      highRiskMedicationCount: 2, icuStayDays: 0, bpSystolic: 118, bpDiastolic: 76,
      hasTuberculosis: true, hasMalaria: true
    }
  },

  // ── FAC-MBE-001 Mbeya Zonal Hospital ────────────────────────────────────────
  {
    id: 'PT-2026-0016',
    name: 'Rosa Mwasonga',
    age: 81, gender: 'female',
    phone: null,
    address: 'Mbeya City, Mbeya',
    insurance: 'NHIF', status: 'discharge_planning', facilityId: 'FAC-MBE-001',
    clinicalProfile: {
      age: 81, priorAdmissions12m: 5, lengthOfStayDays: 18,
      charlsonIndex: 10, egfr: 16, hemoglobin: 8.1, hba1c: null,
      phoneAccess: false, transportationDifficulty: true, livesAlone: true,
      highRiskMedicationCount: 4, icuStayDays: 5, bpSystolic: 178, bpDiastolic: 106,
      hasHeartFailure: true, hasCkd: true
    }
  },
  {
    id: 'PT-2026-0017',
    name: 'Michael Phiri',
    age: 54, gender: 'male',
    phone: '+255700100017',
    address: 'Chunya, Mbeya',
    insurance: 'None', status: 'admitted', facilityId: 'FAC-MBE-001',
    clinicalProfile: {
      age: 54, priorAdmissions12m: 2, lengthOfStayDays: 9,
      charlsonIndex: 3, egfr: 58, hemoglobin: 7.8, hba1c: null,
      phoneAccess: false, transportationDifficulty: true, livesAlone: false,
      highRiskMedicationCount: 1, icuStayDays: 1, bpSystolic: 108, bpDiastolic: 68,
      hasMalaria: true, hasSevereAcuteMalnutrition: true
    }
  },

  // ── FAC-RUV-001 Ruvuma District Hospital ────────────────────────────────────
  {
    id: 'PT-2026-0018',
    name: 'Lucia Magingi',
    age: 70, gender: 'female',
    phone: '+255700100018',
    address: 'Songea, Ruvuma',
    insurance: 'NHIF', status: 'admitted', facilityId: 'FAC-RUV-001',
    clinicalProfile: {
      age: 70, priorAdmissions12m: 3, lengthOfStayDays: 10,
      charlsonIndex: 5, egfr: 38, hemoglobin: 9.6, hba1c: 10.2,
      phoneAccess: true, transportationDifficulty: false, livesAlone: false,
      highRiskMedicationCount: 2, icuStayDays: 0, bpSystolic: 162, bpDiastolic: 98,
      hasDiabetes: true, hasCkd: true, hasSickleCellDisease: true
    }
  },
  {
    id: 'PT-2026-0019',
    name: 'Emmanuel Nkosi',
    age: 28, gender: 'male',
    phone: '+255700100019',
    address: 'Mbinga, Ruvuma',
    insurance: 'None', status: 'admitted', facilityId: 'FAC-RUV-001',
    clinicalProfile: {
      age: 28, priorAdmissions12m: 1, lengthOfStayDays: 5,
      charlsonIndex: 1, egfr: 90, hemoglobin: 10.5, hba1c: null,
      phoneAccess: true, transportationDifficulty: true, livesAlone: false,
      highRiskMedicationCount: 2, icuStayDays: 0, bpSystolic: 114, bpDiastolic: 72,
      hasTuberculosis: true
    }
  },

  // ── FAC-TAB-001 Tabora Regional Hospital ────────────────────────────────────
  {
    id: 'PT-2026-0020',
    name: 'Mariam Kaseko',
    age: 67, gender: 'female',
    phone: null,
    address: 'Tabora Municipality, Tabora',
    insurance: 'NHIF', status: 'discharge_planning', facilityId: 'FAC-TAB-001',
    clinicalProfile: {
      age: 67, priorAdmissions12m: 3, lengthOfStayDays: 12,
      charlsonIndex: 7, egfr: 26, hemoglobin: 8.6, hba1c: null,
      phoneAccess: false, transportationDifficulty: true, livesAlone: true,
      highRiskMedicationCount: 3, icuStayDays: 2, bpSystolic: 170, bpDiastolic: 104,
      hasHeartFailure: true, hasCkd: true
    }
  },
  {
    id: 'PT-2026-0021',
    name: 'Francis Kalinga',
    age: 45, gender: 'male',
    phone: '+255700100021',
    address: 'Nzega, Tabora',
    insurance: 'Cash', status: 'admitted', facilityId: 'FAC-TAB-001',
    clinicalProfile: {
      age: 45, priorAdmissions12m: 3, lengthOfStayDays: 8,
      charlsonIndex: 2, egfr: 72, hemoglobin: 7.4, hba1c: null,
      phoneAccess: true, transportationDifficulty: true, livesAlone: false,
      highRiskMedicationCount: 1, icuStayDays: 0, bpSystolic: 106, bpDiastolic: 64,
      hasMalaria: true, hasSevereAcuteMalnutrition: true
    }
  },
  {
    id: 'PT-2026-0022',
    name: 'Neema Chande',
    age: 34, gender: 'female',
    phone: '+255700100022',
    address: 'Tabora City, Tabora',
    insurance: 'NHIF', status: 'admitted', facilityId: 'FAC-TAB-001',
    clinicalProfile: {
      age: 34, priorAdmissions12m: 0, lengthOfStayDays: 3,
      charlsonIndex: 0, egfr: 94, hemoglobin: 12.8, hba1c: null,
      phoneAccess: true, transportationDifficulty: false, livesAlone: false,
      highRiskMedicationCount: 0, icuStayDays: 0, bpSystolic: 118, bpDiastolic: 76
    }
  }
];

async function seedZones() {
  const zoneMap = new Map();

  for (const zone of zones) {
    const saved = await prisma.zone.upsert({
      where: { id: zone.id },
      update: { name: zone.name, code: zone.code },
      create: zone
    });

    zoneMap.set(zone.code, saved);
  }

  return zoneMap;
}

async function seedRegions(zoneMap) {
  const regionMap = new Map();

  for (const region of regions) {
    const zone = zoneMap ? zoneMap.get(region.zoneCode) : null;
    const data = {
      name: region.name,
      ...(zone ? { zoneId: zone.id } : {})
    };

    const saved = await prisma.region.upsert({
      where: { code: region.code },
      update: data,
      create: { code: region.code, ...data }
    });

    regionMap.set(saved.code, saved);
  }

  return regionMap;
}

async function seedFacilities(regionMap) {
  for (const facility of facilities) {
    const region = regionMap.get(facility.regionCode);

    await prisma.facility.upsert({
      where: { id: facility.id },
      update: {
        name: facility.name,
        level: facility.level,
        district: facility.district,
        regionId: region.id
      },
      create: {
        id: facility.id,
        name: facility.name,
        level: facility.level,
        district: facility.district,
        regionId: region.id
      }
    });
  }
}

async function seedRoles() {
  const roleMap = new Map();

  for (const [slug, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const saved = await prisma.role.upsert({
      where: { slug },
      update: {
        label: slug.replace(/_/g, ' '),
        permissions
      },
      create: {
        slug,
        label: slug.replace(/_/g, ' '),
        permissions
      }
    });

    roleMap.set(slug, saved);
  }

  return roleMap;
}

async function seedUsers(roleMap, regionMap) {
  const passwordHash = await hash(DEMO_PASSWORD, 10);

  for (const slug of Object.keys(ROLE_PERMISSIONS)) {
    const assignment = roleAssignments[slug] || {};
    const role = roleMap.get(slug);

    let regionId = null;

    if (assignment.regionCode) {
      regionId = regionMap.get(assignment.regionCode)?.id || null;
    } else if (assignment.facilityId) {
      const facility = facilities.find((item) => item.id === assignment.facilityId);
      if (facility) {
        regionId = regionMap.get(facility.regionCode)?.id || null;
      }
    }

    await prisma.user.upsert({
      where: { email: `${slug}@trip.go.tz` },
      update: {
        fullName: `${slug.replace(/_/g, ' ')} Demo User`,
        passwordHash,
        roleId: role.id,
        facilityId: assignment.facilityId || null,
        regionId,
        district: assignment.district || null,
        ward: assignment.ward || null,
        mfaEnabled: false,
        mfaSecret: null
      },
      create: {
        email: `${slug}@trip.go.tz`,
        fullName: `${slug.replace(/_/g, ' ')} Demo User`,
        passwordHash,
        roleId: role.id,
        facilityId: assignment.facilityId || null,
        regionId,
        district: assignment.district || null,
        ward: assignment.ward || null,
        mfaEnabled: false,
        mfaSecret: null
      }
    });
  }
}

async function seedPatients() {
  for (const patient of patientSeeds) {
    await prisma.patient.upsert({
      where: { id: patient.id },
      update: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        address: patient.address,
        insurance: patient.insurance,
        status: patient.status,
        clinicalProfile: patient.clinicalProfile,
        facilityId: patient.facilityId
      },
      create: patient
    });
  }
}

async function seedClinicalRecords() {
  const [clinician, chw] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'clinician@trip.go.tz' } }),
    prisma.user.findUnique({ where: { email: 'chw@trip.go.tz' } }),
  ]);
  if (!clinician) return;

  const chwId   = chw?.id || clinician.id;
  const base    = new Date('2026-05-18T00:00:00Z');
  const daysOut = (n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };

  const TIER = {
    VeryHigh: RiskTier.VeryHigh, High: RiskTier.High,
    Medium: RiskTier.Medium,     Low:  RiskTier.Low
  };
  const PRIO = {
    critical: Priority.high, high: Priority.high,
    medium:   Priority.medium, low: Priority.low
  };

  // ── Prior visits (shown as readmission history) ──────────────────────────
  const priorVisits = [
    {
      id: 'VIS-PT-2026-0001-P', patientId: 'PT-2026-0001', facilityId: 'FAC-MNH-001',
      admissionDate: new Date('2025-12-03T10:30:00Z'),
      dischargeDate: new Date('2025-12-08T14:00:00Z'),
      diagnosis: 'I50.9', diagnoses: ['I50.9'], medications: ['Furosemide'],
      labResults: { egfr: 56, hemoglobin: 10.4 },
      vitalSigns: { bpSystolic: 150, bpDiastolic: 88 },
      socialFactors: { phoneAccess: true, transportationDifficulty: false, livesAlone: false },
      dischargeDisposition: 'home', ward: 'Medical Ward B', lengthOfStay: 5
    },
    {
      id: 'VIS-PT-2026-0009-P', patientId: 'PT-2026-0009', facilityId: 'FAC-ARH-001',
      admissionDate: new Date('2026-04-10T08:00:00Z'),
      dischargeDate: new Date('2026-04-16T12:00:00Z'),
      diagnosis: 'A15.0', diagnoses: ['A15.0'],
      medications: ['Rifampicin', 'Isoniazid', 'Pyrazinamide', 'Ethambutol'],
      labResults: { egfr: 70, hemoglobin: 10.2 },
      vitalSigns: { bpSystolic: 138, bpDiastolic: 88 },
      socialFactors: { phoneAccess: true, transportationDifficulty: true, livesAlone: false },
      dischargeDisposition: 'home', ward: 'Medical Ward B', lengthOfStay: 6
    }
  ];

  for (const pv of priorVisits) {
    const { id, ...rest } = pv;
    await prisma.visit.upsert({ where: { id }, update: rest, create: { id, ...rest } });
  }

  // ── All 22 clinical records ──────────────────────────────────────────────
  const records = [
    // [1] PT-2026-0001  Amina      FAC-MNH-001  High
    { visitId: 'VIS-TRIP-DEMO-0001', patientId: 'PT-2026-0001', facilityId: 'FAC-MNH-001',
      admDate: new Date('2026-02-10'), diagnosis: 'E11.65', diagnoses: ['E11.65', 'N18.3'],
      medications: ['Metformin', 'Furosemide', 'Lisinopril'], ward: 'Medical Ward B', los: 9,
      labs: { egfr: 52, hemoglobin: 9.6, hba1c: 8.9 }, vitals: { bpSystolic: 148, bpDiastolic: 92 },
      social: { phoneAccess: true, transportationDifficulty: true, livesAlone: false },
      score: 78, prob: 0.78, tier: 'High',
      factors: [
        { factor: 'Frequent prior admissions', weight: 0.29 },
        { factor: 'Comorbidity burden', weight: 0.24 },
        { factor: 'Transport barrier', weight: 0.18 }
      ],
      explanation: 'High readmission risk — diabetes with CKD and transport barrier.',
      tasks: [
        { id: 'TASK-TRIP-DEMO-0001', title: 'Complete medication reconciliation within 24 hours',
          category: 'medication', priority: 'high', dueDate: daysOut(1) }
      ],
      followUps: [
        { id: 'FSCHED-0001-D3', type: 'phone_call', title: 'Day 3 Phone Check-in — Amina', days: 3 },
        { id: 'FSCHED-0001-D7', type: 'home_visit',  title: 'Day 7 CHW Home Visit — Amina', days: 7 }
      ]
    },

    // [2] PT-2026-0004  Salma      FAC-MNH-001  VeryHigh
    { visitId: 'VIS-PT-2026-0004', patientId: 'PT-2026-0004', facilityId: 'FAC-MNH-001',
      admDate: new Date('2026-04-30'), diagnosis: 'I50.9', diagnoses: ['I50.9', 'N18.5'],
      medications: ['Furosemide', 'Spironolactone', 'Digoxin', 'Warfarin'], ward: 'Cardiac ICU', los: 14,
      labs: { egfr: 24, hemoglobin: 8.8 }, vitals: { bpSystolic: 168, bpDiastolic: 100 },
      social: { phoneAccess: false, transportationDifficulty: true, livesAlone: true },
      score: 91, prob: 0.91, tier: 'VeryHigh',
      factors: [
        { factor: 'Advanced heart failure with fluid overload', weight: 0.31 },
        { factor: 'Severe CKD stage 5 (eGFR 24)', weight: 0.26 },
        { factor: 'No phone — CHW home visit required', weight: 0.21 },
        { factor: 'Lives alone, no caregiver', weight: 0.16 }
      ],
      explanation: 'Very high readmission risk — advanced heart failure with severe CKD, social isolation, no caregiver.',
      tasks: [
        { id: 'TASK-0004A', title: 'Urgent CHW home visit within 48h of discharge',
          category: 'follow_up', priority: 'critical', dueDate: daysOut(2) },
        { id: 'TASK-0004B', title: 'Arrange community transport for cardiac follow-up clinic',
          category: 'logistics', priority: 'high', dueDate: daysOut(5) },
        { id: 'TASK-0004C', title: 'Nephrologist referral — eGFR 24 (CKD stage 5)',
          category: 'referral', priority: 'critical', dueDate: daysOut(3) }
      ],
      followUps: [
        { id: 'FSCHED-0004-D3',  type: 'home_visit',   title: 'Day 3 CHW Home Visit — Salma', days: 3 },
        { id: 'FSCHED-0004-D7',  type: 'home_visit',   title: 'Day 7 CHW Home Visit — Salma', days: 7 },
        { id: 'FSCHED-0004-D14', type: 'clinic_visit', title: 'Day 14 Cardiac Clinic — Salma', days: 14 },
        { id: 'FSCHED-0004-D30', type: 'clinic_visit', title: 'Day 30 Nephrology Review — Salma', days: 30 }
      ]
    },

    // [3] PT-2026-0005  Hassan     FAC-MNH-001  High
    { visitId: 'VIS-PT-2026-0005', patientId: 'PT-2026-0005', facilityId: 'FAC-MNH-001',
      admDate: new Date('2026-05-05'), diagnosis: 'B50.8', diagnoses: ['B50.8', 'E11.9'],
      medications: ['Artemether-Lumefantrine', 'Metformin', 'Lisinopril'], ward: 'Medical Ward A', los: 6,
      labs: { egfr: 71, hemoglobin: 10.8, hba1c: 9.2 }, vitals: { bpSystolic: 152, bpDiastolic: 94 },
      social: { phoneAccess: true, transportationDifficulty: false, livesAlone: false },
      score: 72, prob: 0.72, tier: 'High',
      factors: [
        { factor: 'Malaria — seasonal recurrence risk', weight: 0.27 },
        { factor: 'Poorly controlled diabetes (HbA1c 9.2)', weight: 0.25 },
        { factor: 'Prior hospitalisations in 12 months', weight: 0.20 }
      ],
      explanation: 'High risk — recurrent malaria with poorly controlled diabetes.',
      tasks: [
        { id: 'TASK-0005A', title: 'Malaria prophylaxis education and ITN provision',
          category: 'education', priority: 'high', dueDate: daysOut(2) }
      ],
      followUps: [
        { id: 'FSCHED-0005-D3', type: 'phone_call',  title: 'Day 3 Malaria Follow-up Call — Hassan', days: 3 },
        { id: 'FSCHED-0005-D7', type: 'clinic_visit', title: 'Day 7 Diabetes Clinic — Hassan', days: 7 }
      ]
    },

    // [4] PT-2026-0006  Fatuma     FAC-MNH-001  High
    { visitId: 'VIS-PT-2026-0006', patientId: 'PT-2026-0006', facilityId: 'FAC-MNH-001',
      admDate: new Date('2026-05-02'), diagnosis: 'A15.0', diagnoses: ['A15.0', 'E43'],
      medications: ['Rifampicin', 'Isoniazid', 'Pyrazinamide', 'Ethambutol'], ward: 'TB Ward', los: 8,
      labs: { egfr: 88, hemoglobin: 7.9 }, vitals: { bpSystolic: 110, bpDiastolic: 70 },
      social: { phoneAccess: false, transportationDifficulty: true, livesAlone: false },
      score: 68, prob: 0.68, tier: 'High',
      factors: [
        { factor: 'Severe acute malnutrition', weight: 0.33 },
        { factor: 'Active TB — adherence risk', weight: 0.29 },
        { factor: 'No phone access', weight: 0.22 }
      ],
      explanation: 'High risk — TB with severe malnutrition and no communication access. DOT supervision required.',
      tasks: [
        { id: 'TASK-0006A', title: 'Enrol in TB DOT program with village health worker',
          category: 'follow_up', priority: 'high', dueDate: daysOut(2) }
      ],
      followUps: [
        { id: 'FSCHED-0006-D3', type: 'home_visit', title: 'Day 3 DOT Supervision Visit — Fatuma', days: 3 },
        { id: 'FSCHED-0006-D7', type: 'home_visit', title: 'Day 7 Nutrition Assessment — Fatuma', days: 7 }
      ]
    },

    // [5] PT-2026-0007  Zawadi     FAC-MNH-001  Low
    { visitId: 'VIS-PT-2026-0007', patientId: 'PT-2026-0007', facilityId: 'FAC-MNH-001',
      admDate: new Date('2026-05-14'), diagnosis: 'J06.9', diagnoses: ['J06.9'],
      medications: ['Amoxicillin', 'Paracetamol'], ward: 'General Ward', los: 2,
      labs: { egfr: 98, hemoglobin: 13.2 }, vitals: { bpSystolic: 112, bpDiastolic: 72 },
      social: { phoneAccess: true, transportationDifficulty: false, livesAlone: false },
      score: 18, prob: 0.18, tier: 'Low',
      factors: [
        { factor: 'Young age — protective factor', weight: 0.42 },
        { factor: 'No prior admissions', weight: 0.35 }
      ],
      explanation: 'Low readmission risk — first admission, acute respiratory infection, healthy young patient.',
      tasks: [], followUps: []
    },

    // [6] PT-2026-0002  Juma       FAC-ARH-001  Medium
    { visitId: 'VIS-PT-2026-0002', patientId: 'PT-2026-0002', facilityId: 'FAC-ARH-001',
      admDate: new Date('2026-05-10'), diagnosis: 'E11.9', diagnoses: ['E11.9'],
      medications: ['Metformin', 'Glibenclamide'], ward: 'Medical Ward A', los: 4,
      labs: { egfr: 82, hemoglobin: 12.5, hba1c: 7.2 }, vitals: { bpSystolic: 130, bpDiastolic: 85 },
      social: { phoneAccess: true, transportationDifficulty: false, livesAlone: false },
      score: 45, prob: 0.45, tier: 'Medium',
      factors: [
        { factor: 'One prior admission', weight: 0.31 },
        { factor: 'Diabetes — glucose monitoring needed', weight: 0.28 }
      ],
      explanation: 'Medium risk — diabetes management needs outpatient follow-up to prevent deterioration.',
      tasks: [
        { id: 'TASK-0002A', title: 'Schedule diabetes review at 2 weeks post-discharge',
          category: 'follow_up', priority: 'medium', dueDate: daysOut(14) }
      ],
      followUps: [
        { id: 'FSCHED-0002-D7', type: 'clinic_visit', title: 'Day 7 Diabetes Outpatient Review — Juma', days: 7 }
      ]
    },

    // [7] PT-2026-0008  Ibrahim    FAC-ARH-001  VeryHigh
    { visitId: 'VIS-PT-2026-0008', patientId: 'PT-2026-0008', facilityId: 'FAC-ARH-001',
      admDate: new Date('2026-05-01'), diagnosis: 'I50.1', diagnoses: ['I50.1', 'N18.4'],
      medications: ['Furosemide', 'Enalapril', 'Carvedilol', 'Digoxin'], ward: 'Cardiac Ward', los: 13,
      labs: { egfr: 31, hemoglobin: 9.2 }, vitals: { bpSystolic: 160, bpDiastolic: 95 },
      social: { phoneAccess: true, transportationDifficulty: true, livesAlone: true },
      score: 88, prob: 0.88, tier: 'VeryHigh',
      factors: [
        { factor: 'Left ventricular heart failure', weight: 0.30 },
        { factor: 'CKD stage 4 (eGFR 31) — cardiorenal syndrome', weight: 0.27 },
        { factor: 'Lives alone — no caregiver', weight: 0.22 },
        { factor: 'Transport barrier to cardiology', weight: 0.15 }
      ],
      explanation: 'Very high risk — cardiorenal syndrome with social isolation requires structured community support.',
      tasks: [
        { id: 'TASK-0008A', title: 'CHW daily weight monitoring — first 7 days',
          category: 'monitoring', priority: 'critical', dueDate: daysOut(1) },
        { id: 'TASK-0008B', title: 'Cardiology outpatient review within 14 days',
          category: 'referral', priority: 'high', dueDate: daysOut(14) }
      ],
      followUps: [
        { id: 'FSCHED-0008-D3',  type: 'home_visit',   title: 'Day 3 CHW Home Visit — Ibrahim', days: 3 },
        { id: 'FSCHED-0008-D7',  type: 'home_visit',   title: 'Day 7 CHW Weight & Fluid — Ibrahim', days: 7 },
        { id: 'FSCHED-0008-D14', type: 'clinic_visit', title: 'Day 14 Cardiology Review — Ibrahim', days: 14 },
        { id: 'FSCHED-0008-D30', type: 'clinic_visit', title: 'Day 30 Kidney Function Check — Ibrahim', days: 30 }
      ]
    },

    // [8] PT-2026-0009  Zainabu    FAC-ARH-001  High
    { visitId: 'VIS-PT-2026-0009', patientId: 'PT-2026-0009', facilityId: 'FAC-ARH-001',
      admDate: new Date('2026-05-08'), diagnosis: 'A15.0', diagnoses: ['A15.0', 'E11.9'],
      medications: ['Rifampicin', 'Isoniazid', 'Pyrazinamide', 'Ethambutol', 'Metformin'],
      ward: 'Medical Ward B', los: 7,
      labs: { egfr: 68, hemoglobin: 9.8, hba1c: 9.6 }, vitals: { bpSystolic: 145, bpDiastolic: 90 },
      social: { phoneAccess: true, transportationDifficulty: true, livesAlone: false },
      score: 71, prob: 0.71, tier: 'High',
      factors: [
        { factor: 'Active TB with adherence risk', weight: 0.30 },
        { factor: 'Uncontrolled diabetes (HbA1c 9.6)', weight: 0.27 },
        { factor: 'Transport barrier', weight: 0.18 }
      ],
      explanation: 'High risk — TB-diabetes co-morbidity with transport barrier increases missed treatment risk.',
      tasks: [
        { id: 'TASK-0009A', title: 'TB-DM co-management: coordinate DOT and insulin adherence',
          category: 'follow_up', priority: 'high', dueDate: daysOut(3) }
      ],
      followUps: [
        { id: 'FSCHED-0009-D3', type: 'phone_call',  title: 'Day 3 TB Adherence Call — Zainabu', days: 3 },
        { id: 'FSCHED-0009-D7', type: 'clinic_visit', title: 'Day 7 TB-DM Clinic Review — Zainabu', days: 7 }
      ]
    },

    // [9] PT-2026-0010  Peter      FAC-ARH-001  Medium
    { visitId: 'VIS-PT-2026-0010', patientId: 'PT-2026-0010', facilityId: 'FAC-ARH-001',
      admDate: new Date('2026-05-12'), diagnosis: 'B54', diagnoses: ['B54'],
      medications: ['Artemether-Lumefantrine'], ward: 'General Ward', los: 5,
      labs: { egfr: 85, hemoglobin: 10.2 }, vitals: { bpSystolic: 122, bpDiastolic: 78 },
      social: { phoneAccess: true, transportationDifficulty: false, livesAlone: false },
      score: 38, prob: 0.38, tier: 'Medium',
      factors: [
        { factor: 'Malaria — seasonal recurrence risk', weight: 0.38 },
        { factor: 'Mild anaemia — monitor', weight: 0.28 }
      ],
      explanation: 'Medium risk — malaria with mild anaemia, standard follow-up recommended.',
      tasks: [
        { id: 'TASK-0010A', title: 'ITN distribution and malaria prevention counselling',
          category: 'education', priority: 'medium', dueDate: daysOut(7) }
      ],
      followUps: [
        { id: 'FSCHED-0010-D7', type: 'phone_call', title: 'Day 7 Malaria Recovery Check — Peter', days: 7 }
      ]
    },

    // [10] PT-2026-0011  John      FAC-MWZ-001  VeryHigh
    { visitId: 'VIS-PT-2026-0011', patientId: 'PT-2026-0011', facilityId: 'FAC-MWZ-001',
      admDate: new Date('2026-04-26'), diagnosis: 'I50.9', diagnoses: ['I50.9', 'N18.5'],
      medications: ['Furosemide', 'Spironolactone', 'Carvedilol', 'Hydralazine'], ward: 'ICU', los: 16,
      labs: { egfr: 19, hemoglobin: 8.4 }, vitals: { bpSystolic: 172, bpDiastolic: 102 },
      social: { phoneAccess: false, transportationDifficulty: true, livesAlone: true },
      score: 94, prob: 0.94, tier: 'VeryHigh',
      factors: [
        { factor: '5 admissions in 12 months — extreme utilisation', weight: 0.34 },
        { factor: 'Refractory heart failure with CKD5 (eGFR 19)', weight: 0.31 },
        { factor: 'ICU stay 4 days — severe episode', weight: 0.20 },
        { factor: 'No phone, no caregiver, no transport', weight: 0.15 }
      ],
      explanation: 'Extreme readmission risk — refractory cardiorenal syndrome in isolated patient. Palliative care assessment recommended.',
      tasks: [
        { id: 'TASK-0011A', title: 'Assign dedicated CHW as primary contact on discharge',
          category: 'follow_up', priority: 'critical', dueDate: daysOut(1) },
        { id: 'TASK-0011B', title: 'Social worker referral — community care package',
          category: 'social', priority: 'critical', dueDate: daysOut(2) },
        { id: 'TASK-0011C', title: 'Palliative care consultation — end-stage CKD',
          category: 'referral', priority: 'high', dueDate: daysOut(3) }
      ],
      followUps: [
        { id: 'FSCHED-0011-D3',  type: 'home_visit',   title: 'Day 3 CHW Urgent Visit — John', days: 3 },
        { id: 'FSCHED-0011-D7',  type: 'home_visit',   title: 'Day 7 CHW Assessment — John', days: 7 },
        { id: 'FSCHED-0011-D14', type: 'home_visit',   title: 'Day 14 CHW Support — John', days: 14 },
        { id: 'FSCHED-0011-D30', type: 'clinic_visit', title: 'Day 30 Nephrology Consult — John', days: 30 }
      ]
    },

    // [11] PT-2026-0012  Agnes     FAC-MWZ-001  High
    { visitId: 'VIS-PT-2026-0012', patientId: 'PT-2026-0012', facilityId: 'FAC-MWZ-001',
      admDate: new Date('2026-05-03'), diagnosis: 'A15.0', diagnoses: ['A15.0', 'E43'],
      medications: ['Rifampicin', 'Isoniazid', 'Pyrazinamide', 'Ethambutol', 'F75 therapeutic milk'],
      ward: 'Nutrition Ward', los: 10,
      labs: { egfr: 62, hemoglobin: 7.6 }, vitals: { bpSystolic: 118, bpDiastolic: 74 },
      social: { phoneAccess: true, transportationDifficulty: true, livesAlone: false },
      score: 75, prob: 0.75, tier: 'High',
      factors: [
        { factor: 'Severe acute malnutrition — recovery monitoring needed', weight: 0.35 },
        { factor: 'Active pulmonary TB', weight: 0.28 },
        { factor: 'ICU admission — severe episode', weight: 0.18 }
      ],
      explanation: 'High risk — SAM with TB requires therapeutic feeding continuation and TB adherence support.',
      tasks: [
        { id: 'TASK-0012A', title: 'Community RUTF provision and monthly weight tracking',
          category: 'nutrition', priority: 'high', dueDate: daysOut(3) }
      ],
      followUps: [
        { id: 'FSCHED-0012-D3', type: 'home_visit',  title: 'Day 3 Nutrition & TB Visit — Agnes', days: 3 },
        { id: 'FSCHED-0012-D7', type: 'clinic_visit', title: 'Day 7 Nutrition Clinic — Agnes', days: 7 }
      ]
    },

    // [12] PT-2026-0013  David     FAC-MWZ-001  Medium
    { visitId: 'VIS-PT-2026-0013', patientId: 'PT-2026-0013', facilityId: 'FAC-MWZ-001',
      admDate: new Date('2026-05-11'), diagnosis: 'D57.1', diagnoses: ['D57.1'],
      medications: ['Folic acid', 'Hydroxycarbamide', 'Morphine PRN'], ward: 'Medical Ward', los: 4,
      labs: { egfr: 79, hemoglobin: 9.1 }, vitals: { bpSystolic: 128, bpDiastolic: 82 },
      social: { phoneAccess: true, transportationDifficulty: false, livesAlone: false },
      score: 42, prob: 0.42, tier: 'Medium',
      factors: [
        { factor: 'Sickle cell disease — vaso-occlusive pattern', weight: 0.40 },
        { factor: 'Prior SCD crisis admission', weight: 0.32 }
      ],
      explanation: 'Medium risk — sickle cell disease with prior crisis, hydroxyurea therapy ongoing.',
      tasks: [
        { id: 'TASK-0013A', title: 'SCD crisis prevention education — hydration, triggers, pain plan',
          category: 'education', priority: 'medium', dueDate: daysOut(7) }
      ],
      followUps: [
        { id: 'FSCHED-0013-D7', type: 'clinic_visit', title: 'Day 7 Haematology Review — David', days: 7 }
      ]
    },

    // [13] PT-2026-0003  Rehema    FAC-DOD-001  High
    { visitId: 'VIS-PT-2026-0003', patientId: 'PT-2026-0003', facilityId: 'FAC-DOD-001',
      admDate: new Date('2026-05-04'), diagnosis: 'I25.9', diagnoses: ['I25.9'],
      medications: ['Aspirin', 'Atorvastatin', 'Metoprolol'], ward: 'Medical Ward', los: 11,
      labs: { hemoglobin: 10.1 }, vitals: {},
      social: { phoneAccess: false, transportationDifficulty: true, livesAlone: true },
      score: 65, prob: 0.65, tier: 'High',
      factors: [
        { factor: 'Elderly with 2 prior admissions', weight: 0.29 },
        { factor: 'Lives alone — no caregiver', weight: 0.26 },
        { factor: 'No phone access', weight: 0.22 }
      ],
      explanation: 'High risk — elderly isolated patient with cardiac disease. CHW check-in required post-discharge.',
      tasks: [
        { id: 'TASK-0003A', title: 'Arrange community volunteer for post-discharge medication adherence',
          category: 'social', priority: 'high', dueDate: daysOut(2) }
      ],
      followUps: [
        { id: 'FSCHED-0003-D3', type: 'home_visit', title: 'Day 3 CHW Home Visit — Rehema', days: 3 },
        { id: 'FSCHED-0003-D7', type: 'home_visit', title: 'Day 7 CHW Assessment — Rehema', days: 7 }
      ]
    },

    // [14] PT-2026-0014  Celestina FAC-DOD-001  High
    { visitId: 'VIS-PT-2026-0014', patientId: 'PT-2026-0014', facilityId: 'FAC-DOD-001',
      admDate: new Date('2026-05-06'), diagnosis: 'E11.65', diagnoses: ['E11.65', 'N18.3'],
      medications: ['Insulin glargine', 'Metformin', 'Furosemide', 'Amlodipine'],
      ward: 'Medical Ward A', los: 8,
      labs: { egfr: 44, hemoglobin: 10.4, hba1c: 9.8 }, vitals: { bpSystolic: 156, bpDiastolic: 96 },
      social: { phoneAccess: true, transportationDifficulty: true, livesAlone: false },
      score: 73, prob: 0.73, tier: 'High',
      factors: [
        { factor: 'Poor glycaemic control (HbA1c 9.8)', weight: 0.30 },
        { factor: 'CKD stage 3 (eGFR 44)', weight: 0.25 },
        { factor: 'Hypertension — BP 156/96', weight: 0.22 }
      ],
      explanation: 'High risk — diabetic-CKD with poor glycaemic control and hypertension.',
      tasks: [
        { id: 'TASK-0014A', title: 'Insulin self-administration training and glucose monitoring plan',
          category: 'education', priority: 'high', dueDate: daysOut(2) }
      ],
      followUps: [
        { id: 'FSCHED-0014-D3', type: 'phone_call',  title: 'Day 3 Diabetes Check Call — Celestina', days: 3 },
        { id: 'FSCHED-0014-D7', type: 'clinic_visit', title: 'Day 7 Diabetes Clinic — Celestina', days: 7 }
      ]
    },

    // [15] PT-2026-0015  Ahmed     FAC-DOD-001  Medium
    { visitId: 'VIS-PT-2026-0015', patientId: 'PT-2026-0015', facilityId: 'FAC-DOD-001',
      admDate: new Date('2026-05-09'), diagnosis: 'A15.0', diagnoses: ['A15.0', 'B54'],
      medications: ['Rifampicin', 'Isoniazid', 'Pyrazinamide', 'Artemether-Lumefantrine'],
      ward: 'TB Ward', los: 6,
      labs: { egfr: 76, hemoglobin: 9.4 }, vitals: { bpSystolic: 118, bpDiastolic: 76 },
      social: { phoneAccess: true, transportationDifficulty: true, livesAlone: false },
      score: 47, prob: 0.47, tier: 'Medium',
      factors: [
        { factor: 'TB treatment adherence risk', weight: 0.32 },
        { factor: 'Malaria co-infection', weight: 0.25 },
        { factor: 'Transport barrier', weight: 0.20 }
      ],
      explanation: 'Medium risk — concurrent TB and malaria. DOT follow-up needed for adherence.',
      tasks: [
        { id: 'TASK-0015A', title: 'Register in TB DOT program at nearest health centre',
          category: 'follow_up', priority: 'medium', dueDate: daysOut(3) }
      ],
      followUps: [
        { id: 'FSCHED-0015-D7', type: 'phone_call', title: 'Day 7 TB Adherence Check — Ahmed', days: 7 }
      ]
    },

    // [16] PT-2026-0016  Rosa      FAC-MBE-001  VeryHigh
    { visitId: 'VIS-PT-2026-0016', patientId: 'PT-2026-0016', facilityId: 'FAC-MBE-001',
      admDate: new Date('2026-04-22'), diagnosis: 'I50.0', diagnoses: ['I50.0', 'N18.5'],
      medications: ['Furosemide', 'Spironolactone', 'Carvedilol', 'Aspirin', 'Amlodipine'],
      ward: 'Cardiac ICU', los: 18,
      labs: { egfr: 16, hemoglobin: 8.1 }, vitals: { bpSystolic: 178, bpDiastolic: 106 },
      social: { phoneAccess: false, transportationDifficulty: true, livesAlone: true },
      score: 96, prob: 0.96, tier: 'VeryHigh',
      factors: [
        { factor: '5 admissions in 12 months', weight: 0.32 },
        { factor: 'End-stage CKD (eGFR 16) with heart failure', weight: 0.31 },
        { factor: 'ICU 5 days — most severe episode', weight: 0.22 },
        { factor: 'Elderly, isolated, no communication', weight: 0.15 }
      ],
      explanation: 'Maximum readmission risk — end-stage cardiorenal syndrome in isolated patient. Immediate palliative care assessment.',
      tasks: [
        { id: 'TASK-0016A', title: 'URGENT: Palliative care assessment — end-stage CKD',
          category: 'referral', priority: 'critical', dueDate: daysOut(1) },
        { id: 'TASK-0016B', title: 'CHW guardian role for daily medication adherence',
          category: 'follow_up', priority: 'critical', dueDate: daysOut(2) }
      ],
      followUps: [
        { id: 'FSCHED-0016-D3',  type: 'home_visit',   title: 'Day 3 CHW Emergency Visit — Rosa', days: 3 },
        { id: 'FSCHED-0016-D7',  type: 'home_visit',   title: 'Day 7 CHW Assessment — Rosa', days: 7 },
        { id: 'FSCHED-0016-D14', type: 'home_visit',   title: 'Day 14 Palliative Support — Rosa', days: 14 },
        { id: 'FSCHED-0016-D30', type: 'clinic_visit', title: 'Day 30 Zonal Hospital Review — Rosa', days: 30 }
      ]
    },

    // [17] PT-2026-0017  Michael   FAC-MBE-001  High
    { visitId: 'VIS-PT-2026-0017', patientId: 'PT-2026-0017', facilityId: 'FAC-MBE-001',
      admDate: new Date('2026-05-05'), diagnosis: 'B50.0', diagnoses: ['B50.0', 'E43'],
      medications: ['Artemether-Lumefantrine', 'F75 therapeutic milk', 'Zinc sulphate'],
      ward: 'Nutrition Ward', los: 9,
      labs: { egfr: 58, hemoglobin: 7.8 }, vitals: { bpSystolic: 108, bpDiastolic: 68 },
      social: { phoneAccess: false, transportationDifficulty: true, livesAlone: false },
      score: 69, prob: 0.69, tier: 'High',
      factors: [
        { factor: 'Severe acute malnutrition', weight: 0.36 },
        { factor: 'Malaria with severe anaemia', weight: 0.29 },
        { factor: 'No phone — CHW required', weight: 0.20 }
      ],
      explanation: 'High risk — malaria with SAM and severe anaemia. RUTF and malaria prevention needed.',
      tasks: [
        { id: 'TASK-0017A', title: 'Community RUTF home supply and monthly weight tracking',
          category: 'nutrition', priority: 'high', dueDate: daysOut(3) }
      ],
      followUps: [
        { id: 'FSCHED-0017-D3', type: 'home_visit', title: 'Day 3 Nutrition Visit — Michael', days: 3 },
        { id: 'FSCHED-0017-D7', type: 'home_visit', title: 'Day 7 RUTF Assessment — Michael', days: 7 }
      ]
    },

    // [18] PT-2026-0018  Lucia     FAC-RUV-001  High
    { visitId: 'VIS-PT-2026-0018', patientId: 'PT-2026-0018', facilityId: 'FAC-RUV-001',
      admDate: new Date('2026-05-04'), diagnosis: 'E11.65', diagnoses: ['E11.65', 'N18.3', 'D57.0'],
      medications: ['Insulin glargine', 'Lisinopril', 'Folic acid', 'Hydroxycarbamide'],
      ward: 'Medical Ward', los: 10,
      labs: { egfr: 38, hemoglobin: 9.6, hba1c: 10.2 }, vitals: { bpSystolic: 162, bpDiastolic: 98 },
      social: { phoneAccess: true, transportationDifficulty: false, livesAlone: false },
      score: 76, prob: 0.76, tier: 'High',
      factors: [
        { factor: 'Triple comorbidity: diabetes, CKD, sickle cell disease', weight: 0.35 },
        { factor: 'Very poor glycaemic control (HbA1c 10.2)', weight: 0.28 },
        { factor: 'Hypertension — BP 162/98', weight: 0.20 }
      ],
      explanation: 'High risk — complex diabetes-CKD-sickle cell comorbidity with poor glycaemic control.',
      tasks: [
        { id: 'TASK-0018A', title: 'Endocrinology referral — insulin-dependent diabetes with SCD and CKD',
          category: 'referral', priority: 'high', dueDate: daysOut(7) }
      ],
      followUps: [
        { id: 'FSCHED-0018-D3', type: 'phone_call',  title: 'Day 3 Glucose & Symptom Check — Lucia', days: 3 },
        { id: 'FSCHED-0018-D7', type: 'clinic_visit', title: 'Day 7 Diabetes & SCD Review — Lucia', days: 7 }
      ]
    },

    // [19] PT-2026-0019  Emmanuel  FAC-RUV-001  Medium
    { visitId: 'VIS-PT-2026-0019', patientId: 'PT-2026-0019', facilityId: 'FAC-RUV-001',
      admDate: new Date('2026-05-11'), diagnosis: 'A15.0', diagnoses: ['A15.0'],
      medications: ['Rifampicin', 'Isoniazid', 'Pyrazinamide', 'Ethambutol'], ward: 'TB Ward', los: 5,
      labs: { egfr: 90, hemoglobin: 10.5 }, vitals: { bpSystolic: 114, bpDiastolic: 72 },
      social: { phoneAccess: true, transportationDifficulty: true, livesAlone: false },
      score: 39, prob: 0.39, tier: 'Medium',
      factors: [
        { factor: 'TB treatment adherence risk', weight: 0.38 },
        { factor: 'Young age — protective factor', weight: 0.30 }
      ],
      explanation: 'Medium risk — new TB diagnosis. Adherence monitoring is key intervention.',
      tasks: [
        { id: 'TASK-0019A', title: 'TB DOT enrolment at Mbinga health centre',
          category: 'follow_up', priority: 'medium', dueDate: daysOut(3) }
      ],
      followUps: [
        { id: 'FSCHED-0019-D7', type: 'phone_call', title: 'Day 7 TB Adherence Verification — Emmanuel', days: 7 }
      ]
    },

    // [20] PT-2026-0020  Mariam    FAC-TAB-001  VeryHigh
    { visitId: 'VIS-PT-2026-0020', patientId: 'PT-2026-0020', facilityId: 'FAC-TAB-001',
      admDate: new Date('2026-05-02'), diagnosis: 'I50.9', diagnoses: ['I50.9', 'N18.4'],
      medications: ['Furosemide', 'Spironolactone', 'Enalapril', 'Digoxin'], ward: 'Cardiac Ward', los: 12,
      labs: { egfr: 26, hemoglobin: 8.6 }, vitals: { bpSystolic: 170, bpDiastolic: 104 },
      social: { phoneAccess: false, transportationDifficulty: true, livesAlone: true },
      score: 89, prob: 0.89, tier: 'VeryHigh',
      factors: [
        { factor: 'Heart failure with CKD stage 4', weight: 0.31 },
        { factor: 'ICU admission 2 days', weight: 0.24 },
        { factor: 'Isolated — no caregiver, no phone', weight: 0.25 },
        { factor: 'Rural area, transport barrier', weight: 0.15 }
      ],
      explanation: 'Very high risk — heart failure in isolated rural patient in Tabora with no communication means.',
      tasks: [
        { id: 'TASK-0020A', title: 'Village health worker for daily fluid monitoring',
          category: 'monitoring', priority: 'critical', dueDate: daysOut(1) },
        { id: 'TASK-0020B', title: 'Mobile cardiac clinic visit within 2 weeks',
          category: 'referral', priority: 'high', dueDate: daysOut(14) }
      ],
      followUps: [
        { id: 'FSCHED-0020-D3',  type: 'home_visit',   title: 'Day 3 CHW Home Visit — Mariam', days: 3 },
        { id: 'FSCHED-0020-D7',  type: 'home_visit',   title: 'Day 7 CHW Fluid Check — Mariam', days: 7 },
        { id: 'FSCHED-0020-D14', type: 'clinic_visit', title: 'Day 14 Cardiac Review — Mariam', days: 14 },
        { id: 'FSCHED-0020-D30', type: 'clinic_visit', title: 'Day 30 Kidney Function — Mariam', days: 30 }
      ]
    },

    // [21] PT-2026-0021  Francis   FAC-TAB-001  High
    { visitId: 'VIS-PT-2026-0021', patientId: 'PT-2026-0021', facilityId: 'FAC-TAB-001',
      admDate: new Date('2026-05-06'), diagnosis: 'B50.0', diagnoses: ['B50.0', 'E43'],
      medications: ['Artemether-Lumefantrine', 'F75 therapeutic milk', 'Ferrous sulphate'],
      ward: 'Medical Ward', los: 8,
      labs: { egfr: 72, hemoglobin: 7.4 }, vitals: { bpSystolic: 106, bpDiastolic: 64 },
      social: { phoneAccess: true, transportationDifficulty: true, livesAlone: false },
      score: 64, prob: 0.64, tier: 'High',
      factors: [
        { factor: 'Malaria with severe anaemia and SAM', weight: 0.38 },
        { factor: '3 prior admissions — recurrent pattern', weight: 0.28 },
        { factor: 'Transport barrier', weight: 0.18 }
      ],
      explanation: 'High risk — recurrent malaria with malnutrition and anaemia. Nutritional rehabilitation needed.',
      tasks: [
        { id: 'TASK-0021A', title: 'RUTF nutrition rehabilitation for 8 weeks and ITN provision',
          category: 'nutrition', priority: 'high', dueDate: daysOut(3) }
      ],
      followUps: [
        { id: 'FSCHED-0021-D3', type: 'phone_call',  title: 'Day 3 Recovery Check — Francis', days: 3 },
        { id: 'FSCHED-0021-D7', type: 'clinic_visit', title: 'Day 7 Nutrition & Haematology — Francis', days: 7 }
      ]
    },

    // [22] PT-2026-0022  Neema     FAC-TAB-001  Low
    { visitId: 'VIS-PT-2026-0022', patientId: 'PT-2026-0022', facilityId: 'FAC-TAB-001',
      admDate: new Date('2026-05-14'), diagnosis: 'N39.0', diagnoses: ['N39.0'],
      medications: ['Ciprofloxacin', 'Paracetamol'], ward: 'General Ward', los: 3,
      labs: { egfr: 94, hemoglobin: 12.8 }, vitals: { bpSystolic: 118, bpDiastolic: 76 },
      social: { phoneAccess: true, transportationDifficulty: false, livesAlone: false },
      score: 15, prob: 0.15, tier: 'Low',
      factors: [
        { factor: 'Young, healthy — strong protective factors', weight: 0.50 },
        { factor: 'First admission', weight: 0.35 }
      ],
      explanation: 'Low readmission risk — young healthy patient with uncomplicated UTI.',
      tasks: [], followUps: []
    }
  ];

  // ── Process all records ────────────────────────────────────────────────────
  for (const rec of records) {
    const visitPayload = {
      patientId: rec.patientId, facilityId: rec.facilityId,
      admissionDate: rec.admDate, diagnosis: rec.diagnosis,
      diagnoses: rec.diagnoses, medications: rec.medications,
      ward: rec.ward, lengthOfStay: rec.los,
      labResults: rec.labs, vitalSigns: rec.vitals,
      socialFactors: rec.social, dischargeDisposition: null
    };
    await prisma.visit.upsert({
      where: { id: rec.visitId },
      update: visitPayload,
      create: { id: rec.visitId, ...visitPayload }
    });

    const predPayload = {
      patientId: rec.patientId, facilityId: rec.facilityId,
      generatedById: clinician.id, score: rec.score, probability: rec.prob,
      tier: TIER[rec.tier], factors: rec.factors, explanation: rec.explanation,
      confidence: Math.min(0.99, 0.75 + rec.score * 0.003),
      confidenceLow: Math.max(1, rec.score - 10),
      confidenceHigh: Math.min(99, rec.score + 10),
      modelVersion: 'trip-rules-v1', modelType: 'rules_engine',
      method: 'rules', fallbackUsed: true,
      dataQuality: { completeness: 0.85, missingCriticalFields: [], imputedValues: {} },
      featureSnapshot: { encounter: { diagnosis: rec.diagnosis, lengthOfStayDays: rec.los }, labs: rec.labs },
      analysisSummary: { tier: rec.tier },
      generatedAt: new Date()
    };
    const pred = await prisma.prediction.upsert({
      where: { visitId: rec.visitId },
      update: predPayload,
      create: { visitId: rec.visitId, ...predPayload }
    });

    if (rec.tier === 'High' || rec.tier === 'VeryHigh') {
      const threshold = rec.tier === 'VeryHigh' ? 85 : 60;
      const severity  = rec.tier === 'VeryHigh' ? 'critical' : 'high';
      await prisma.alert.upsert({
        where: { predictionId: pred.id },
        update: {
          patientId: rec.patientId, facilityId: rec.facilityId,
          score: rec.score, tier: TIER[rec.tier], threshold, severity,
          message: rec.explanation, channels: ['in_app', 'sms'], status: 'open'
        },
        create: {
          patientId: rec.patientId, predictionId: pred.id, facilityId: rec.facilityId,
          score: rec.score, tier: TIER[rec.tier], threshold, severity,
          message: rec.explanation, channels: ['in_app', 'sms'], status: 'open'
        }
      });
    }

    for (const task of (rec.tasks || [])) {
      await prisma.task.upsert({
        where: { id: task.id },
        update: {
          patientId: rec.patientId, predictionId: pred.id, facilityId: rec.facilityId,
          title: task.title, category: task.category,
          priority: PRIO[task.priority], status: TaskStatus.pending,
          dueDate: task.dueDate, updatedById: clinician.id
        },
        create: {
          id: task.id,
          patientId: rec.patientId, predictionId: pred.id, facilityId: rec.facilityId,
          title: task.title, category: task.category,
          priority: PRIO[task.priority], status: TaskStatus.pending,
          dueDate: task.dueDate, updatedById: clinician.id
        }
      });
    }

    for (const fu of (rec.followUps || [])) {
      await prisma.followUpSchedule.upsert({
        where: { id: fu.id },
        update: {
          patientId: rec.patientId, visitId: rec.visitId, predictionId: pred.id,
          facilityId: rec.facilityId, assignedToId: chwId,
          title: fu.title, followUpType: fu.type,
          status: 'scheduled', outcome: 'pending',
          scheduledFor: daysOut(fu.days)
        },
        create: {
          id: fu.id,
          patientId: rec.patientId, visitId: rec.visitId, predictionId: pred.id,
          facilityId: rec.facilityId, assignedToId: chwId,
          title: fu.title, followUpType: fu.type,
          status: 'scheduled', outcome: 'pending',
          scheduledFor: daysOut(fu.days)
        }
      });
    }
  }

  // ── ReadmissionEvents ──────────────────────────────────────────────────────
  await prisma.readmissionEvent.upsert({
    where: { currentVisitId: 'VIS-TRIP-DEMO-0001' },
    update: {
      patientId: 'PT-2026-0001', facilityId: 'FAC-MNH-001',
      priorVisitId: 'VIS-PT-2026-0001-P',
      daysSinceLastDischarge: 64, within30Days: false,
      notes: 'Re-admitted 64 days after prior discharge — chronic heart failure progression with CKD'
    },
    create: {
      patientId: 'PT-2026-0001', facilityId: 'FAC-MNH-001',
      currentVisitId: 'VIS-TRIP-DEMO-0001', priorVisitId: 'VIS-PT-2026-0001-P',
      daysSinceLastDischarge: 64, within30Days: false,
      notes: 'Re-admitted 64 days after prior discharge — chronic heart failure progression with CKD'
    }
  });

  await prisma.readmissionEvent.upsert({
    where: { currentVisitId: 'VIS-PT-2026-0009' },
    update: {
      patientId: 'PT-2026-0009', facilityId: 'FAC-ARH-001',
      priorVisitId: 'VIS-PT-2026-0009-P',
      daysSinceLastDischarge: 22, within30Days: true,
      notes: 'Readmitted 22 days post-discharge — TB treatment interruption with hyperglycaemic crisis'
    },
    create: {
      patientId: 'PT-2026-0009', facilityId: 'FAC-ARH-001',
      currentVisitId: 'VIS-PT-2026-0009', priorVisitId: 'VIS-PT-2026-0009-P',
      daysSinceLastDischarge: 22, within30Days: true,
      notes: 'Readmitted 22 days post-discharge — TB treatment interruption with hyperglycaemic crisis'
    }
  });
}

// PLACEHOLDER — replaced by new function above
async function _OLD_seedClinicalRecords_unused() {
  const clinician = await prisma.user.findUnique({
    where: { email: 'clinician@trip.go.tz' }
  });

  if (!clinician) {
    return;
  }

  const visitId = 'VIS-TRIP-DEMO-0001';

  await prisma.visit.upsert({
    where: { id: visitId },
    update: {
      patientId: 'PT-2026-0001',
      facilityId: 'FAC-MNH-001',
      admissionDate: new Date('2026-02-10T08:00:00Z'),
      diagnosis: 'I50.9',
      diagnoses: ['I50.9', 'N18.3'],
      medications: ['Furosemide', 'Spironolactone', 'Warfarin'],
      labResults: {
        egfr: 52,
        hemoglobin: 9.6,
        hba1c: 8.9
      },
      vitalSigns: {
        bpSystolic: 148,
        bpDiastolic: 92
      },
      socialFactors: {
        phoneAccess: true,
        transportationDifficulty: true,
        livesAlone: false
      },
      dischargeDisposition: null,
      ward: 'Medical Ward B',
      lengthOfStay: 9
    },
    create: {
      id: visitId,
      patientId: 'PT-2026-0001',
      facilityId: 'FAC-MNH-001',
      admissionDate: new Date('2026-02-10T08:00:00Z'),
      diagnosis: 'I50.9',
      diagnoses: ['I50.9', 'N18.3'],
      medications: ['Furosemide', 'Spironolactone', 'Warfarin'],
      labResults: {
        egfr: 52,
        hemoglobin: 9.6,
        hba1c: 8.9
      },
      vitalSigns: {
        bpSystolic: 148,
        bpDiastolic: 92
      },
      socialFactors: {
        phoneAccess: true,
        transportationDifficulty: true,
        livesAlone: false
      },
      dischargeDisposition: null,
      ward: 'Medical Ward B',
      lengthOfStay: 9
    }
  });

  await prisma.visit.upsert({
    where: { id: 'VIS-TRIP-DEMO-0004' },
    update: {
      patientId: 'PT-2026-0001',
      facilityId: 'FAC-MNH-001',
      admissionDate: new Date('2025-12-03T10:30:00Z'),
      dischargeDate: new Date('2025-12-08T14:00:00Z'),
      diagnosis: 'I50.9',
      diagnoses: ['I50.9'],
      medications: ['Furosemide'],
      labResults: {
        egfr: 56,
        hemoglobin: 10.4
      },
      vitalSigns: {
        bpSystolic: 150,
        bpDiastolic: 88
      },
      socialFactors: {
        phoneAccess: true,
        transportationDifficulty: false,
        livesAlone: false
      },
      dischargeDisposition: 'home',
      ward: 'Medical Ward B',
      lengthOfStay: 5
    },
    create: {
      id: 'VIS-TRIP-DEMO-0004',
      patientId: 'PT-2026-0001',
      facilityId: 'FAC-MNH-001',
      admissionDate: new Date('2025-12-03T10:30:00Z'),
      dischargeDate: new Date('2025-12-08T14:00:00Z'),
      diagnosis: 'I50.9',
      diagnoses: ['I50.9'],
      medications: ['Furosemide'],
      labResults: {
        egfr: 56,
        hemoglobin: 10.4
      },
      vitalSigns: {
        bpSystolic: 150,
        bpDiastolic: 88
      },
      socialFactors: {
        phoneAccess: true,
        transportationDifficulty: false,
        livesAlone: false
      },
      dischargeDisposition: 'home',
      ward: 'Medical Ward B',
      lengthOfStay: 5
    }
  });

  const prediction = await prisma.prediction.upsert({
    where: { visitId },
    update: {
      patientId: 'PT-2026-0001',
      facilityId: 'FAC-MNH-001',
      generatedById: clinician.id,
      score: 78,
      probability: 0.78,
      tier: RiskTier.High,
      factors: [
        { factor: 'Frequent prior admissions', weight: 0.29 },
        { factor: 'Comorbidity burden', weight: 0.24 },
        { factor: 'Transport barrier', weight: 0.18 }
      ],
      explanation: 'High risk because of frequent prior admissions, comorbidity burden, and transport barrier.',
      confidence: 0.82,
      confidenceLow: 68,
      confidenceHigh: 88,
      modelVersion: 'trip-rules-xgb-surrogate-v1',
      modelType: 'xgboost_surrogate',
      method: 'ml',
      fallbackUsed: false,
      dataQuality: { completeness: 0.9, missingCriticalFields: [], imputedValues: {} },
      featureSnapshot: {
        encounter: {
          diagnosis: 'I50.9',
          diagnoses: ['I50.9', 'N18.3'],
          lengthOfStayDays: 9
        },
        utilization: {
          priorAdmissions6mo: 1,
          priorAdmissions12m: 3
        },
        labs: {
          egfr: 52,
          hemoglobin: 9.6,
          hba1c: 8.9
        }
      },
      analysisSummary: {
        labAbnormalities: ['reduced_kidney_function', 'anemia'],
        socialRiskFactors: ['transport_barrier'],
        medicationRiskProfile: 'high',
        utilizationRiskProfile: 'high'
      },
      generatedAt: new Date('2026-02-19T09:15:00Z')
    },
    create: {
      visitId,
      patientId: 'PT-2026-0001',
      facilityId: 'FAC-MNH-001',
      generatedById: clinician.id,
      score: 78,
      probability: 0.78,
      tier: RiskTier.High,
      factors: [
        { factor: 'Frequent prior admissions', weight: 0.29 },
        { factor: 'Comorbidity burden', weight: 0.24 },
        { factor: 'Transport barrier', weight: 0.18 }
      ],
      explanation: 'High risk because of frequent prior admissions, comorbidity burden, and transport barrier.',
      confidence: 0.82,
      confidenceLow: 68,
      confidenceHigh: 88,
      modelVersion: 'trip-rules-xgb-surrogate-v1',
      modelType: 'xgboost_surrogate',
      method: 'ml',
      fallbackUsed: false,
      dataQuality: { completeness: 0.9, missingCriticalFields: [], imputedValues: {} },
      featureSnapshot: {
        encounter: {
          diagnosis: 'I50.9',
          diagnoses: ['I50.9', 'N18.3'],
          lengthOfStayDays: 9
        },
        utilization: {
          priorAdmissions6mo: 1,
          priorAdmissions12m: 3
        },
        labs: {
          egfr: 52,
          hemoglobin: 9.6,
          hba1c: 8.9
        }
      },
      analysisSummary: {
        labAbnormalities: ['reduced_kidney_function', 'anemia'],
        socialRiskFactors: ['transport_barrier'],
        medicationRiskProfile: 'high',
        utilizationRiskProfile: 'high'
      },
      generatedAt: new Date('2026-02-19T09:15:00Z')
    }
  });

  const taskId = 'TASK-TRIP-DEMO-0001';

  await prisma.task.upsert({
    where: { id: taskId },
    update: {
      patientId: 'PT-2026-0001',
      predictionId: prediction.id,
      facilityId: 'FAC-MNH-001',
      title: 'Complete medication reconciliation within 24 hours',
      category: 'medication',
      priority: Priority.high,
      status: TaskStatus.pending,
      dueDate: new Date('2026-02-20T12:00:00Z'),
      updatedById: clinician.id
    },
    create: {
      id: taskId,
      patientId: 'PT-2026-0001',
      predictionId: prediction.id,
      facilityId: 'FAC-MNH-001',
      title: 'Complete medication reconciliation within 24 hours',
      category: 'medication',
      priority: Priority.high,
      status: TaskStatus.pending,
      dueDate: new Date('2026-02-20T12:00:00Z'),
      updatedById: clinician.id
    }
  });
}

async function seedAuditLog() {
  const clinician = await prisma.user.findUnique({
    where: { email: 'clinician@trip.go.tz' }
  });

  if (!clinician) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      userId: clinician.id,
      facilityId: clinician.facilityId,
      action: 'seed_bootstrap',
      resource: 'system:seed',
      details: {
        seededAt: new Date().toISOString(),
        note: 'Initial TRIP phase 2 dataset loaded.'
      },
      ipAddress: '127.0.0.1'
    }
  });
}

async function main() {
  console.log('Seeding TRIP PostgreSQL baseline...');

  const zoneMap = await seedZones();
  const regionMap = await seedRegions(zoneMap);
  await seedFacilities(regionMap);

  const roleMap = await seedRoles();
  await seedUsers(roleMap, regionMap);
  await seedPatients();
  await seedClinicalRecords();
  await seedAuditLog();

  console.log('Seed complete.');
  console.log(`Demo login password for all seeded users: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
