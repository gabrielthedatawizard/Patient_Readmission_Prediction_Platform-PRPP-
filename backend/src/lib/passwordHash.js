let passwordHasher = null;
let implementationName = null;

function tryLoadHasher(packageName) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(packageName);
  } catch (error) {
    return null;
  }
}

passwordHasher = tryLoadHasher('bcrypt');
if (passwordHasher) {
  implementationName = 'bcrypt';
} else {
  passwordHasher = tryLoadHasher('bcryptjs');
  if (passwordHasher) {
    implementationName = 'bcryptjs';
  }
}

if (!passwordHasher) {
  throw new Error(
    'No password hashing library available. Install either `bcrypt` or `bcryptjs`.'
  );
}

function hashSync(value, rounds = 10) {
  return passwordHasher.hashSync(String(value || ''), Number(rounds) || 10);
}

function compareSync(plainText, hash) {
  try {
    return passwordHasher.compareSync(String(plainText || ''), String(hash || ''));
  } catch (error) {
    return false;
  }
}

async function hash(value, rounds = 10) {
  if (typeof passwordHasher.hash === 'function') {
    return passwordHasher.hash(String(value || ''), Number(rounds) || 10);
  }

  return hashSync(value, rounds);
}

async function compare(plainText, hashValue) {
  if (typeof passwordHasher.compare === 'function') {
    try {
      return await passwordHasher.compare(
        String(plainText || ''),
        String(hashValue || '')
      );
    } catch (error) {
      return false;
    }
  }

  return compareSync(plainText, hashValue);
}

module.exports = {
  implementationName,
  hashSync,
  compareSync,
  hash,
  compare
};
