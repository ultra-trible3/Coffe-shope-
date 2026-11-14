/**
 * Integration suites run against a dedicated database. Point Prisma at
 * `TEST_DATABASE_URL` before `env.ts` is imported by any module.
 */
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
