const { RiskTier, Priority, TaskStatus } = require('@prisma/client');
const { ROLE_PERMISSIONS } = require('../src/config/roles');
const { hash } = require('../src/lib/passwordHash');
const { prisma } = require('../src/lib/prisma');

const DEMO_PASSWORD = 'Trip@2026';

const regions = [
  { code: 'DAR', name: 'Dar es Salaam' },
  { code: 'ARU', name: 'Arusha' },
  { code: 'MWZ', name: 'Mwanza' },
  { code: 'DOD', name: 'Dodoma' },
  { code: 'MBE', name: 'Mbeya' }
];

const facilities = [
  { id: 'FAC-MNH-001', name: 'Muhimbili National Hospital', level: 'national_referral', district: 'Ilala', regionCode: 'DAR' },
  { id: 'FAC-ARH-001', name: 'Arusha Regional Hospital', level: 'regional_referral', district: 'Arusha', regionCode: 'ARU' },
  { id: 'FAC-MWZ-001', name: 'Mwanza Regional Hospital', level: 'regional_referral', district: 'Nyamagana', regionCode: 'MWZ' },
  { id: 'FAC-DOD-001', name: 'Dodoma District Hospital', level: 'district', district: 'Dodoma', regionCode: 'DOD' },
  { id: 'FAC-MBE-001', name: 'Mbeya Zonal Hospital', level: 'zonal_referral', district: 'Mbeya', regionCode: 'MBE' }
];

const roleAssignments = {
  facility_manager: { facilityId: 'FAC-MNH-001' },
  clinician: { facilityId: 'FAC-ARH-001' },
  nurse: { facilityId: 'FAC-ARH-001' },
  pharmacist: { facilityId: 'FAC-MWZ-001' },
  hro: { facilityId: 'FAC-DOD-001' },
  chw: { facilityId: 'FAC-DOD-001' },
  rhmt: { regionCode: 'DAR' },
  chmt: { regionCode: 'ARU' }
};

const patientSeeds = [
  {
    id: 'PT-2026-0001',
    name: 'Amina Mwambungu',
    age: 67,
    gender: 'female',
    phone: '+255700100001',
    address: 'Ilala, Dar es Salaam',
    insurance: 'NHIF',
    status: 'admitted',
    facilityId: 'FAC-MNH-001',
    clinicalProfile: {
      age: 67,
      priorAdmissions12m: 3,
      lengthOfStayDays: 9,
      charlsonIndex: 4,
      egfr: 52,
      hemoglobin: 9.6,
      hba1c: 8.9,
      phoneAccess: true,
      transportationDifficulty: true,
      livesAlone: false,
      highRiskMedicationCount: 2,
      icuStayDays: 0,
      bpSystolic: 148,
      bpDiastolic: 92
    }
  },
  {
    id: 'PT-2026-0002',
    name: 'Juma Kweka',
    age: 44,
    gender: 'male',
    phone: '+255700100002',
    address: 'Arusha City, Arusha',
    insurance: 'Cash',
    status: 'admitted',
    facilityId: 'FAC-ARH-001',
    clinicalProfile: {
      age: 44,
      priorAdmissions12m: 1,
      lengthOfStayDays: 4,
      charlsonIndex: 2,
      egfr: 82,
      hemoglobin: 12.5,
      hba1c: 7.2,
      phoneAccess: true,
      transportationDifficulty: false,
      livesAlone: false,
      highRiskMedicationCount: 0,
      icuStayDays: 0,
      bpSystolic: 130,
      bpDiastolic: 85
    }
  },
  {
    id: 'PT-2026-0003',
    name: 'Rehema Mussa',
    age: 73,
    gender: 'female',
    phone: null,
    address: 'Chamwino, Dodoma',
    insurance: 'NHIF',
    status: 'discharge_planning',
    facilityId: 'FAC-DOD-001',
    clinicalProfile: {
      age: 73,
      priorAdmissions12m: 2,
      lengthOfStayDays: 11,
      charlsonIndex: 5,
      egfr: null,
      hemoglobin: 10.1,
      hba1c: null,
      phoneAccess: false,
      transportationDifficulty: true,
      livesAlone: true,
      highRiskMedicationCount: 1,
      icuStayDays: 1,
      bpSystolic: null,
      bpDiastolic: null
    }
  }
];

async function seedRegions() {
  const regionMap = new Map();

  for (const region of regions) {
    const saved = await prisma.region.upsert({
      where: { code: region.code },
      update: { name: region.name },
      create: region
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

  const regionMap = await seedRegions();
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
