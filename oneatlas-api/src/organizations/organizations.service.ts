import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { containsInsensitive } from '../common/utils/search';
import { paginate, pageArgs } from '../common/dto/pagination.dto';
import { conflict, notFound, validationError } from '../common/errors';
import { isValidSlug, slugify } from '../common/utils/slug';
import { modelSummaryInclude, presentModelSummary } from '../models/model.presenter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, ListOrganizationsQueryDto, UpdateOrganizationDto } from './dto/organization.dto';

type OrgRow = Prisma.OrganizationGetPayload<{ include: { _count: { select: { models: true } } } }>;

function presentOrg(o: OrgRow) {
  return {
    id: o.id,
    slug: o.slug,
    name: o.name,
    type: o.type,
    description: o.description,
    website: o.website,
    country: o.country,
    foundedYear: o.foundedYear,
    logoUrl: o.logoUrl,
    modelCount: o._count.models,
  };
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListOrganizationsQueryDto) {
    const and: Prisma.OrganizationWhereInput[] = [];
    if (q.q) {
      const contains = containsInsensitive(q.q);
      and.push({ OR: [{ name: contains }, { slug: contains }, { description: contains }] });
    }
    if (q.type?.length) and.push({ type: { in: q.type } });
    if (q.country) and.push({ country: q.country });
    const where: Prisma.OrganizationWhereInput = and.length ? { AND: and } : {};

    const dir = q.order ?? (q.sort === 'name' ? 'asc' : 'desc');
    const primary: Prisma.OrganizationOrderByWithRelationInput =
      q.sort === 'modelCount'
        ? { models: { _count: dir } }
        : q.sort === 'foundedYear'
          ? { foundedYear: { sort: dir, nulls: 'last' } }
          : { [q.sort === 'name' ? 'nameSortKey' : q.sort]: dir };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        include: { _count: { select: { models: true } } },
        orderBy: [primary, { slug: 'asc' }],
        ...pageArgs(q),
      }),
    ]);
    return paginate(rows.map(presentOrg), total, q);
  }

  async findBySlug(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      include: {
        _count: { select: { models: true } },
        models: { include: modelSummaryInclude, orderBy: [{ releaseDate: { sort: 'desc', nulls: 'last' } }, { slug: 'asc' }] },
      },
    });
    if (!org) throw notFound('Organization', slug);
    const models = org.models.map(presentModelSummary);
    const dates = models.map((m) => m.releaseDate).filter((d): d is string => d !== null).sort();
    return {
      ...presentOrg(org),
      stats: {
        modelCount: models.length,
        openWeightsModelCount: models.filter((m) => m.openWeights).length,
        firstRelease: dates[0] ?? null,
        latestRelease: dates[dates.length - 1] ?? null,
      },
      // Newest first = release timeline.
      models,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateOrganizationDto) {
    const slug = dto.slug ?? slugify(dto.name);
    if (!isValidSlug(slug)) throw validationError('slug', 'Could not derive a valid slug from name; provide "slug" explicitly');
    const org = await this.prisma.organization.create({
      data: { ...dto, slug },
      include: { _count: { select: { models: true } } },
    });
    return presentOrg(org);
  }

  async update(slug: string, dto: UpdateOrganizationDto) {
    for (const key of ['slug', 'name', 'type'] as const) {
      if (dto[key] === null) throw validationError(key, `${key} cannot be null`);
    }
    const org = await this.prisma.organization
      .update({ where: { slug }, data: dto, include: { _count: { select: { models: true } } } })
      .catch((e: unknown) => {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw notFound('Organization', slug);
        throw e;
      });
    return presentOrg(org);
  }

  async remove(slug: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug }, include: { _count: { select: { models: true } } } });
    if (!org) throw notFound('Organization', slug);
    if (org._count.models > 0) {
      throw conflict(`Organization '${slug}' still has ${org._count.models} model(s); delete or reassign them first`);
    }
    await this.prisma.organization.delete({ where: { id: org.id } });
  }
}

