-- Add patient PII encryption metadata so encrypted rows can be tracked during rollout.

ALTER TABLE "Patient"
  ADD COLUMN "piiVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "piiEncryptedAt" TIMESTAMP(3);
