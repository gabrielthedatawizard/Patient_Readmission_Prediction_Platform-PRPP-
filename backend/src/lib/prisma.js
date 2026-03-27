const { PrismaClient } = require('@prisma/client');
const {
  assertEncryptionConfig,
  protectPatientPiiWrite,
  unprotectPatientPiiRead
} = require('./encryption');

const globalForPrisma = global;

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
          return hydratePatientResult(
            await query({
              ...args,
              data: protectPatientPiiWrite(args.data)
            })
          );
        },
        async createMany({ args, query }) {
          return query({
            ...args,
            data: protectPatientPiiWrite(args.data)
          });
        },
        async findFirst({ args, query }) {
          return hydratePatientResult(await query(args));
        },
        async findMany({ args, query }) {
          return hydratePatientResult(await query(args));
        },
        async findUnique({ args, query }) {
          return hydratePatientResult(await query(args));
        },
        async update({ args, query }) {
          return hydratePatientResult(
            await query({
              ...args,
              data: protectPatientPiiWrite(args.data)
            })
          );
        },
        async updateMany({ args, query }) {
          return query({
            ...args,
            data: protectPatientPiiWrite(args.data)
          });
        },
        async upsert({ args, query }) {
          return hydratePatientResult(
            await query({
              ...args,
              create: protectPatientPiiWrite(args.create),
              update: protectPatientPiiWrite(args.update)
            })
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
  prisma
};
