-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('AI_LAB', 'BIG_TECH', 'STARTUP', 'RESEARCH_INSTITUTE', 'OPEN_SOURCE_COLLECTIVE');

-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('CHAT', 'REASONING', 'CODE', 'EMBEDDING', 'IMAGE_GENERATION', 'SPEECH_TO_TEXT', 'TEXT_TO_SPEECH', 'VIDEO_GENERATION', 'MODERATION');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('PREVIEW', 'ACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'EMBEDDING');

-- CreateEnum
CREATE TYPE "BenchmarkCategory" AS ENUM ('GENERAL_KNOWLEDGE', 'REASONING', 'MATH', 'CODING', 'INSTRUCTION_FOLLOWING', 'MULTIMODAL', 'LONG_CONTEXT', 'AGENTIC');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "country" VARCHAR(2),
    "foundedYear" INTEGER,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "apiBaseUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capability" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Capability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "type" "ModelType" NOT NULL,
    "status" "ModelStatus" NOT NULL DEFAULT 'ACTIVE',
    "releaseDate" DATE,
    "contextWindow" INTEGER,
    "maxOutputTokens" INTEGER,
    "parameterCountB" DECIMAL(10,2),
    "openWeights" BOOLEAN NOT NULL DEFAULT false,
    "license" TEXT,
    "knowledgeCutoff" DATE,
    "inputModalities" "Modality"[],
    "outputModalities" "Modality"[],
    "minInputPrice" DECIMAL(12,6),
    "minOutputPrice" DECIMAL(12,6),
    "providerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelCapability" (
    "modelId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,

    CONSTRAINT "ModelCapability_pkey" PRIMARY KEY ("modelId","capabilityId")
);

-- CreateTable
CREATE TABLE "ModelProvider" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerModelId" TEXT NOT NULL,
    "inputPricePerMTok" DECIMAL(12,6) NOT NULL,
    "outputPricePerMTok" DECIMAL(12,6) NOT NULL,
    "cachedInputPerMTok" DECIMAL(12,6),
    "contextWindow" INTEGER,
    "maxOutputTokens" INTEGER,
    "avgLatencyMs" INTEGER,
    "throughputTps" DECIMAL(10,2),
    "uptimePct" DECIMAL(5,2),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "BenchmarkCategory" NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '%',
    "minScore" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "maxScore" DECIMAL(10,3) NOT NULL DEFAULT 100,
    "higherIsBetter" BOOLEAN NOT NULL DEFAULT true,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkResult" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "benchmarkId" TEXT NOT NULL,
    "score" DECIMAL(10,3) NOT NULL,
    "sourceUrl" TEXT,
    "measuredAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenchmarkResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_name_trgm_idx" ON "Organization" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

-- CreateIndex
CREATE INDEX "Provider_name_trgm_idx" ON "Provider" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "Capability_slug_key" ON "Capability"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Model_slug_key" ON "Model"("slug");

-- CreateIndex
CREATE INDEX "Model_organizationId_idx" ON "Model"("organizationId");

-- CreateIndex
CREATE INDEX "Model_type_idx" ON "Model"("type");

-- CreateIndex
CREATE INDEX "Model_releaseDate_idx" ON "Model"("releaseDate");

-- CreateIndex
CREATE INDEX "Model_contextWindow_idx" ON "Model"("contextWindow");

-- CreateIndex
CREATE INDEX "Model_minInputPrice_idx" ON "Model"("minInputPrice");

-- CreateIndex
CREATE INDEX "Model_minOutputPrice_idx" ON "Model"("minOutputPrice");

-- CreateIndex
CREATE INDEX "Model_name_trgm_idx" ON "Model" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Model_slug_trgm_idx" ON "Model" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "ModelCapability_capabilityId_idx" ON "ModelCapability"("capabilityId");

-- CreateIndex
CREATE INDEX "ModelProvider_providerId_idx" ON "ModelProvider"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelProvider_modelId_providerId_key" ON "ModelProvider"("modelId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Benchmark_slug_key" ON "Benchmark"("slug");

-- CreateIndex
CREATE INDEX "Benchmark_category_idx" ON "Benchmark"("category");

-- CreateIndex
CREATE INDEX "BenchmarkResult_benchmarkId_score_idx" ON "BenchmarkResult"("benchmarkId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkResult_modelId_benchmarkId_key" ON "BenchmarkResult"("modelId", "benchmarkId");

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelCapability" ADD CONSTRAINT "ModelCapability_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelCapability" ADD CONSTRAINT "ModelCapability_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "Capability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelProvider" ADD CONSTRAINT "ModelProvider_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelProvider" ADD CONSTRAINT "ModelProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "Benchmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written: data-integrity CHECK constraints (not expressible in Prisma schema).
-- The database enforces these even if a write bypasses the API layer.
-- ---------------------------------------------------------------------------
ALTER TABLE "Model" ADD CONSTRAINT "Model_contextWindow_positive" CHECK ("contextWindow" IS NULL OR "contextWindow" > 0);
ALTER TABLE "Model" ADD CONSTRAINT "Model_maxOutputTokens_positive" CHECK ("maxOutputTokens" IS NULL OR "maxOutputTokens" > 0);
ALTER TABLE "Model" ADD CONSTRAINT "Model_parameterCountB_positive" CHECK ("parameterCountB" IS NULL OR "parameterCountB" > 0);
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerCount_nonneg" CHECK ("providerCount" >= 0);
ALTER TABLE "ModelProvider" ADD CONSTRAINT "ModelProvider_prices_nonneg" CHECK ("inputPricePerMTok" >= 0 AND "outputPricePerMTok" >= 0 AND ("cachedInputPerMTok" IS NULL OR "cachedInputPerMTok" >= 0));
ALTER TABLE "ModelProvider" ADD CONSTRAINT "ModelProvider_uptime_range" CHECK ("uptimePct" IS NULL OR ("uptimePct" >= 0 AND "uptimePct" <= 100));
ALTER TABLE "Benchmark" ADD CONSTRAINT "Benchmark_score_range_valid" CHECK ("maxScore" > "minScore");
