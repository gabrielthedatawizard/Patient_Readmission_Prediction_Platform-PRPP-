-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'acknowledged', 'resolved');

-- CreateEnum
CREATE TYPE "FacilityTier" AS ENUM ('national', 'zonal', 'regional', 'district', 'health_center', 'dispensary', 'community');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('draft', 'completed');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('phone_call', 'home_visit', 'clinic_visit', 'sms');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('scheduled', 'completed', 'missed', 'cancelled');

-- CreateEnum
CREATE TYPE "FollowUpOutcome" AS ENUM ('pending', 'stable', 'deteriorated', 'readmitted', 'unreachable', 'deceased');

-- CreateEnum
CREATE TYPE "ReadmissionSource" AS ENUM ('admission_check', 'manual_review', 'imported');

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "councilName" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "tier" "FacilityTier" NOT NULL DEFAULT 'district';

-- AlterTable
ALTER TABLE "Prediction" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "zoneId" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "districtScope" TEXT,
ADD COLUMN     "roleExpiresAt" TIMESTAMP(3),
ADD COLUMN     "zoneId" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Visit" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DischargeWorkflow" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "predictionId" TEXT,
    "facilityId" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'draft',
    "checklist" JSONB,
    "medications" JSONB,
    "education" JSONB,
    "followUpPlan" JSONB,
    "referrals" JSONB,
    "summary" JSONB,
    "dischargeDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DischargeWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpSchedule" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "predictionId" TEXT,
    "dischargeWorkflowId" TEXT,
    "facilityId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "followUpType" "FollowUpType" NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'scheduled',
    "outcome" "FollowUpOutcome" NOT NULL DEFAULT 'pending',
    "channel" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "outcomeDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadmissionEvent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "currentVisitId" TEXT NOT NULL,
    "priorVisitId" TEXT,
    "facilityId" TEXT NOT NULL,
    "source" "ReadmissionSource" NOT NULL DEFAULT 'admission_check',
    "daysSinceLastDischarge" INTEGER NOT NULL,
    "within30Days" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadmissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "predictionId" TEXT,
    "facilityId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "tier" "RiskTier" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'high',
    "message" TEXT,
    "channels" JSONB,
    "status" "AlertStatus" NOT NULL DEFAULT 'open',
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_code_key" ON "Zone"("code");

-- CreateIndex
CREATE INDEX "DischargeWorkflow_patientId_createdAt_idx" ON "DischargeWorkflow"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "DischargeWorkflow_facilityId_status_createdAt_idx" ON "DischargeWorkflow"("facilityId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DischargeWorkflow_visitId_idx" ON "DischargeWorkflow"("visitId");

-- CreateIndex
CREATE INDEX "FollowUpSchedule_facilityId_status_scheduledFor_idx" ON "FollowUpSchedule"("facilityId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "FollowUpSchedule_patientId_scheduledFor_idx" ON "FollowUpSchedule"("patientId", "scheduledFor");

-- CreateIndex
CREATE INDEX "FollowUpSchedule_assignedToId_status_scheduledFor_idx" ON "FollowUpSchedule"("assignedToId", "status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "ReadmissionEvent_currentVisitId_key" ON "ReadmissionEvent"("currentVisitId");

-- CreateIndex
CREATE INDEX "ReadmissionEvent_patientId_detectedAt_idx" ON "ReadmissionEvent"("patientId", "detectedAt");

-- CreateIndex
CREATE INDEX "ReadmissionEvent_facilityId_detectedAt_idx" ON "ReadmissionEvent"("facilityId", "detectedAt");

-- CreateIndex
CREATE INDEX "ReadmissionEvent_priorVisitId_idx" ON "ReadmissionEvent"("priorVisitId");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_predictionId_key" ON "Alert"("predictionId");

-- CreateIndex
CREATE INDEX "Alert_facilityId_status_createdAt_idx" ON "Alert"("facilityId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_patientId_status_idx" ON "Alert"("patientId", "status");

-- CreateIndex
CREATE INDEX "Facility_parentId_idx" ON "Facility"("parentId");

-- CreateIndex
CREATE INDEX "Facility_tier_idx" ON "Facility"("tier");

-- CreateIndex
CREATE INDEX "Facility_isActive_idx" ON "Facility"("isActive");

-- CreateIndex
CREATE INDEX "Region_zoneId_idx" ON "Region"("zoneId");

-- CreateIndex
CREATE INDEX "User_zoneId_idx" ON "User"("zoneId");

-- CreateIndex
CREATE INDEX "User_districtScope_idx" ON "User"("districtScope");

-- CreateIndex
CREATE INDEX "User_roleExpiresAt_idx" ON "User"("roleExpiresAt");

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeWorkflow" ADD CONSTRAINT "DischargeWorkflow_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeWorkflow" ADD CONSTRAINT "DischargeWorkflow_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeWorkflow" ADD CONSTRAINT "DischargeWorkflow_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeWorkflow" ADD CONSTRAINT "DischargeWorkflow_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeWorkflow" ADD CONSTRAINT "DischargeWorkflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeWorkflow" ADD CONSTRAINT "DischargeWorkflow_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_dischargeWorkflowId_fkey" FOREIGN KEY ("dischargeWorkflowId") REFERENCES "DischargeWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadmissionEvent" ADD CONSTRAINT "ReadmissionEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadmissionEvent" ADD CONSTRAINT "ReadmissionEvent_currentVisitId_fkey" FOREIGN KEY ("currentVisitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadmissionEvent" ADD CONSTRAINT "ReadmissionEvent_priorVisitId_fkey" FOREIGN KEY ("priorVisitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadmissionEvent" ADD CONSTRAINT "ReadmissionEvent_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
