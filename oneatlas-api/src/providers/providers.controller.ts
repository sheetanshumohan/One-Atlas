import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { CreateProviderDto, ListProvidersQueryDto, UpdateProviderDto } from './dto/provider.dto';
import { ProvidersService } from './providers.service';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'Browse inference providers' })
  list(@Query() q: ListProvidersQueryDto) {
    return this.providers.list(q);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Provider detail with every model it serves and its pricing' })
  findOne(@Param('slug') slug: string) {
    return this.providers.findBySlug(slug);
  }

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateProviderDto) {
    return this.providers.create(dto);
  }

  @Patch(':slug')
  @AdminOnly()
  update(@Param('slug') slug: string, @Body() dto: UpdateProviderDto) {
    return this.providers.update(slug, dto);
  }

  @Delete(':slug')
  @AdminOnly()
  @HttpCode(204)
  remove(@Param('slug') slug: string) {
    return this.providers.remove(slug);
  }
}
