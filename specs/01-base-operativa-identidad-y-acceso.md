# SPEC 01 — Base operativa, identidad y acceso

> **Status:** Aprobado
> **Depends on:** Ninguna
> **Date:** 2026-09-23
> **Objective:** Implementar la fase 1 del modelo comercial con una sola empresa, estructura de tienda y almacén, personas, usuarios y roles, inicialización única y acceso autenticado.

## Contexto

`docs/database/01-decisions.md`, `03-schema-postgresql.sql`, `04-indexes-and-rules.md` y `05-typeorm-migration-plan.md` son la referencia del modelo. La aplicación actual usa entidades incompatibles para usuarios, productos y ventas. Esta spec parte de una base de desarrollo vacía y convierte únicamente la fase 1 en migración manual y módulos NestJS separados.

## Alcance

**Incluye:**

- Migración TypeORM manuscrita de `pgcrypto`, `set_updated_at`, tablas, restricciones, índices y triggers de la fase 1; `synchronize` permanece desactivado.
- Una sola empresa por instalación, con tiendas, almacenes y ubicaciones; personas, usuarios, roles y asignaciones de roles.
- Roles iniciales `admin`, `cashier`, `seller` y `warehouse` sembrados de forma repetible.
- Endpoint `POST /api/setup` de un solo uso para crear en una transacción empresa, tienda, almacén, ubicación, persona y primer usuario `admin`.
- API CQRS de gestión y consulta para los recursos de fase 1, con filtros y paginación.
- Inicio de sesión por email y contraseña, JWT Bearer, control de roles, baja lógica y administración de contraseñas.
- Sustitución de `src/users/` por `src/identity/` y retirada del código heredado de `src/products/` y `src/sales/`, incluidas sus entidades y rutas incompatibles.

**Fuera de alcance (specs posteriores):**

- Catálogo y `units_of_measure`, precios, stock, compras, lotes, caja, ventas y datos de `docs/database/06-seed-data.sql` distintos de los cuatro roles.
- Registro público, recuperación por correo, refresh tokens, permisos finos, multiempresa operativa y políticas RLS.
- Conservación o migración de datos del esquema anterior; no ejecutar el DDL de referencia directamente como migración.

## Modelo de datos

Crear una entidad TypeORM por archivo bajo `src/organization/entities/` (`company.entity.ts`, `store.entity.ts`), `src/inventory/entities/` (`warehouse.entity.ts`, `warehouse-location.entity.ts`) y `src/identity/entities/` (`person.entity.ts`, `user.entity.ts`, `role.entity.ts`, `user-role.entity.ts`). Cada entidad mapea nombres de tabla y columna de `docs/database/03-schema-postgresql.sql`, secciones `companies` a `user_roles`, sin columnas extra de la aplicación antigua:

- `companies`: UUID `id`, razón social `legal_name`, nombre comercial, RUC/identificador `tax_id` único, contacto, `currency_code = PEN`, `timezone = America/Lima` y fechas `created_at`, `updated_at`, `deleted_at`. La operación permite una sola empresa por instalación, incluso si se desactiva.
- `stores`: UUID, `company_id`, `code` único por empresa, nombre, contacto y fechas; `warehouses`: UUID, `store_id`, código único por tienda, nombre y fechas; `warehouse_locations`: UUID, `warehouse_id`, código único por almacén, nombre, `is_saleable` y fechas.
- `people`: UUID, tipo y número de documento opcionales como pareja, nombre, apellido y contacto, fechas y unicidad parcial de documento para registros no eliminados.
- `users`: UUID, `person_id` único, email único sin distinguir mayúsculas entre registros no eliminados, `password_hash`, `is_active`, `last_login_at` y fechas. La persona guarda información personal; el usuario, credenciales y estado.
- `roles`: `code` como PK, nombre, descripción y fecha de creación; `user_roles`: PK compuesta `(user_id, role_code)` y fecha. La asignación a usuarios solo acepta los cuatro códigos sembrados.
- `installation_state`: registro singleton con clave fija `id = 1` y `completed_at` para cerrar permanentemente el setup; la migración crea la tabla y su fila inicial, y el setup marca esa fila completada dentro de su transacción. Esta estructura no figura en el DDL de referencia y existe exclusivamente para garantizar el uso único del endpoint.

