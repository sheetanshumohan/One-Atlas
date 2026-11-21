-- CreateEnum
CREATE TYPE "PriceChange" AS ENUM ('CREATED', 'UPDATED', 'REMOVED');

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "change" "PriceChange" NOT NULL,
    "inputPricePerMTok" DECIMAL(12,6) NOT NULL,
    "outputPricePerMTok" DECIMAL(12,6) NOT NULL,
    "cachedInputPerMTok" DECIMAL(12,6),
    "isAvailable" BOOLEAN NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_modelId_recordedAt_idx" ON "PriceHistory"("modelId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "PriceHistory_providerId_idx" ON "PriceHistory"("providerId");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written: same integrity guarantee as ModelProvider — history can never hold a negative price.
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_prices_nonneg" CHECK ("inputPricePerMTok" >= 0 AND "outputPricePerMTok" >= 0 AND ("cachedInputPerMTok" IS NULL OR "cachedInputPerMTok" >= 0));

-- Backfill: every offering that already exists gets a "CREATED" event with its current prices, so the
-- history is complete from day one (invariant: the latest event per offering == its current price).
INSERT INTO "PriceHistory" ("id", "modelId", "providerId", "change", "inputPricePerMTok", "outputPricePerMTok", "cachedInputPerMTok", "isAvailable", "source", "recordedAt")
SELECT 'bf_' || mp."id", mp."modelId", mp."providerId", 'CREATED', mp."inputPricePerMTok", mp."outputPricePerMTok", mp."cachedInputPerMTok", mp."isAvailable", 'backfill', mp."createdAt"
FROM "ModelProvider" mp;
