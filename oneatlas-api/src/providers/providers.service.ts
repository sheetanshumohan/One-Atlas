import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { containsInsensitive } from '../common/utils/search';
import { paginate, pageArgs } from '../common/dto/pagination.dto';
import { notFound, validationError } from '../common/errors';
import { dec } from '../common/utils/decimal';
import { isValidSlug, slugify } from '../common/utils/slug';
import { modelSummaryInclude, presentModelSummary } from '../models/model.presenter';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto, ListProvidersQueryDto, UpdateProviderDto } from './dto/provider.dto';

const countInclude = { _count: { select: { offerings: { where: { isAvailable: true } } } } } satisfies Prisma.ProviderInclude;
type ProviderRow = Prisma.ProviderGetPayload<{ include: typeof countInclude }>;

function presentProvider(p: ProviderRow) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    website: p.website,
    apiBaseUrl: p.apiBaseUrl,
    modelCount: p._count.offerings,
  };
}

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async list(q: ListProvidersQueryDto) {
    const and: Prisma.ProviderWhereInput[] = [];
    if (q.q) {
      const contains = containsInsensitive(q.q);
      and.push({ OR: [{ name: contains }, { slug: contains }, { description: contains }] });
    }
    if (q.model) and.push({ offerings: { some: { isAvailable: true, model: { slug: q.model } } } });
    const where: Prisma.ProviderWhereInput = and.length ? { AND: and } : {};

    const dir = q.order ?? (q.sort === 'name' ? 'asc' : 'desc');
    const primary: Prisma.ProviderOrderByWithRelationInput =
      q.sort === 'modelCount'
        ? { offerings: { _count: dir } }
        : { [q.sort === 'name' ? 'nameSortKey' : q.sort]: dir };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.provider.count({ where }),
      this.prisma.provider.findMany({ where, include: countInclude, orderBy: [primary, { slug: 'asc' }], ...pageArgs(q) }),
    ]);
    return paginate(rows.map(presentProvider), total, q);
  }

  async findBySlug(slug: string) {
    const p = await this.prisma.provider.findUnique({
      where: { slug },
      include: {
        ...countInclude,
        offerings: {
          include: { model: { include: modelSummaryInclude } },
          orderBy: [{ model: { nameSortKey: 'asc' } }, { model: { slug: 'asc' } }],
        },
      },
    });
    if (!p) throw notFound('Provider', slug);

    const models = p.offerings.map((o) => ({
      model: presentModelSummary(o.model),
      providerModelId: o.providerModelId,
      inputPricePerMTok: dec(o.inputPricePerMTok),
      outputPricePerMTok: dec(o.outputPricePerMTok),
      cachedInputPerMTok: dec(o.cachedInputPerMTok),
      contextWindow: o.contextWindow,
      avgLatencyMs: o.avgLatencyMs,
      throughputTps: dec(o.throughputTps),
      uptimePct: dec(o.uptimePct),
      isAvailable: o.isAvailable,
    }));
    const orgs = [...new Set(models.map((m) => m.model.organization.slug))].sort();
    return {
      ...presentProvider(p),
      stats: { modelCount: p._count.offerings, organizations: orgs },
      models,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateProviderDto) {
    const slug = dto.slug ?? slugify(dto.name);
    if (!isValidSlug(slug)) throw validationError('slug', 'Could not derive a valid slug from name; provide "slug" explicitly');
    return presentProvider(await this.prisma.provider.create({ data: { ...dto, slug }, include: countInclude }));
  }

  async update(slug: string, dto: UpdateProviderDto) {
    for (const key of ['slug', 'name'] as const) {
      if (dto[key] === null) throw validationError(key, `${key} cannot be null`);
    }
    const existing = await this.prisma.provider.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) throw notFound('Provider', slug);
    return presentProvider(await this.prisma.provider.update({ where: { id: existing.id }, data: dto, include: countInclude }));
  }

  /** Deleting a provider cascades its offerings, so affected models' price summaries are rebuilt atomically. */
  async remove(slug: string) {
    await this.prisma.$transaction(async (tx) => {
      const p = await tx.provider.findUnique({ where: { slug }, include: { offerings: { select: { modelId: true } } } });
      if (!p) throw notFound('Provider', slug);
      await this.pricing.lockModels(tx, p.offerings.map((o) => o.modelId));
      await tx.provider.delete({ where: { id: p.id } });
      await this.pricing.recompute(tx, p.offerings.map((o) => o.modelId));
    });
  }
}
