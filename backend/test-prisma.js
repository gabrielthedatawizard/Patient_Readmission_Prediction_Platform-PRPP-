const { PrismaClient } = require('@prisma/client');
const { assertEncryptionConfig } = require('./src/lib/encryption');

async function test() {
  process.env.NODE_ENV = 'production';
  process.env.TRIP_DATA_PROVIDER = 'prisma';
  process.env.DATABASE_URL = 'postgresql://postgres.oqxofvyurudlcgwsghqj:TheBrighttommoro@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require';
  process.env.ENCRYPTION_KEY = '';

  const { prisma, getDatabaseSchemaCapabilities } = require('./src/lib/prisma');
  try {
    const facilities = await prisma.facility.findMany();
    console.log('Facilities count:', facilities.length);
    
    // Now trigger a query that decrypts
    const patients = await prisma.patient.findMany({ take: 5 });
    console.log('Patients count:', patients.length);
  } catch (e) {
    console.log('CAUGHT AN ERROR:', e.code, e.statusCode, e.publicMessage);
    console.error(e);
  }
}

test();
