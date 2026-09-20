# Agent Guide

## Commands

- Install dependencies with `npm install`.
- Run the API with `npm run start:dev`; it listens on `PORT` (default `3000`).
- Build with `npm run build`; Nest emits the application to `dist/` and clears the output first.
- Run formatting with `npm run format`; it only formats TypeScript under `src/` and `test/`.
- Run lint with `npm run lint` (Oxlint, type-aware, over `src/` and `test/`). There is no separate package script for typechecking; use `npx tsc --noEmit` when needed.
- Run unit tests with `npm run test`; target one file with `npx vitest run path/to/file.spec.ts`.
- Run end-to-end tests with `npm run test:e2e`; target one e2e file with `npx vitest run --config ./vitest.config.e2e.ts test/app.e2e-spec.ts`.
- Use `npm run test:cov` for coverage and `npm run test:watch` for watch mode.

## Local Setup

- Copy `.env.example` to `.env` and set `PORT`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` before starting the app or running e2e tests.
- Start the local database with `docker compose up -d`; Compose substitutes the database variables from `.env` and persists data in the `postgres_data` volume.
- `AppModule` enables TypeORM `synchronize: true` intentionally for local learning; do not treat this as a production migration strategy.

## Architecture

- This is a single NestJS application rooted at `src/main.ts`, not a monorepo. `src/app.module.ts` wires global configuration, logging, CQRS, PostgreSQL/TypeORM, and feature modules.
- `src/products/`, `src/users/`, and `src/sales/` are feature boundaries: controllers expose HTTP, `dto/` validates input, `entities/` defines TypeORM models, and `commands/` plus `queries/` contain CQRS messages and handlers.
- `SalesModule` owns both `Sale` and `SaleDetail`; details are not a separate module because they only exist within a sale. `Sale` belongs to a `User`, and each detail references a `Product`.
- Authentication is intentionally not implemented yet; users are currently domain records used to associate sales.
- Controllers dispatch through `CommandBus`/`QueryBus`; handlers own repository reads/writes. For example, `POST /api/products` dispatches `CreateProductCommand` to `CreateProductHandler`, while `GET /api/products` dispatches `FindAllProductsQuery` to `FindAllProductsHandler`.
- `ProductsService` currently contains the direct `findAll` repository path but is not used by the controller; preserve the CQRS path when changing product endpoints unless the design is intentionally being refactored.
- Routes use the global `api` prefix and URI versioning (`v1` by default); `ProductsController` is version-neutral, so product routes are `/api/products` rather than `/api/v1/products`. Swagger is available at `/docs`.

## Conventions

- TypeScript uses NodeNext ESM; local imports include the `.js` extension even though source files are `.ts`.
- Keep validation behavior in mind: the global `ValidationPipe` enables transformation, whitelisting, and rejection of non-whitelisted fields.
- Add or update handler unit tests beside the handler. Vitest discovers `**/*.spec.ts`; e2e tests use `**/*.e2e-spec.ts` and the separate e2e config.
