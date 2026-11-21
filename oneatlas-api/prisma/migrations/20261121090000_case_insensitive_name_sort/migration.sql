-- Case-insensitive alphabetical sorting that does not depend on the server's collation.
-- With the "C" collation (common default), ORDER BY name puts "o1" after "Whisper" and "GPT-4o" before "Gemini".
-- A STORED generated column is maintained by Postgres on every insert/update, so it can never drift.
ALTER TABLE "Model"        ADD COLUMN "nameSortKey" TEXT GENERATED ALWAYS AS (lower("name")) STORED;
ALTER TABLE "Organization" ADD COLUMN "nameSortKey" TEXT GENERATED ALWAYS AS (lower("name")) STORED;
ALTER TABLE "Provider"     ADD COLUMN "nameSortKey" TEXT GENERATED ALWAYS AS (lower("name")) STORED;

CREATE INDEX "Model_nameSortKey_idx"        ON "Model"("nameSortKey");
CREATE INDEX "Organization_nameSortKey_idx" ON "Organization"("nameSortKey");
CREATE INDEX "Provider_nameSortKey_idx"     ON "Provider"("nameSortKey");
