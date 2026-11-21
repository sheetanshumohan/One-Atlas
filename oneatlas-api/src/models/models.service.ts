import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, pageArgs, Paginated } from '../common/dto/pagination.dto';
import { notFound, validationError } from '../common/errors';
import { isValidSlug, slugify } from '../common/utils/slug';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService, PrismaTx } from '../prisma/prisma.service';
import { CompareModelsQueryDto } from './dto/compare-models.query';
import { ListModelsQueryDto } from './dto/list-models.query';
import { CreateModelDto, UpdateModelDto, UpsertBenchmarkResultDto, UpsertOfferingDto } from './dto/model-write.dto';
import { buildModelOrderBy, buildModelWhere } from './model-query.builder';
import {
  modelDetailInclude, modelSummaryInclude, ModelDetailView, ModelSummaryView, presentBenchmarkResult,
  presentModelDetail, presentModelSummary, presentOffering,
} from './model.presenter';
import { buildComparison } from './comparison';

/** Fields that may never be cleared with `null` on PATCH. */
const NON_NULLABLE: (keyof UpdateModelDto)[] = [
  'slug', 'name', 'organization', 'type', 'status', 'openWeights', 'inputModalities', 'outputModalities', 'capabilities',
];

const toDate = (v: string | null | undefined): Date | null | undefined =>
  v === undefined ? undefined : v === null ? null : new Date(v);

