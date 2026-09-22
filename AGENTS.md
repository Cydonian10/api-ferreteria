# Agent Guide

## Setup and Commands

- This is one NestJS application, not a monorepo. Install with `npm install`.
- Copy `.env.example` to `.env`; `PORT`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` are required by the environment schema except `PORT`, which defaults to `3000`.
- Start PostgreSQL with `docker compose up -d`; it uses the `.env` values and persists data in the `postgres_data` volume.
- For a new database, run `npm run migration:run` before `npm run start:dev`. The database must be ready before running the migration command.
- Run the API in watch mode with `npm run start:dev`; production requires `npm run build` followed by `npm run start:prod`.
- `npm run build` compiles to `dist/` and clears the previous output.
- `npm run format` formats TypeScript in `src/` and `test/`; `npm run lint` runs type-aware Oxlint.
- Run all unit tests with `npm run test`; target one file with `npx vitest run src/path/to/file.spec.ts`.
- Run e2e tests with `npm run test:e2e`; target one with `npx vitest run --config ./vitest.config.e2e.ts test/app.e2e-spec.ts`.
- Use `npm run test:cov` for coverage and `npm run test:watch` for watch mode.
- `npm run build` is the reliable application compile check; `npx tsc --noEmit` also includes tests and currently depends on the repository's `supertest/types` setup.

## Architecture

- `src/main.ts` bootstraps the app, configures the `api` prefix, URI versioning, global validation, Pino logging, and Swagger.
- `src/app.module.ts` composes global Config, CQRS, logging, `DatabaseModule`, and the feature modules.
- `src/config/env.schema.ts` validates environment variables with Zod. `ConfigModule` is global and loads `databaseConfig`.
- `src/database/database.module.ts` owns `TypeOrmModule.forRootAsync` and is global. `database.options.ts` is the shared TypeORM options builder; entity and migration globs must remain automatic.
- `src/database/data-source.ts` is only the TypeORM CLI entrypoint. It loads `.env` and validates it because the CLI runs outside NestJS; do not import Nest's `ConfigService` there.
- `src/products/`, `src/users/`, and `src/sales/` are feature boundaries. Controllers dispatch commands or queries, handlers perform repository work, and `entities/` contains TypeORM models.
- `SalesModule` owns `Sale` and `SaleDetail`; a sale belongs to a `User` and each detail references a `Product`.
- Sale creation uses `src/common/database/unit-of-work.ts`; transactional work must use its `EntityManager`, not a regular repository.
- `ProductsService` has a direct repository path but the product controller uses CQRS handlers; preserve that CQRS path unless deliberately refactoring it.
- Authentication is not implemented; users are currently domain records associated with sales.

## Migrations

- TypeORM uses `synchronize: false`. Never enable schema synchronization as a substitute for migrations.
- `npm run migration:add -- AddSomething` builds first, compares compiled entities in `dist/`, and writes a generated migration under `src/database/migrations/`.
- `npm run migration:create -- AddSomething` creates an empty migration for hand-written SQL or data changes.
- Apply, inspect, revert, or remove migrations with `npm run migration:run`, `npm run migration:show`, `npm run migration:revert`, and `npm run migration:remove`.
- Migration commands use the compiled `dist/database/data-source.js`; keep the build step in the scripts and do not point the CLI at source TypeScript.
- `migration:remove` only removes the last source migration when it has not been applied. Revert an applied migration first.
- The initial migration includes all four entities. If a local volume was created earlier with `synchronize`, reset it with `docker compose down -v && docker compose up -d` before applying the initial migration; this destroys local database data.

## Conventions and Tests

- TypeScript uses NodeNext ESM. Keep `.js` extensions on local imports even when the source file is `.ts`.
- For bidirectional TypeORM relations, keep the decorator callback (`() => Entity`) but type the property as `Relation<Entity>` or `Relation<Entity[]>`; this avoids ESM circular-initialization errors with `emitDecoratorMetadata`.
- The global `ValidationPipe` transforms input, whitelists DTO properties, and rejects non-whitelisted properties.
- Feature controllers are `VERSION_NEUTRAL`, so routes are `/api/products`, `/api/users`, and `/api/sales`, not `/api/v1/...`; Swagger is at `/docs`.
- Add handler tests beside handlers. Vitest discovers `**/*.spec.ts`; e2e tests use `**/*.e2e-spec.ts` and `vitest.config.e2e.ts`.
- `AppController` injects `nestjs-pino` `Logger`; unit tests that instantiate it directly must provide a Logger mock.
- `src/app.controller.spec.ts` currently omits that mock, so the full unit suite has one known dependency-resolution failure until the test is updated.
