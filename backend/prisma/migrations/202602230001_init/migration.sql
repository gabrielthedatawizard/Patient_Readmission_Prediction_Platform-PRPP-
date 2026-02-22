-- TRIP Phase 2 initial PostgreSQL schema
-- Generated manually to mirror prisma/schema.prisma for controlled rollout.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'done');
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "RiskTier" AS ENUM ('Low', 'Medium', 'High');

CREATE TABLE "Region" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Facility" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Role" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "slug" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "permissions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "facilityId" TEXT,
  "regionId" TEXT,
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  "mfaSecret" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Patient" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "age" INTEGER NOT NULL,
  "gender" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "insurance" TEXT,
  "status" TEXT NOT NULL DEFAULT 'admitted',
  "facilityId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Visit" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "patientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "admissionDate" TIMESTAMP(3) NOT NULL,
  "dischargeDate" TIMESTAMP(3),
  "diagnosis" TEXT NOT NULL,
  "ward" TEXT NOT NULL,
  "lengthOfStay" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Prediction" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "facilityId" TEXT NOT NULL,
  "generatedById" TEXT,
  "score" INTEGER NOT NULL,
  "tier" "RiskTier" NOT NULL,
  "factors" JSONB NOT NULL,
  "explanation" TEXT,
  "confidence" DOUBLE PRECISION NOT NULL,
  "confidenceLow" INTEGER NOT NULL,
  "confidenceHigh" INTEGER NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "modelType" TEXT NOT NULL,
  "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
  "dataQuality" JSONB,
  "overrideTier" "RiskTier",
  "overrideReason" TEXT,
  "overriddenAt" TIMESTAMP(3),
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "patientId" TEXT NOT NULL,
  "predictionId" TEXT,
  "facilityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priority" "Priority" NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'pending',
  "assignee" TEXT,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT,
  "facilityId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT,
  "details" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");
CREATE UNIQUE INDEX "Role_slug_key" ON "Role"("slug");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Prediction_visitId_key" ON "Prediction"("visitId");

CREATE INDEX "Facility_regionId_idx" ON "Facility"("regionId");
CREATE INDEX "Facility_district_idx" ON "Facility"("district");

CREATE INDEX "User_roleId_idx" ON "User"("roleId");
CREATE INDEX "User_facilityId_idx" ON "User"("facilityId");
CREATE INDEX "User_regionId_idx" ON "User"("regionId");

CREATE INDEX "Patient_facilityId_idx" ON "Patient"("facilityId");
CREATE INDEX "Patient_status_idx" ON "Patient"("status");
CREATE INDEX "Patient_createdAt_idx" ON "Patient"("createdAt");

CREATE INDEX "Visit_patientId_admissionDate_idx" ON "Visit"("patientId", "admissionDate");
CREATE INDEX "Visit_facilityId_admissionDate_idx" ON "Visit"("facilityId", "admissionDate");
CREATE INDEX "Visit_dischargeDate_idx" ON "Visit"("dischargeDate");

CREATE INDEX "Prediction_patientId_generatedAt_idx" ON "Prediction"("patientId", "generatedAt");
CREATE INDEX "Prediction_facilityId_generatedAt_idx" ON "Prediction"("facilityId", "generatedAt");
CREATE INDEX "Prediction_score_tier_idx" ON "Prediction"("score", "tier");

CREATE INDEX "Task_predictionId_status_idx" ON "Task"("predictionId", "status");
CREATE INDEX "Task_facilityId_dueDate_idx" ON "Task"("facilityId", "dueDate");
CREATE INDEX "Task_patientId_status_idx" ON "Task"("patientId", "status");

CREATE INDEX "AuditLog_userId_action_createdAt_idx" ON "AuditLog"("userId", "action", "createdAt");
CREATE INDEX "AuditLog_facilityId_createdAt_idx" ON "AuditLog"("facilityId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

ALTER TABLE "Facility"
  ADD CONSTRAINT "Facility_regionId_fkey"
  FOREIGN KEY ("regionId") REFERENCES "Region"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_regionId_fkey"
  FOREIGN KEY ("regionId") REFERENCES "Region"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Patient"
  ADD CONSTRAINT "Patient_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Prediction"
  ADD CONSTRAINT "Prediction_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Prediction"
  ADD CONSTRAINT "Prediction_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Prediction"
  ADD CONSTRAINT "Prediction_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Prediction"
  ADD CONSTRAINT "Prediction_generatedById_fkey"
  FOREIGN KEY ("generatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_predictionId_fkey"
  FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
