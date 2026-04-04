const { Prisma } = require('@prisma/client');
const { encrypt, decrypt } = require('../services/encryption.service');

const PI_FIELDS = ['name', 'phone', 'address'];

function encryptPayload(data) {
  if (!data || typeof data !== 'object') return data;
  
  const encrypted = { ...data };
  for (const field of PI_FIELDS) {
    if (field in encrypted && encrypted[field] !== undefined) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  }
  return encrypted;
}

function decryptPayload(result) {
  if (!result || typeof result !== 'object') return result;

  // Handle arrays (e.g. findMany results)
  if (Array.isArray(result)) {
    return result.map(item => decryptPayload(item));
  }

  const decrypted = { ...result };
  for (const field of PI_FIELDS) {
    if (field in decrypted && decrypted[field] !== undefined) {
      decrypted[field] = decrypt(decrypted[field]);
    }
  }
  return decrypted;
}

const dataTransformExtension = Prisma.defineExtension({
  name: 'pii-encryption',
  query: {
    patient: {
      async $allOperations({ operation, args, query }) {
        // Intercept writes to encrypt
        if (['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(operation)) {
          if (args.data) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map(item => encryptPayload(item));
            } else {
              args.data = encryptPayload(args.data);
            }
          }
          
          if (operation === 'upsert') {
            if (args.create) args.create = encryptPayload(args.create);
            if (args.update) args.update = encryptPayload(args.update);
          }
        }

        // Execute the query
        const result = await query(args);

        // Intercept reads to decrypt
        if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany'].includes(operation)) {
          return decryptPayload(result);
        }

        // Return creates/updates decrypted as well (since Prisma returns the row)
        if (['create', 'update', 'upsert'].includes(operation)) {
          return decryptPayload(result);
        }

        return result;
      }
    }
  }
});

module.exports = {
  dataTransformExtension
};
