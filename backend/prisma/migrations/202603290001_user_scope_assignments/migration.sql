ALTER TABLE "User"
ADD COLUMN "district" TEXT,
ADD COLUMN "ward" TEXT;

CREATE INDEX "User_district_idx" ON "User"("district");
CREATE INDEX "User_ward_idx" ON "User"("ward");
