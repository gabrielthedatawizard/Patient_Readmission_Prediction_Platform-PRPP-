const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
// Expect a 32-byte hex or base64 key, or a plain string securely generated.
const ENCRYPTION_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY_32BYTE || 'trip-demo-key-must-be-32-bytes-c',
  'utf-8'
);
const IV_LENGTH = 12;

function encrypt(text) {
  if (text === null || text === undefined || text === '') {
    return text;
  }

  try {
    const stringText = String(text);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(stringText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag().toString('base64');
    
    // Format: iv:authTag:encryptedData
    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err.message);
    // Safety fallback: throw so we never write unencrypted PII thinking it encrypted properly
    throw new Error('Failed to encrypt PII');
  }
}

function decrypt(encryptedText) {
  if (encryptedText === null || encryptedText === undefined || encryptedText === '') {
    return encryptedText;
  }

  // If it doesn't look like our encrypted format, it might be legacy plain text
  const parts = String(encryptedText).split(':');
  if (parts.length !== 3) {
    return encryptedText;
  }

  try {
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encryptedData = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    // If decryption fails, return the original text (might be plain text that happens to have colons, or an actual error)
    console.error('Decryption failed, treating as clear text (legacy):', err.message);
    return encryptedText;
  }
}

module.exports = {
  encrypt,
  decrypt
};
