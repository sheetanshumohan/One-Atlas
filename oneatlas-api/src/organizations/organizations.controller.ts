import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { CreateOrganizationDto, ListOrganizationsQueryDto, UpdateOrganizationDto } from './dto/organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations (AI labs & companies)')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Browse AI companies and research labs' })
  list(@Query() q: ListOrganizationsQueryDto) {
    return this.orgs.list(q);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Organization profile with its model release timeline' })
  findOne(@Param('slug') slug: string) {
    return this.orgs.findBySlug(slug);
  }

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateOrganizationDto) {
    return this.orgs.create(dto);
  }

  @Patch(':slug')
  @AdminOnly()
  update(@Param('slug') slug: string, @Body() dto: UpdateOrganizationDto) {
    return this.orgs.update(slug, dto);
  }

  @Delete(':slug')
  @AdminOnly()
  @HttpCode(204)
  @ApiConflictResponse({ description: 'Organization still owns models' })
  remove(@Param('slug') slug: string) {
    return this.orgs.remove(slug);
  }
}
