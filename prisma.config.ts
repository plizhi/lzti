import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, env } from '@prisma/config';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
});
