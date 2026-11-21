import { INestApplication, RequestMethod } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { ADMIN_SECURITY } from './common/decorators/admin.decorator';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CacheControlInterceptor } from './common/interceptors/cache-control.interceptor';
import { createValidationPipe } from './common/validation';
import { APP_CONFIG, AppConfig } from './config/env';

export const API_PREFIX = 'api/v1';

/** Shared by main.ts and the e2e tests so tests exercise the exact production pipeline. */
export function configureApp(app: NestExpressApplication): INestApplication {
  const config = app.get<AppConfig>(APP_CONFIG);

  app.set('trust proxy', 1); // correct client IPs behind Render/Railway/Vercel proxies (rate limiting)
  app.set('etag', 'weak');
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false })); // CSP off so Swagger UI assets load
  app.use(compression());
  app.useBodyParser('json', { limit: '2mb' });
  app.enableCors({
    origin: config.corsOrigins === '*' ? true : config.corsOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-Client-Key', 'X-Request-Id', 'If-None-Match'],
    exposedHeaders: ['X-Request-Id', 'ETag'],
    maxAge: 600,
  });

  app.setGlobalPrefix(API_PREFIX, { exclude: [{ path: '/', method: RequestMethod.GET }] });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new CacheControlInterceptor());
  app.enableShutdownHooks();

  const doc = new DocumentBuilder()
    .setTitle('OneAtlas API')
    .setDescription(
      'AI model discovery & intelligence platform. Public read API for models, organizations, providers, pricing, ' +
        'benchmarks and rankings. Write endpoints require the admin API key in the `x-api-key` header.\n\n' +
        'All prices are **USD per 1M tokens**. Errors use a consistent envelope: ' +
        '`{ statusCode, error: { code, message, details? }, path, timestamp, requestId }`.',
    )
    .setVersion('1.0.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, ADMIN_SECURITY)
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, doc), { jsonDocumentUrl: 'docs-json' });

  return app;
}
