const { PrismaClient } = require('@prisma/client');
const {
  assertEncryptionConfig,
  protectPatientPiiWrite,
  unprotectPatientPiiRead
} = require('./encryption');

const globalForPrisma = global;
const LEGACY_PATIENT_SELECT = {
  id: true,
  name: true,
  age: true,
  gender: true,
  phone: true,
  address: true,
  insurance: true,
  status: true,
  clinicalProfile: true,
  facilityId: true,
  createdAt: true,
  updatedAt: true
};
let schemaCapabilitiesPromise = null;

function stripUnsupportedPatientMetadata(data, capabilities) {
  if (!data || capabilities.patientPiiMetadata) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((entry) => stripUnsupportedPatientMetadata(entry, capabilities));
  }

  if (typeof data !== 'object') {
    return data;
  }

  const next = { ...data };
  delete next.piiVersion;
  delete next.piiEncryptedAt;
  return next;
}

function applyLegacyPatientSelect(args = {}, capabilities) {
  if (capabilities.patientPiiMetadata || args.select || args.include) {
    return args;
  }

  return {
    ...args,
    select: LEGACY_PATIENT_SELECT
  };
}

async function detectDatabaseSchemaCapabilities(client) {
  try {
    const rows = await client.$queryRawUnsafe(`
      SELECT table_name AS "tableName", column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('Patient', 'Facility', 'Visit', 'Prediction', 'Alert')
    `);

    const columnsByTable = new Map();
    rows.forEach((row) => {
      const tableName = row.tableName;
      const columnName = row.columnName;

      if (!columnsByTable.has(tableName)) {
        columnsByTable.set(tableName, new Set());
      }

      columnsByTable.get(tableName).add(columnName);
    });

    const hasColumns = (tableName, requiredColumns) => {
      const availableColumns = columnsByTable.get(tableName);
      return requiredColumns.every((column) => availableColumns?.has(column));
    };

    return {
      patientPiiMetadata: hasColumns('Patient', ['piiVersion', 'piiEncryptedAt']),
      facilityDhis2Fields: hasColumns('Facility', ['dhis2OrgUnitId', 'dhis2Code']),
      visitStructuredFields: hasColumns('Visit', [
        'diagnoses',
        'medications',
        'labResults',
        'vitalSigns',
        'socialFactors',
        'dischargeDisposition'
      ]),
      predictionMlFields: hasColumns('Prediction', [
        'probability',
        'method',
        'featureSnapshot',
        'analysisSummary'
      ]),
      hasAlertTable: columnsByTable.has('Alert')
    };
  } catch (error) {
    return {
      patientPiiMetadata: false,
      facilityDhis2Fields: false,
      visitStructuredFields: false,
      predictionMlFields: false,
      hasAlertTable: false
    };
  }
}

function getDatabaseSchemaCapabilities(client) {
  if (!schemaCapabilitiesPromise) {
    schemaCapabilitiesPromise = detectDatabaseSchemaCapabilities(client);
  }

  return schemaCapabilitiesPromise;
}

function hydratePatientResult(result) {
  if (Array.isArray(result)) {
    return result.map((record) => unprotectPatientPiiRead(record));
  }

  return unprotectPatientPiiRead(result);
}

function createPrismaClient() {
  assertEncryptionConfig();

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });

  return client.$extends({
    query: {
      patient: {
        async create({ args, query }) {
          const capabilities = await getDatabaseSchemaCapabilities(client);
          return hydratePatientResult(
            await query(
              applyLegacyPatientSelect(
                {
                  ...args,
                  data: stripUnsupportedPatientMetadata(
                    protectPatientPiiWrite(args.data),
                    capabilities
                  )
                },
                capabilities
              )
            )
          );
        },
        async createMany({ args, query }) {
          const capabilities = await getDatabaseSchemaCapabilities(client);
          return query({
            ...args,
            data: stripUnsupportedPatientMetadata(
              protectPatientPiiWrite(args.data),
              capabilities
            )
          });
        },
        async findFirst({ args, query }) {
          const capabilities = await getDatabaseSchemaCapabilities(client);
          return hydratePatientResult(
            await query(applyLegacyPatientSelect(args, capabilities))
          );
        },
        async findMany({ args, query }) {
          const capabilities = await getDatabaseSchemaCapabilities(client);
          return hydratePatientResult(
            await query(applyLegacyPatientSelect(args, capabilities))
          );
        },
        async findUnique({ args, query }) {
          const capabilities = await getDatabaseSchemaCapabilities(client);
          return hydratePatientResult(
            await query(applyLegacyPatientSelect(args, capabilities))
          );
        },
        async update({ args, query }) {
          const capabilities = await getDatabaseSchemaCapabilities(client);
          return hydratePatientResult(
            await query(
              applyLegacyPatientSelect(
                {
                  ...args,
                  data: stripUnsupportedPatientMetadata(
                    protectPatientPiiWrite(args.data),
                    capabilities
                  )
                },
                capabilities
              )
            )
          );
        },
        async updateMany({ args, query }) {
          const capabilities = await getDatabaseSchemaCapabilities(client);
          return query({
            ...args,
            data: stripUnsupportedPatientMetadata(
              protectPatientPiiWrite(args.data),
              capabilities
            )
          });
        },
        async upsert({ args, query }) {
          const capabilities = await getDatabaseSchemaCapabilities(client);
          return hydratePatientResult(
            await query(
              applyLegacyPatientSelect(
                {
                  ...args,
                  create: stripUnsupportedPatientMetadata(
                    protectPatientPiiWrite(args.create),
                    capabilities
                  ),
                  update: stripUnsupportedPatientMetadata(
                    protectPatientPiiWrite(args.update),
                    capabilities
                  )
                },
                capabilities
              )
            )
          );
        }
      }
    }
  });
}

const prisma = globalForPrisma.__tripPrismaClient || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__tripPrismaClient = prisma;
}

module.exports = {
  prisma,
  getDatabaseSchemaCapabilities: () => getDatabaseSchemaCapabilities(prisma)
};
