import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminApiKeyGuard } from '../guards/admin-api-key.guard';

export const ADMIN_SECURITY = 'admin-api-key';

/** Marks a route as an admin write operation (requires the admin API key). */
export const AdminOnly = () =>
  applyDecorators(
    UseGuards(AdminApiKeyGuard),
    ApiSecurity(ADMIN_SECURITY),
    ApiUnauthorizedResponse({ description: 'Missing API key' }),
    ApiForbiddenResponse({ description: 'Invalid API key / writes disabled' }),
  );