@Injectable()
export class ModelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  // ---------------------------------------------------------------- reads

  async list(q: ListModelsQueryDto): Promise<Paginated<ModelSummaryView>> {
    const where = buildModelWhere(q);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.model.count({ where }),
      this.prisma.model.findMany({
        where,
        include: modelSummaryInclude,
        orderBy: buildModelOrderBy(q.sort, q.order),
        ...pageArgs(q),
      }),
    ]);
    return paginate(rows.map(presentModelSummary), total, q);
  }

  async findBySlug(slug: string): Promise<ModelDetailView> {
    const model = await this.prisma.model.findUnique({ where: { slug }, include: modelDetailInclude });
    if (!model) throw notFound('Model', slug);
    return presentModelDetail(model);
  }

  async compare(q: CompareModelsQueryDto) {
    const rows = await this.prisma.model.findMany({ where: { slug: { in: q.models } }, include: modelDetailInclude });
    const found = new Map(rows.map((r) => [r.slug, presentModelDetail(r)]));
    const missing = q.models.filter((s) => !found.has(s));
    if (missing.length) {
      throw notFound('Model', missing.join("', '"));
    }
    // Preserve the caller's column order.
    return buildComparison(q.models.map((s) => found.get(s)!));
  }

  async listOfferings(slug: string) {
    const model = await this.prisma.model.findUnique({
      where: { slug },
      select: { offerings: modelDetailInclude.offerings },
    });
    if (!model) throw notFound('Model', slug);
    return { data: model.offerings.map(presentOffering) };
  }

  // ---------------------------------------------------------------- writes

  async create(dto: CreateModelDto): Promise<ModelDetailView> {
    const slug = dto.slug ?? slugify(dto.name);
    if (!isValidSlug(slug)) throw validationError('slug', `Could not derive a valid slug from name; provide "slug" explicitly`);
    this.assertTokenLimits(dto.contextWindow, dto.maxOutputTokens);

    return this.prisma.$transaction(async (tx) => {
      const organizationId = await this.resolveOrganizationId(tx, dto.organization);
      const capabilityIds = await this.resolveCapabilityIds(tx, dto.capabilities ?? []);
      const created = await tx.model.create({
        data: {
          slug,
          name: dto.name,
          description: dto.description,
          organizationId,
          type: dto.type,
          status: dto.status,
          releaseDate: toDate(dto.releaseDate),
          knowledgeCutoff: toDate(dto.knowledgeCutoff),
          contextWindow: dto.contextWindow,
          maxOutputTokens: dto.maxOutputTokens,
          parameterCountB: dto.parameterCountB,
          openWeights: dto.openWeights,
          license: dto.license,
          inputModalities: dto.inputModalities,
          outputModalities: dto.outputModalities,
          capabilities: { create: capabilityIds.map((capabilityId) => ({ capabilityId })) },
        },
        include: modelDetailInclude,
      });
      return presentModelDetail(created);
    });
  }

  async update(slug: string, dto: UpdateModelDto): Promise<ModelDetailView> {
    for (const key of NON_NULLABLE) {
      if ((dto as Record<string, unknown>)[key] === null) throw validationError(key, `${key} cannot be null`);
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.model.findUnique({ where: { slug } });
      if (!existing) throw notFound('Model', slug);

      this.assertTokenLimits(
        dto.contextWindow !== undefined ? dto.contextWindow : existing.contextWindow,
        dto.maxOutputTokens !== undefined ? dto.maxOutputTokens : existing.maxOutputTokens,
      );

      const data: Prisma.ModelUncheckedUpdateInput = {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        releaseDate: toDate(dto.releaseDate),
        knowledgeCutoff: toDate(dto.knowledgeCutoff),
        contextWindow: dto.contextWindow,
        maxOutputTokens: dto.maxOutputTokens,
        parameterCountB: dto.parameterCountB,
        openWeights: dto.openWeights,
        license: dto.license,
        inputModalities: dto.inputModalities,
        outputModalities: dto.outputModalities,
      };
      if (dto.organization !== undefined) data.organizationId = await this.resolveOrganizationId(tx, dto.organization);
      if (dto.capabilities !== undefined) {
        const capabilityIds = await this.resolveCapabilityIds(tx, dto.capabilities);
        await tx.modelCapability.deleteMany({ where: { modelId: existing.id } });
        await tx.modelCapability.createMany({ data: capabilityIds.map((capabilityId) => ({ modelId: existing.id, capabilityId })) });
      }

      const updated = await tx.model.update({ where: { id: existing.id }, data, include: modelDetailInclude });
      return presentModelDetail(updated);
    });
  }

  async remove(slug: string): Promise<void> {
    const { count } = await this.prisma.model.deleteMany({ where: { slug } });
    if (count === 0) throw notFound('Model', slug);
  }

  async upsertOffering(modelSlug: string, providerSlug: string, dto: UpsertOfferingDto) {
    if (dto.cachedInputPerMTok !== undefined && dto.cachedInputPerMTok > dto.inputPricePerMTok) {
      throw validationError('cachedInputPerMTok', 'cachedInputPerMTok cannot exceed inputPricePerMTok');
    }
    return this.prisma.$transaction(async (tx) => {
      const model = await tx.model.findUnique({ where: { slug: modelSlug }, select: { id: true } });
      if (!model) throw notFound('Model', modelSlug);
      const provider = await tx.provider.findUnique({ where: { slug: providerSlug }, select: { id: true } });
      if (!provider) throw notFound('Provider', providerSlug);
      await this.pricing.lockModels(tx, [model.id]);

      // PUT semantics: the body fully describes the offering; omitted optional fields are cleared.
      const fields = {
        providerModelId: dto.providerModelId,
        inputPricePerMTok: dto.inputPricePerMTok,
        outputPricePerMTok: dto.outputPricePerMTok,
        cachedInputPerMTok: dto.cachedInputPerMTok ?? null,
        contextWindow: dto.contextWindow ?? null,
        maxOutputTokens: dto.maxOutputTokens ?? null,
        avgLatencyMs: dto.avgLatencyMs ?? null,
        throughputTps: dto.throughputTps ?? null,
        uptimePct: dto.uptimePct ?? null,
        isAvailable: dto.isAvailable ?? true,
      };
      const offering = await tx.modelProvider.upsert({
        where: { modelId_providerId: { modelId: model.id, providerId: provider.id } },
        create: { modelId: model.id, providerId: provider.id, ...fields },
        update: fields,
        include: { provider: { select: { slug: true, name: true, website: true } } },
      });
      await this.pricing.recompute(tx, [model.id]);
      return presentOffering(offering);
    });
  }

  async removeOffering(modelSlug: string, providerSlug: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const model = await tx.model.findUnique({ where: { slug: modelSlug }, select: { id: true } });
      if (!model) throw notFound('Model', modelSlug);
      await this.pricing.lockModels(tx, [model.id]);
      const { count } = await tx.modelProvider.deleteMany({ where: { modelId: model.id, provider: { slug: providerSlug } } });
      if (count === 0) throw notFound('Offering', `${modelSlug}@${providerSlug}`);
      await this.pricing.recompute(tx, [model.id]);
    });
  }

  async upsertBenchmarkResult(modelSlug: string, benchmarkSlug: string, dto: UpsertBenchmarkResultDto) {
    return this.prisma.$transaction(async (tx) => {
      const model = await tx.model.findUnique({ where: { slug: modelSlug }, select: { id: true } });
      if (!model) throw notFound('Model', modelSlug);
      const benchmark = await tx.benchmark.findUnique({ where: { slug: benchmarkSlug } });
      if (!benchmark) throw notFound('Benchmark', benchmarkSlug);

      const min = benchmark.minScore.toNumber();
      const max = benchmark.maxScore.toNumber();
      if (dto.score < min || dto.score > max) {
        throw validationError('score', `score must be between ${min} and ${max} for benchmark '${benchmarkSlug}'`);
      }
      const fields = { score: dto.score, sourceUrl: dto.sourceUrl ?? null, measuredAt: toDate(dto.measuredAt) ?? null };
      const result = await tx.benchmarkResult.upsert({
        where: { modelId_benchmarkId: { modelId: model.id, benchmarkId: benchmark.id } },
        create: { modelId: model.id, benchmarkId: benchmark.id, ...fields },
        update: fields,
        include: { benchmark: true },
      });
      return presentBenchmarkResult(result);
    });
  }

  async removeBenchmarkResult(modelSlug: string, benchmarkSlug: string): Promise<void> {
    const { count } = await this.prisma.benchmarkResult.deleteMany({
      where: { model: { slug: modelSlug }, benchmark: { slug: benchmarkSlug } },
    });
    if (count === 0) throw notFound('Benchmark result', `${modelSlug}/${benchmarkSlug}`);
  }

  // ---------------------------------------------------------------- helpers

  private assertTokenLimits(contextWindow?: number | null, maxOutputTokens?: number | null): void {
    if (contextWindow != null && maxOutputTokens != null && maxOutputTokens > contextWindow) {
      throw validationError('maxOutputTokens', 'maxOutputTokens cannot exceed contextWindow');
    }
  }

  private async resolveOrganizationId(tx: PrismaTx, slug: string): Promise<string> {
    const org = await tx.organization.findUnique({ where: { slug }, select: { id: true } });
    if (!org) throw validationError('organization', `Unknown organization '${slug}'`);
    return org.id;
  }

  private async resolveCapabilityIds(tx: PrismaTx, slugs: string[]): Promise<string[]> {
    if (slugs.length === 0) return [];
    const caps = await tx.capability.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
    const known = new Set(caps.map((c) => c.slug));
    const unknown = slugs.filter((s) => !known.has(s));
    if (unknown.length) throw validationError('capabilities', `Unknown capabilities: ${unknown.join(', ')}`);
    return caps.map((c) => c.id);
  }
}