Usar UUID generados por PostgreSQL, `timestamptz`, claves foráneas y restricciones de la referencia. El trigger `set_updated_at` actualiza las seis tablas con `updated_at` (`companies`, `stores`, `warehouses`, `warehouse_locations`, `people`, `users`). No hay borrado físico desde la API.

## Contrato de API

- `POST /api/setup` recibe `{ company, store, warehouse, location, admin: { person, email, password } }` y exige un secreto de instalación en cabecera, configurado por entorno. Solo funciona si no hay empresa ni usuarios y `installation_state` no está completado; devuelve los UUID creados, nunca credenciales. Una petición con secreto inválido devuelve 401; una instalación ya completada devuelve 409; una falla revierte todo. Bloquear la fila singleton en la transacción para serializar peticiones simultáneas. Nunca reabrir setup por bajas lógicas.
- `POST /api/auth/login` recibe email y contraseña, devuelve JWT Bearer válido 15 minutos con identificador de usuario; fallo de credenciales o usuario inactivo devuelve 401. `JWT_SECRET` es obligatorio en la configuración. En cada petición protegida se comprueban estado activo, ausencia de baja lógica y roles vigentes en la base; un token previo deja de dar acceso tras una baja o revocación de rol.
- `POST /api/auth/change-password` requiere usuario autenticado, contraseña actual y nueva contraseña. `PUT /api/users/:id/password` permite a `admin` restablecer la contraseña. Hash `Argon2id` al crear o modificar; nunca devolver ni registrar contraseñas o hashes.
- `GET /api/companies`, `/api/stores`, `/api/warehouses`, `/api/warehouse-locations`, `/api/people`, `/api/users` y `/api/roles` requieren autenticación. Los primeros seis ofrecen `GET /:id`, `POST`, `PATCH /:id` y `DELETE /:id` (baja lógica); `roles` es catálogo de solo lectura. `POST /api/companies` devuelve 409 si ya existe la única empresa de la instalación. `PUT /api/users/:id/roles` reemplaza atómicamente la lista de códigos, exclusiva de admin; el alta de usuario acepta esa lista. La baja de un padre con descendientes no eliminados o persona con usuario no eliminado devuelve 409, sin cascadas.
- `admin` puede escribir en esos recursos; cualquier usuario autenticado puede leer. `POST /api/setup` y login son las únicas operaciones públicas de esta fase.
- Listados paginados con `page` y `limit` (por defecto `1` y `20`, máximo `100`), respuesta `{ data, page, limit, total }`, orden estable `created_at, id`, búsqueda `q` sin distinguir mayúsculas sobre nombre/código/email según recurso y filtros de pertenencia `companyId`, `storeId`, `warehouseId` cuando correspondan. Excluir bajas lógicas; usuarios admiten además `isActive`. Parámetros inválidos producen 400.
- Rutas sin versión bajo el prefijo `/api`. Validar cuerpos y parámetros con el mecanismo existente de NestJS; UUID inválidos producen 400 y recursos inexistentes 404.

## Plan de implementación

1. Preparar `.env.example` y esquema Zod para `JWT_SECRET` y secreto de setup; retirar de `AppModule` y de la carga automática de entidades el código obsoleto de `products`, `sales` y `users` mientras se introducen los módulos nuevos. Mantener el arranque de la aplicación sin rutas heredadas que fallen por tablas inexistentes.
2. Crear bajo `src/database/migrations/` una migración manual de fase 1 que establezca extensión, función, tablas, índices, triggers y roles; su reversión elimina solo los objetos creados en esta fase. Mantener los globs automáticos de entidades/migraciones y `synchronize: false`.
3. Incorporar `OrganizationModule`, `InventoryModule` e `IdentityModule` en `src/app.module.ts`, con entidades y relaciones en archivos individuales; agregar `src/identity/auth/` para JWT y hash, `src/identity/setup/` para instalación. Ningún archivo monolítico concentra todos los recursos.
4. Implementar setup atómico y su bloqueo de un solo uso; probar secreto, concurrencia, rollback y datos iniciales antes de habilitar escrituras administrativas.
5. Implementar login, validación de JWT, guardas de autenticación/rol y cambios de contraseña; exponer solo las rutas administrativas cuando la autorización esté activa.
6. Añadir controllers, DTO, commands/queries y handlers por recurso dentro de su módulo; implementar altas, consultas, edición, bajas lógicas, reglas de dependencias, asignación de roles, filtros y paginación.
7. Ajustar Swagger y pruebas de handlers junto a cada handler; incluir pruebas de integración PostgreSQL para migración, restricciones, setup concurrente, autenticación y autorización. Comprobar `npm run build`, `npm run lint` y `npm run migration:show` sobre una base vacía.

