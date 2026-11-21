import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { validationError } from '../common/errors';
import { isValidSlug, slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCapabilityDto } from './dto/capability.dto';

@Injectable()
export class CapabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.capability.findMany({
      include: { _count: { select: { models: true } } },
      orderBy: { slug: 'asc' },
    });
    return { data: rows.map(({ _count, ...c }) => ({ ...c, modelCount: _count.models })) };
  }

  async create(dto: CreateCapabilityDto) {
    const slug = dto.slug ?? slugify(dto.name);
    if (!isValidSlug(slug)) throw validationError('slug', 'Could not derive a valid slug from name; provide "slug" explicitly');
    const c = await this.prisma.capability.create({ data: { ...dto, slug } });
    return { ...c, modelCount: 0 };
  }
}

@ApiTags('Capabilities')
@Controller('capabilities')
export class CapabilitiesController {
  constructor(private readonly service: CapabilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Capability catalogue (filter values for /models?capability=)' })
  list() {
    return this.service.list();
  }

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateCapabilityDto) {
    return this.service.create(dto);
  }
}

@Module({ controllers: [CapabilitiesController], providers: [CapabilitiesService] })
export class CapabilitiesModule {}
