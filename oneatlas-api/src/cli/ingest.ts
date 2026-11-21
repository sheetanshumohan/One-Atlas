/**
 * CLI ingestion using the exact same service as POST /api/v1/ingest/models.
 *
 *   npm run ingest -- prisma/data/openrouter-sample.json --provider openrouter [--dry-run]
 *
 * Accepts either a raw array of records or the OpenRouter response shape `{ "data": [...] }`.
 */
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { IngestionService } from '../ingestion/ingestion.service';
import { MAX_INGEST_BATCH } from '../ingestion/dto/ingest.dto';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const providerIdx = args.indexOf('--provider');
  const provider = providerIdx >= 0 ? args[providerIdx + 1] : undefined;
  const dryRun = args.includes('--dry-run');
  if (!file || !provider) {
    console.error('Usage: npm run ingest -- <file.json> --provider <provider-slug> [--dry-run]');
    process.exit(2);
  }

  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const records = Array.isArray(parsed) ? parsed : (parsed as { data?: unknown[] }).data;
  if (!Array.isArray(records)) throw new Error('Input must be an array or an object with a "data" array');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const service = app.get(IngestionService);
    const totals = { created: 0, updated: 0, skipped: 0, errors: 0 };
    for (let i = 0; i < records.length; i += MAX_INGEST_BATCH) {
      const report = await service.ingest({ provider, dryRun, models: records.slice(i, i + MAX_INGEST_BATCH) });
      totals.created += report.created;
      totals.updated += report.updated;
      totals.skipped += report.skipped.length;
      totals.errors += report.errors.length;
      for (const e of report.errors) console.warn(`  error  #${i + e.index} ${e.id ?? '?'}: ${e.reason}`);
      for (const s of report.skipped) console.log(`  skip   #${i + s.index} ${s.id ?? '?'}: ${s.reason}`);
    }
    console.log(`${dryRun ? '[dry-run] ' : ''}Ingested ${records.length} records into '${provider}':`, totals);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
