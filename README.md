# NestJS CQRS

API de aprendizaje construida con NestJS 12, CQRS, TypeORM, PostgreSQL y migraciones. El proyecto usa módulos por funcionalidad y mantiene las operaciones de venta dentro de una transacción.

## Requisitos

- Node.js y npm.
- Docker y Docker Compose para PostgreSQL.

## Configuración local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Crea el archivo de entorno:

   ```bash
   cp .env.example .env
   ```

   Variables disponibles:

   ```dotenv
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=nestjs_cqrs
   ```

3. Inicia PostgreSQL:

   ```bash
   docker compose up -d
   docker compose ps
   ```

4. En una base nueva, aplica las migraciones:

   ```bash
   npm run migration:run
   ```

5. Levanta la API:

   ```bash
   npm run start:dev
   ```

La API queda disponible en `http://localhost:3000`. La documentación Swagger está en `http://localhost:3000/docs`.

### Reiniciar la base local

El volumen de PostgreSQL persiste los datos. Para eliminarlo y crear una base vacía, ejecuta este comando destructivo:

```bash
docker compose down -v
docker compose up -d
npm run migration:run
```

Esto es necesario si la base fue creada anteriormente con `synchronize` y la migración inicial intenta crear tablas que ya existen.

## Arquitectura

La aplicación es un único proyecto NestJS con `src/main.ts` como punto de entrada.

```text
src/
├── main.ts                 # Bootstrap, prefijo, versionado, pipes y Swagger
├── app.module.ts           # Composición de módulos globales y features
├── config/                 # Configuración y esquema Zod del entorno
├── database/               # DatabaseModule, opciones TypeORM y DataSource del CLI
├── common/database/        # UnitOfWork transaccional
├── products/               # Productos, DTOs, entidad y handlers CQRS
├── users/                  # Usuarios, DTOs, entidad y handlers CQRS
└── sales/                  # Ventas, detalles, entidad y handlers CQRS
```

El flujo normal de una petición es:

```text
HTTP -> Controller -> CommandBus/QueryBus -> Handler -> Repository TypeORM
```

La creación de ventas usa `UnitOfWork`, que inicia una transacción y entrega un `EntityManager` transaccional a la operación. `Sale` pertenece a `User` y `SaleDetail` referencia a `Sale` y `Product`.

`DatabaseModule` es global y configura TypeORM. Las entidades y migraciones se descubren mediante globs en `src/database/database.options.ts`; no es necesario registrar cada entidad manualmente. `synchronize` está desactivado.

La validación del entorno y de los payloads HTTP se realiza con Zod. `StandardSchemaValidationPipe` se registra globalmente y cada body declara su esquema mediante `@Body({ schema })`. El `DataSource` del CLI también ejecuta el esquema de entorno porque se carga fuera del ciclo de vida de NestJS.

## Rutas principales

Los controladores de features usan `VERSION_NEUTRAL`, por lo que las rutas no incluyen `/v1` aunque el versionado URI esté habilitado.

| Método | Ruta | Operación |
| --- | --- | --- |
| `GET` | `/api/products` | Listar productos |
| `POST` | `/api/products` | Crear producto |
| `PATCH` | `/api/products/:id` | Actualizar producto |
| `GET` | `/api/users` | Listar usuarios |
| `POST` | `/api/users` | Crear usuario |
| `GET` | `/api/sales` | Listar ventas |
| `POST` | `/api/sales` | Crear venta |

## Migraciones

Las migraciones son el mecanismo de modificación del esquema. TypeORM usa `synchronize: false` tanto en Nest como en el CLI.

### Comandos

Genera una migración a partir de cambios en las entidades:

```bash
npm run migration:add -- AddProductField
```

El comando compila el proyecto, compara las entidades compiladas y crea el archivo en `src/database/migrations/`.

Crea una migración vacía para SQL o cambios de datos manuales:

```bash
npm run migration:create -- SeedInitialData
```

Consulta y ejecuta migraciones:

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
```

`migration:revert` revierte solamente la última migración aplicada. Para eliminar el último archivo fuente no aplicado:

```bash
npm run migration:remove
```

El CLI usa `dist/database/data-source.js`, por eso los comandos que inspeccionan o ejecutan migraciones compilan antes. `src/database/data-source.ts` carga `.env` directamente y valida las variables porque el CLI no pasa por `ConfigModule`.

## Desarrollo y pruebas

```bash
npm run format
npm run lint
npm run build
npm run test
npm run test:e2e
npm run test:cov
```

Para ejecutar una prueba concreta:

```bash
npx vitest run src/products/commands/create-product/create-product.handler.spec.ts
npx vitest run --config ./vitest.config.e2e.ts test/app.e2e-spec.ts
```

Las pruebas e2e necesitan las variables de `.env` y una instancia de PostgreSQL disponible. Los tests unitarios que creen `AppController` directamente deben proporcionar un mock de `nestjs-pino` `Logger`.

El test actual de `src/app.controller.spec.ts` todavía no registra ese mock, por lo que `npm run test` reporta una falla conocida de inyección de dependencias.
