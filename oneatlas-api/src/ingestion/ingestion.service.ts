import { Injectable, Logger } from '@nestjs/common';
import { OrganizationType } from '@prisma/client';
import { notFound } from '../common/errors';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService, PrismaTx } from '../prisma/prisma.service';
import { IngestModelsDto } from './dto/ingest.dto';
import { CAPABILITY_NAMES, NormalizedModel, normalizeRecord } from './normalizer';

export interface IngestIssue {
  index: number;
  id: string | null;
  reason: string;
}

export interface IngestReport {
  provider: string;
  dryRun: boolean;
  received: number;
  created: number;
  updated: number;
  skipped: IngestIssue[];
  errors: IngestIssue[];
  organizationsCreated: string[];
  preview?: Array<Omit<NormalizedModel, 'offering'> & { offering: Record<string, unknown> }>;
}

class IngestRecordError extends Error {}

function rawId(raw: unknown): string | null {
  return raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'string' ? (raw as { id: string }).id : null;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  /**
   * Idempotent ingestion: re-running the same payload produces `updated`, never duplicates.
   * Each record is written in its own transaction so a failure is isolated and reported.
   */
  async ingest(dto: IngestModelsDto): Promise<IngestReport> {
    const provider = await this.prisma.provider.findUnique({ where: { slug: dto.provider }, select: { id: true } });
    if (!provider) throw notFound('Provider', dto.provider);

    const report: IngestReport = {
      provider: dto.provider,
      dryRun: dto.dryRun ?? false,
      received: dto.models.length,
      created: 0,
      updated: 0,
      skipped: [],
      errors: [],
      organizationsCreated: [],
    };

    const seen = new Set<string>();
    const valid: Array<{ index: number; value: NormalizedModel }> = [];
    dto.models.forEach((raw, index) => {
      const result = normalizeRecord(raw);
      const id = rawId(raw);
      if (!result.ok) {
        (result.kind === 'skipped' ? report.skipped : report.errors).push({ index, id, reason: result.reason });
        return;
      }
      if (seen.has(result.value.slug)) {
        report.skipped.push({ index, id, reason: `duplicate of an earlier record in this batch (slug '${result.value.slug}')` });
        return;
      }
      seen.add(result.value.slug);
      valid.push({ index, value: result.value });
    });

    if (report.dryRun) {
      report.preview = valid.map(({ value }) => ({
        ...value,
        offering: {
          ...value.offering,
          inputPricePerMTok: value.offering.inputPricePerMTok.toNumber(),
          outputPricePerMTok: value.offering.outputPricePerMTok.toNumber(),
          cachedInputPerMTok: value.offering.cachedInputPerMTok?.toNumber() ?? null,
        },
      }));
      return report;
    }

    const orgsCreated = new Set<string>();
    for (const { index, value } of valid) {
      try {
        const outcome = await this.prisma.$transaction((tx) => this.writeRecord(tx, provider.id, value, orgsCreated, `ingestion:${dto.provider}`));
        report[outcome] += 1;
      } catch (e) {
        const reason = e instanceof IngestRecordError ? e.message : 'database error while writing record';
        if (!(e instanceof IngestRecordError)) this.logger.warn(`Ingest record ${value.offering.providerModelId} failed: ${String(e)}`);
        report.errors.push({ index, id: value.offering.providerModelId, reason });
      }
    }
    report.organizationsCreated = [...orgsCreated].sort();
    report.errors.sort((a, b) => a.index - b.index);
    return report;
  }

  private async writeRecord(tx: PrismaTx, providerId: string, m: NormalizedModel, orgsCreated: Set<string>, source: string): Promise<'created' | 'updated'> {
    let org = await tx.organization.findUnique({ where: { slug: m.organizationSlug }, select: { id: true } });
    if (!org) {
      org = await tx.organization.create({
        data: { slug: m.organizationSlug, name: m.organizationName, type: OrganizationType.AI_LAB },
        select: { id: true },
      });
      orgsCreated.add(m.organizationSlug);
    }

    for (const slug of m.capabilities) {
      await tx.capability.upsert({ where: { slug }, create: { slug, name: CAPABILITY_NAMES[slug] ?? slug }, update: {} });
    }
    const caps = await tx.capability.findMany({ where: { slug: { in: m.capabilities } }, select: { id: true } });

    const existing = await tx.model.findUnique({ where: { slug: m.slug }, select: { id: true, organizationId: true } });
    if (existing && existing.organizationId !== org.id) {
      throw new IngestRecordError(`slug '${m.slug}' already belongs to a model from a different organization`);
    }

    let modelId: string;
    let outcome: 'created' | 'updated';
    if (!existing) {
      const created = await tx.model.create({
        data: {
          slug: m.slug,
          name: m.name,
          description: m.description,
          organizationId: org.id,
          type: m.type,
          releaseDate: m.releaseDate,
          contextWindow: m.contextWindow,
          maxOutputTokens: m.maxOutputTokens,
          inputModalities: m.inputModalities,
          outputModalities: m.outputModalities,
          openWeights: m.openWeights ?? false,
        },
        select: { id: true },
      });
      modelId = created.id;
      outcome = 'created';
    } else {
      // Never erase curated data with unknowns from the feed: only overwrite with known values.
      await tx.model.update({
        where: { id: existing.id },
        data: {
          name: m.name,
          ...(m.description !== null && { description: m.description }),
          ...(m.releaseDate !== null && { releaseDate: m.releaseDate }),
          ...(m.contextWindow !== null && { contextWindow: m.contextWindow }),
          ...(m.maxOutputTokens !== null && { maxOutputTokens: m.maxOutputTokens }),
          ...(m.openWeights !== null && { openWeights: m.openWeights }),
          inputModalities: m.inputModalities,
          outputModalities: m.outputModalities,
        },
      });
      modelId = existing.id;
      outcome = 'updated';
    }

    // Capabilities are merged (union), so curated capabilities are never dropped by a feed.
    if (caps.length) {
      await tx.modelCapability.createMany({ data: caps.map((c) => ({ modelId, capabilityId: c.id })), skipDuplicates: true });
    }

    await this.pricing.lockModels(tx, [modelId]);
    const offering = {
      providerModelId: m.offering.providerModelId,
      inputPricePerMTok: m.offering.inputPricePerMTok,
      outputPricePerMTok: m.offering.outputPricePerMTok,
      cachedInputPerMTok: m.offering.cachedInputPerMTok,
      contextWindow: m.offering.contextWindow,
      maxOutputTokens: m.offering.maxOutputTokens,
      isAvailable: true,
    };
    const before = await tx.modelProvider.findUnique({ where: { modelId_providerId: { modelId, providerId } } });
    const after = await tx.modelProvider.upsert({
      where: { modelId_providerId: { modelId, providerId } },
      create: { modelId, providerId, ...offering },
      update: offering,
    });
    // Re-ingesting unchanged prices writes no history (classifyPriceChange returns null).
    await this.pricing.recordChange(tx, { modelId, providerId }, before, after, source);
    await this.pricing.recompute(tx, [modelId]);
    return outcome;
  }
}
