const crypto = require('node:crypto');

const ENCRYPTION_PREFIX = 'enc:v1:';
const PII_ENCRYPTION_VERSION = 1;
const DEFAULT_DEVELOPMENT_ENCRYPTION_KEY =
  'trip-development-encryption-key-change-before-production';
const PATIENT_PII_FIELDS = ['name', 'phone', 'address'];

function getRequestedDataProvider() {
  return String(process.env.TRIP_DATA_PROVIDER || 'memory').toLowerCase();
}

function isPersistentProviderRequested() {
  return getRequestedDataProvider() !== 'memory';
}

function isProductionLike() {
  return process.env.NODE_ENV === 'production' && isPersistentProviderRequested();
}

function createEncryptionConfigError(message) {
  const error = new Error(message);
  error.code = 'ENCRYPTION_CONFIG_INVALID';
  error.statusCode = 503;
  error.publicMessage = 'Patient data protection is not configured.';
  return error;
}

function deriveEncryptionKey(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}

function resolveEncryptionContext() {
  const configuredSecret = String(process.env.ENCRYPTION_KEY || '').trim();

  if (configuredSecret) {
    if (configuredSecret.length < 32) {
      throw createEncryptionConfigError('ENCRYPTION_KEY must be at least 32 characters long.');
    }

    return {
      key: deriveEncryptionKey(configuredSecret),
      configured: true,
      keySource: 'env',
      usingFallback: false
    };
  }

  if (isProductionLike()) {
    throw createEncryptionConfigError(
      'ENCRYPTION_KEY must be set when using a persistent data provider in production.'
    );
  }

  return {
    key: deriveEncryptionKey(DEFAULT_DEVELOPMENT_ENCRYPTION_KEY),
    configured: false,
    keySource: 'development-default',
    usingFallback: true
  };
}

function assertEncryptionConfig() {
  return resolveEncryptionContext();
}

function getEncryptionConfigStatus() {
  if (!isPersistentProviderRequested()) {
    return {
      status: 'not_required',
      active: false,
      configured: false,
      keySource: null,
      usingFallback: false,
      message: 'Memory demo mode does not persist patient PII.'
    };
  }

  try {
    const context = assertEncryptionConfig();

    return {
      status: 'up',
      active: true,
      configured: context.configured,
      keySource: context.keySource,
      usingFallback: context.usingFallback
    };
  } catch (error) {
    return {
      status: 'down',
      active: true,
      configured: false,
      keySource: null,
      usingFallback: false,
      message: error.message
    };
  }
}

function isEncryptedValue(value) {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

function encryptValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  const stringValue = String(value);
  if (isEncryptedValue(stringValue)) {
    return stringValue;
  }

  const { key } = assertEncryptionConfig();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(stringValue, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString('base64')}.${authTag.toString(
    'base64'
  )}.${ciphertext.toString('base64')}`;
}

function decryptValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  const stringValue = String(value);
  if (!isEncryptedValue(stringValue)) {
    return stringValue;
  }

  const payload = stringValue.slice(ENCRYPTION_PREFIX.length);
  const [ivPart, authTagPart, ciphertextPart] = payload.split('.');

  if (!ivPart || !authTagPart || !ciphertextPart) {
    throw new Error('Encrypted patient field is malformed.');
  }

  const { key } = assertEncryptionConfig();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagPart, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, 'base64')),
    decipher.final()
  ]);

  return plaintext.toString('utf8');
}

function protectPatientPiiWrite(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((entry) => protectPatientPiiWrite(entry));
  }

  const next = { ...data };
  let encryptedFieldCount = 0;

  PATIENT_PII_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(next, field)) {
      return;
    }

    if (next[field] === undefined || next[field] === null) {
      return;
    }

    next[field] = encryptValue(next[field]);
    encryptedFieldCount += 1;
  });

  if (encryptedFieldCount > 0) {
    next.piiVersion = PII_ENCRYPTION_VERSION;
    next.piiEncryptedAt = new Date();
  }

  return next;
}

function unprotectPatientPiiRead(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return record;
  }

  const next = { ...record };

  PATIENT_PII_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(next, field)) {
      return;
    }

    next[field] = decryptValue(next[field]);
  });

  return next;
}

module.exports = {
  ENCRYPTION_PREFIX,
  PII_ENCRYPTION_VERSION,
  assertEncryptionConfig,
  decryptValue,
  encryptValue,
  getEncryptionConfigStatus,
  isEncryptedValue,
  protectPatientPiiWrite,
  unprotectPatientPiiRead
};