## Criterios de aceptación

- [ ] Con volumen de desarrollo reiniciado, `npm run migration:run` crea exactamente las tablas de fase 1, roles, índices y triggers sin activar sincronización; `npm run migration:show` marca la migración como aplicada.
- [ ] Una segunda ejecución de la migración no duplica roles y una nueva base puede arrancar con `npm run start:dev` sin tablas heredadas.
- [ ] Dos llamadas concurrentes válidas a setup no crean dos instalaciones; solo una confirma, la otra devuelve 409; una petición fallida no deja datos parciales.
- [ ] Setup rechaza secreto incorrecto y no acepta repetición tras completarse, aunque se desactiven registros.
- [ ] Login entrega un token de 15 minutos únicamente a usuarios activos con contraseña correcta; el token no permite operaciones tras baja lógica o pérdida de rol.
- [ ] Todos los recursos indicados responden a alta, lectura, edición y baja lógica según el contrato; solo admin escribe, con 401/403 para solicitudes sin identidad/sin permiso.
- [ ] La baja de un padre con dependientes activos devuelve 409 y preserva los registros.
- [ ] Los listados excluyen bajas, respetan búsqueda/filtros/paginación y devuelven `data`, `page`, `limit` y `total` coherentes.
- [ ] Ninguna respuesta o log incluye contraseñas o `password_hash`; los cambios de contraseña invalidan la contraseña anterior.
- [ ] `npm run build`, `npm run lint` y las pruebas correspondientes a handlers e integración PostgreSQL de esta fase pasan.

## Decisiones

- **Sí:** fase 1 en una spec, con tres módulos separados y entidades/handlers por archivo; permite implementar y verificar cada dominio sin amontonarlo en un solo archivo.
- **Sí:** eliminar módulos heredados de productos y ventas y sustituir `users` por `identity`; sus tablas y rutas anteriores no corresponden al modelo objetivo.
- **Sí:** resetear el entorno de desarrollo; se descarta expand-contract porque no hay datos locales que conservar.
- **Sí:** endpoint de setup transaccional protegido por secreto y marca persistida; se descarta el alta pública de admin y el bootstrap exclusivamente manual.
- **Sí:** JWT corto, hash Argon2id, lectura autenticada y escritura de admin; se posponen refresh tokens y permisos finos.
- **Sí:** una sola empresa por instalación; se descarta permitir una segunda aunque el esquema conserve relaciones para un diseño futuro.
- **Sí:** sembrar roles en fase 1 y diferir unidades a catálogo; evita adelantar tablas ajenas a esta fase.
- **Sí:** baja lógica sin cascadas y rechazo 409 si existen dependientes; se descarta borrar filas con historial potencial.

## Riesgos

| Riesgo                                                             | Mitigación                                                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Reset destruye datos locales previos                               | Confirmar que se trata de desarrollo y reiniciar solo el volumen local antes de aplicar la migración. |
| Dos peticiones iniciales compiten por crear el admin               | Bloqueo transaccional del registro singleton y comprobación de instalación completada.                |
| Un JWT sigue firmado después de revocar acceso                     | Comprobar usuario y roles vigentes en cada petición protegida.                                        |
| El catálogo y las ventas antiguos dependen de entidades eliminadas | Retirar módulos, rutas, handlers y referencias heredadas; reconstruirlos en sus respectivas fases.    |

## Lo que **no** incluye esta spec

- Catálogo, inventario con saldos/lotes, compras, ventas, caja ni facturación.
- Multiempresa real, refresh tokens, recuperación de contraseñas por correo ni migración de datos heredados.
