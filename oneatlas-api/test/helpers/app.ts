import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { APP_CONFIG, AppConfig, loadConfig } from '../../src/config/env';
import { PrismaService } from '../../src/prisma/prisma.service';

export const ADMIN_KEY = 'test-admin-key';
export const auth = { 'x-api-key': ADMIN_KEY };

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  close: () => Promise<void>;
}

/** Boots the real AppModule through the same configureApp() used in production. */
export async function createTestApp(overrides: Partial<AppConfig> = {}): Promise<TestApp> {
  const config: AppConfig = { ...loadConfig(), adminApiKey: ADMIN_KEY, trustedClientKey: undefined, ...overrides };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error'] });
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma, close: () => app.close() };
}
