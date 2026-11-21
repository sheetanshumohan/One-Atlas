-- Make name sorting identical on every PostgreSQL server.
-- The previous lower(name) key still sorted with the server's default collation, and managed hosts
-- (e.g. Render, en_US.UTF-8) order punctuation/spaces differently from local "C" databases, so the
-- same API returned different orders in different environments. COLLATE "C" = plain code-point order
-- of the lower-cased name: deterministic, and also the fastest collation for indexed sorts.
-- Generated columns cannot be re-typed, so drop + re-add (indexes on them are dropped with the column).
ALTER TABLE "Model"        DROP COLUMN "nameSortKey";
ALTER TABLE "Organization" DROP COLUMN "nameSortKey";
ALTER TABLE "Provider"     DROP COLUMN "nameSortKey";

ALTER TABLE "Model"        ADD COLUMN "nameSortKey" TEXT COLLATE "C" GENERATED ALWAYS AS (lower("name")) STORED;
ALTER TABLE "Organization" ADD COLUMN "nameSortKey" TEXT COLLATE "C" GENERATED ALWAYS AS (lower("name")) STORED;
ALTER TABLE "Provider"     ADD COLUMN "nameSortKey" TEXT COLLATE "C" GENERATED ALWAYS AS (lower("name")) STORED;

CREATE INDEX "Model_nameSortKey_idx"        ON "Model"("nameSortKey");
CREATE INDEX "Organization_nameSortKey_idx" ON "Organization"("nameSortKey");
CREATE INDEX "Provider_nameSortKey_idx"     ON "Provider"("nameSortKey");
