import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class RootController {
  @Get()
  index() {
    return {
      name: 'OneAtlas API',
      description: 'AI model discovery & intelligence platform — models, providers, pricing, benchmarks and rankings.',
      version: 'v1',
      docs: '/docs',
      openapi: '/docs-json',
      endpoints: [
        '/api/v1/models', '/api/v1/models/compare', '/api/v1/organizations', '/api/v1/providers',
        '/api/v1/benchmarks', '/api/v1/rankings', '/api/v1/capabilities', '/api/v1/search', '/api/v1/stats', '/api/v1/health',
      ],
    };
  }
}
