-- Add structured encounter data and prediction feature snapshots for ML-ready workflows.

ALTER TABLE "Visit"
  ADD COLUMN "diagnoses" JSONB,
  ADD COLUMN "medications" JSONB,
  ADD COLUMN "labResults" JSONB,
  ADD COLUMN "vitalSigns" JSONB,
  ADD COLUMN "socialFactors" JSONB,
  ADD COLUMN "dischargeDisposition" TEXT;

ALTER TABLE "Prediction"
  ADD COLUMN "probability" DOUBLE PRECISION,
  ADD COLUMN "method" TEXT,
  ADD COLUMN "featureSnapshot" JSONB,
  ADD COLUMN "analysisSummary" JSONB;

UPDATE "Prediction"
SET
  "probability" = ROUND(("score"::numeric / 100.0), 3)::double precision,
  "method" = CASE WHEN "fallbackUsed" THEN 'rules' ELSE 'ml' END
WHERE "probability" IS NULL OR "method" IS NULL;
