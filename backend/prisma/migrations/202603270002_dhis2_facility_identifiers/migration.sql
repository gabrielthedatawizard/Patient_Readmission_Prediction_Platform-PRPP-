ALTER TABLE "Facility"
ADD COLUMN "dhis2OrgUnitId" TEXT,
ADD COLUMN "dhis2Code" TEXT;

CREATE UNIQUE INDEX "Facility_dhis2OrgUnitId_key" ON "Facility"("dhis2OrgUnitId");
CREATE UNIQUE INDEX "Facility_dhis2Code_key" ON "Facility"("dhis2Code");
