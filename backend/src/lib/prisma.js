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

    const featureChecks = {
      patientPiiMetadata: {
        table: 'Patient',
        requiredColumns: ['piiVersion', 'piiEncryptedAt'],
        description: 'Encrypted-patient metadata columns'
      },
      facilityDhis2Fields: {
        table: 'Facility',
        requiredColumns: ['dhis2OrgUnitId', 'dhis2Code'],
        description: 'DHIS2 facility identity columns'
      },
      visitStructuredFields: {
        table: 'Visit',
        requiredColumns: [
          'diagnoses',
          'medications',
          'labResults',
          'vitalSigns',
          'socialFactors',
          'dischargeDisposition'
        ],
        description: 'Structured visit payload columns'
      },
      predictionMlFields: {
        table: 'Prediction',
        requiredColumns: ['probability', 'method', 'featureSnapshot', 'analysisSummary'],
        description: 'Prediction ML metadata columns'
      },
      hasAlertTable: {
        table: 'Alert',
        requiredColumns: [],
        description: 'Alert persistence table'
      }
    };

    const capabilities = Object.entries(featureChecks).reduce((result, [key, config]) => {
      if (key === 'hasAlertTable') {
        result[key] = columnsByTable.has(config.table);
        return result;
      }

      result[key] = hasColumns(config.table, config.requiredColumns);
      return result;
    }, {});

    const missing = Object.entries(featureChecks)
      .filter(([key]) => !capabilities[key])
      .map(([key, config]) => ({
        key,
        table: config.table,
        description: config.description,
        requiredColumns: config.requiredColumns
      }));

    return {
      ...capabilities,
      status: missing.length ? 'partial' : 'compatible',
      missing,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      patientPiiMetadata: false,
      facilityDhis2Fields: false,
      visitStructuredFields: false,
      predictionMlFields: false,
      hasAlertTable: false,
      status: 'unknown',
      missing: [],
      checkedAt: new Date().toISOString(),
      message: String(error?.message || error || 'Schema capability detection failed')
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
