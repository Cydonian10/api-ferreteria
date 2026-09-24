# SPEC 01 — Multiempresa, identidad y seguridad

> **Estado:** Aprobado
> **Depende de:** Ninguna; toma como referencia `docs/database/05-typeorm-migration-plan.md`
> **Fecha:** 2026-09-23
> **Objetivo:** Implementar una base multiempresa segura con registro de empresas, autenticación JWT, roles por tienda y aislamiento PostgreSQL mediante RLS.

## Por qué existe esta especificación

El modelo actual mezcla identidad, contacto y datos operativos en tablas heredadas de una sola empresa. Esta especificación establece los límites de tenancy y seguridad antes de implementar catálogo, inventario, compras, caja y ventas.

## Alcance

**Dentro:**

- Reiniciar el esquema de desarrollo y reemplazar las tablas heredadas por migraciones manuales con `synchronize: false`.
- Crear empresas con código público único y RUC opcional, único cuando se informa.
- Crear automáticamente la tienda, almacén y ubicación iniciales `PRINCIPAL`, `PRINCIPAL` y `GENERAL`.
- Crear el primer administrador empresarial durante el registro público.
- Mantener cuentas vinculadas a una sola empresa.
- Permitir que el correo se repita entre empresas, pero sea único dentro de cada empresa.
- Implementar login con código de empresa, correo y contraseña.
- Implementar contraseñas con hash, contraseña temporal y cambio obligatorio inicial.
- Implementar access token JWT y refresh tokens rotativos y revocables.
- Invalidar inmediatamente las sesiones de usuarios desactivados o sin acceso a una tienda.
- Crear roles empresariales y roles por tienda.
- Permitir varios administradores empresariales activos, conservando siempre al menos uno.
- Permitir asignar un usuario a varias tiendas y varios roles dentro de una tienda.
- Permitir al administrador empresarial crear tiendas, almacenes, ubicaciones y administradores de tienda.
- Permitir al administrador de tienda crear usuarios y asignar roles operativos solo en sus tiendas administradas.
- Impedir que el administrador de tienda conceda administración empresarial o promueva a otro administrador de tienda.
- Aplicar `company_id`, claves foráneas y restricciones compuestas para impedir relaciones entre empresas distintas.
- Activar políticas RLS para tablas empresariales y establecer el contexto de empresa en la misma conexión/transacción de cada consulta.
- Añadir limitación básica de intentos de registro/login y respuestas genéricas para credenciales inválidas.
- Crear pruebas unitarias, de integración PostgreSQL y e2e para aislamiento, autorización y autenticación.
- Retirar temporalmente los módulos y rutas heredadas de productos y ventas porque sus entidades actuales no corresponden al nuevo esquema.

**Fuera de alcance (para especificaciones futuras):**

- Catálogo de marcas, categorías, productos, variantes, unidades y precios.
- Proveedores, compras, lotes y movimientos de inventario.
- Cajas, sesiones de caja, ventas, pagos, devoluciones y anulaciones.
- Permisos granulares por acción o módulo.
- Verificación de correo, recuperación de contraseña por correo y servicio de correo saliente.
- Autenticación con proveedores externos.
- Superadministrador de plataforma con acceso a varias empresas.
- Base de datos separada por empresa.
- Integración SUNAT.
- Migración o conservación de datos de las tablas heredadas.

## Modelo de datos

Todas las tablas empresariales usarán UUID generado por PostgreSQL, `timestamptz`, `created_at`, `updated_at` y `deleted_at` cuando corresponda. Las tablas que representen cambios controlables tendrán `version` y referencias al usuario actor.

### Empresas y estructura operativa

```text
companies
- id uuid PK
- public_code varchar UNIQUE NOT NULL
- legal_name text NOT NULL
- trade_name text NULL
- tax_id varchar(20) NULL UNIQUE WHERE tax_id IS NOT NULL
- address text NULL
- phone varchar(30) NULL
- email text NULL
- currency_code char(3) NOT NULL DEFAULT 'PEN'
- timezone text NOT NULL DEFAULT 'America/Lima'
- created_at timestamptz NOT NULL
- updated_at timestamptz NOT NULL
- deleted_at timestamptz NULL

stores
- id uuid PK
- company_id uuid NOT NULL FK companies(id)
- code varchar(30) NOT NULL
- name text NOT NULL
- address text NULL
- phone varchar(30) NULL
- created_at timestamptz NOT NULL
- updated_at timestamptz NOT NULL
- deleted_at timestamptz NULL
- UNIQUE (company_id, code)

warehouses
- id uuid PK
- company_id uuid NOT NULL FK companies(id)
- store_id uuid NOT NULL FK stores(id)
- code varchar(30) NOT NULL
- name text NOT NULL
- created_at timestamptz NOT NULL
- updated_at timestamptz NOT NULL
- deleted_at timestamptz NULL
- UNIQUE (company_id, store_id, code)

warehouse_locations
- id uuid PK
- company_id uuid NOT NULL FK companies(id)
- warehouse_id uuid NOT NULL FK warehouses(id)
- code varchar(30) NOT NULL
- name text NOT NULL
- is_saleable boolean NOT NULL DEFAULT true
- created_at timestamptz NOT NULL
- updated_at timestamptz NOT NULL
- deleted_at timestamptz NULL
- UNIQUE (company_id, warehouse_id, code)
```

Las claves foráneas compuestas `(company_id, parent_id)` deberán asegurar que una tienda, almacén o ubicación no pueda apuntar a otra empresa.

### Personas, cuentas y roles

```text
people
- id uuid PK
- company_id uuid NOT NULL FK companies(id)
- document_type varchar(10) NULL
- document_number varchar(30) NULL
- first_name text NOT NULL
- last_name text NULL
- phone varchar(30) NULL
- email text NULL
- address text NULL
- created_at timestamptz NOT NULL
- updated_at timestamptz NOT NULL
- deleted_at timestamptz NULL

users
- id uuid PK
- company_id uuid NOT NULL FK companies(id)
- person_id uuid NOT NULL
- email text NOT NULL
- password_hash text NOT NULL
- must_change_password boolean NOT NULL DEFAULT false
- is_active boolean NOT NULL DEFAULT true
- last_login_at timestamptz NULL
- created_at timestamptz NOT NULL
- updated_at timestamptz NOT NULL
- deleted_at timestamptz NULL
- UNIQUE (company_id, id)
- UNIQUE (company_id, lower(email)) WHERE deleted_at IS NULL

roles
- code varchar(30) PK
- scope varchar(20) NOT NULL CHECK (scope IN ('company', 'store'))
- name text NOT NULL
- description text NULL

user_company_roles
- company_id uuid NOT NULL FK companies(id)
- user_id uuid NOT NULL FK users(id)
- role_code varchar(30) NOT NULL FK roles(code)
- created_at timestamptz NOT NULL
- PRIMARY KEY (company_id, user_id, role_code)

user_store_roles
- company_id uuid NOT NULL FK companies(id)
- user_id uuid NOT NULL FK users(id)
- store_id uuid NOT NULL FK stores(id)
- role_code varchar(30) NOT NULL FK roles(code)
- created_at timestamptz NOT NULL
- PRIMARY KEY (company_id, user_id, store_id, role_code)

refresh_sessions
- id uuid PK
- company_id uuid NOT NULL FK companies(id)
- user_id uuid NOT NULL FK users(id)
- token_hash text NOT NULL UNIQUE
- expires_at timestamptz NOT NULL
- revoked_at timestamptz NULL
- replaced_by_session_id uuid NULL FK refresh_sessions(id)
- created_at timestamptz NOT NULL
- last_used_at timestamptz NULL
```

Los roles iniciales serán `company_admin`, `store_admin`, `cashier`, `seller` y `warehouse`. Los roles de empresa solo podrán asignarse en `user_company_roles`; los roles de tienda solo en `user_store_roles`.

### Auditoría y protección contra abuso

```text
audit_logs
- id uuid PK
- company_id uuid NULL FK companies(id)
- actor_user_id uuid NULL FK users(id)
- entity_type varchar(50) NOT NULL
- entity_id uuid NULL
- action varchar(30) NOT NULL
- before_data jsonb NULL
- after_data jsonb NULL
- ip_address inet NULL
- created_at timestamptz NOT NULL

auth_attempts
- id uuid PK
- company_code text NULL
- email text NULL
- ip_address inet NOT NULL
- action varchar(20) NOT NULL CHECK (action IN ('register', 'login', 'refresh'))
- succeeded boolean NOT NULL
- created_at timestamptz NOT NULL
```

La limitación de intentos deberá aplicar ventanas configurables por IP y por combinación empresa/correo, sin revelar si una cuenta existe.

## Plan de implementación

1. Retirar temporalmente `src/products/` y `src/sales/` de `AppModule`, preservar `UnitOfWork`, y dejar la aplicación compilable sin las rutas heredadas.
2. Crear la migración manual inicial con `pgcrypto`, función/triggers de `updated_at`, tablas de empresas, tiendas, almacenes, ubicaciones, personas, usuarios, roles y asignaciones.
3. Añadir tablas de refresh sessions, auditoría y control de intentos, junto con índices parciales, restricciones compuestas y la regla de al menos un administrador empresarial activo.
4. Crear la migración de RLS, el rol de aplicación sin privilegio de bypass y las funciones/políticas para resolver el contexto de empresa y usuario desde variables de sesión transaccionales.
5. Crear `src/organization/` con entidades TypeORM, DTOs validados, comandos CQRS y endpoints para registro de empresa y administración de tiendas, almacenes y ubicaciones.
6. Crear `src/identity/` con entidades, repositorios, hash de contraseñas, JWT, refresh token rotativo, login, logout, cambio de contraseña y guardas de autenticación.
7. Crear el contexto de tenancy en `src/common/tenancy/`, middleware/interceptor para establecer `app.company_id` y `app.user_id` dentro de la conexión transaccional, y decoradores/guards para roles de empresa y tienda.
8. Implementar administración de usuarios y asignaciones respetando los límites: empresa administra todo su ámbito; tienda solo administra sus tiendas; el último administrador empresarial activo no puede eliminarse, desactivarse ni degradarse.
9. Integrar auditoría, invalidación inmediata de sesiones, limitación de intentos y respuestas de error que no filtren existencia de cuentas o empresas.
10. Actualizar `src/app.module.ts`, configuración de entorno, Swagger y documentación de `docs/database/` para reflejar el modelo multiempresa; ejecutar migraciones sobre una base de desarrollo vacía y cargar solo seeds globales seguros.
11. Añadir pruebas de integración PostgreSQL y e2e para registro, login, refresh, cambio obligatorio de contraseña, autorización por rol, acceso a varias tiendas y aislamiento RLS entre dos empresas.
12. Verificar con `npm run build`, `npm run lint`, `npm run test`, `npm run test:e2e` y `npm run migration:show` en una base vacía; dejar documentado el procedimiento de reinicio local.

## Criterios de aceptación

- [ ] Dos empresas pueden registrarse con el mismo correo de administrador sin conflicto.
- [ ] Un RUC informado no puede repetirse entre empresas y varias empresas sin RUC sí pueden registrarse.
- [ ] El registro crea empresa, primer administrador, tienda `PRINCIPAL`, almacén `PRINCIPAL` y ubicación `GENERAL` en una sola transacción.
- [ ] Un registro incompleto no deja filas parciales.
- [ ] El login exige código público de empresa, correo y contraseña.
- [ ] Una contraseña nunca se almacena ni se devuelve en texto plano.
- [ ] Un usuario con contraseña temporal debe cambiarla antes de acceder a operaciones protegidas.
- [ ] El refresh token se almacena únicamente como hash, rota al renovarse y puede revocarse.
- [ ] Desactivar un usuario revoca sus refresh sessions y bloquea inmediatamente sus operaciones protegidas.
- [ ] Retirar a un usuario de una tienda bloquea inmediatamente sus operaciones en esa tienda.
- [ ] Un usuario puede tener varios roles en una tienda y asignaciones en varias tiendas de su empresa.
- [ ] Un administrador empresarial puede gestionar todas las tiendas de su empresa.
- [ ] Un administrador de tienda solo puede gestionar usuarios y roles en sus tiendas asignadas.
- [ ] Un administrador de tienda no puede conceder `company_admin` ni `store_admin`.
- [ ] El sistema impide dejar una empresa sin ningún administrador empresarial activo.
- [ ] Las entidades empresariales incluyen `company_id` y sus claves foráneas compuestas impiden mezclar empresas.
- [ ] Una consulta sin filtro explícito de empresa no puede leer ni modificar datos de otra empresa por efecto de RLS.
- [ ] El contexto RLS se establece en la misma conexión/transacción que ejecuta la consulta.
- [ ] El rol de aplicación no puede omitir RLS mediante privilegios de propietario o `BYPASSRLS`.
- [ ] Los errores de login no revelan si existe la empresa, el correo o la combinación de credenciales.
- [ ] Los intentos repetidos de login y registro quedan limitados por ventana de IP e identificador.
- [ ] Las rutas heredadas de productos y ventas no se exponen mientras sus módulos nuevos no estén implementados.
- [ ] `synchronize` permanece desactivado y las migraciones son ejecutables desde `dist/database/data-source.js`.
- [ ] `npm run build`, `npm run lint`, `npm run test`, `npm run test:e2e` y `npm run migration:show` terminan correctamente en una base limpia.

## Decisiones tomadas y descartadas

- **Sí:** una cuenta pertenece a una sola empresa. Simplifica el contexto de tenancy y evita ambigüedad al autorizar operaciones.
- **No:** membresías de una misma cuenta en varias empresas. Podrán definirse en otra especificación si el negocio lo requiere.
- **Sí:** PostgreSQL compartido con `company_id` y RLS. Reduce infraestructura y proporciona una segunda barrera frente a errores de filtrado en la aplicación.
- **No:** base de datos separada por empresa. No se necesita en esta etapa.
- **Sí:** código público elegido por la empresa para iniciar sesión. El RUC permanece opcional y no se usa como requisito de autenticación.
- **Sí:** JWT con access token y refresh token rotativo. Permite sesiones revocables sin persistir el access token completo.
- **No:** cookies HttpOnly en este primer corte. El cliente usará Bearer y refresh token; CSRF y cookie policy quedan para una decisión posterior.
- **Sí:** roles por tienda y varios roles simultáneos. Permite que una persona sea, por ejemplo, vendedor y cajero en una sucursal.
- **Sí:** `company_admin` con acceso a todas las tiendas y `store_admin` con ámbito local. Evita inventar un superadmin de plataforma.
- **No:** permisos granulares. Los roles iniciales son suficientes para el primer corte y los permisos se definirán cuando existan los módulos operativos.
- **Sí:** registro público sin verificación de correo. Permite operar sin infraestructura de correo; verificación y recuperación quedan fuera.
- **Sí:** contraseña temporal entregada fuera de la API y cambio obligatorio. La API nunca devuelve secretos ni requiere correo en esta etapa.
- **Sí:** eliminar datos y tablas actuales de desarrollo. El proyecto aún no tiene datos que deban preservarse y el modelo heredado no es compatible.
- **No:** migración de `products`, `sales` y `users` heredados. Se implementará el modelo objetivo desde cero.

## Riesgos

| Riesgo                                                                        | Mitigación                                                                                                                  |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Una conexión reutilizada conserva el contexto RLS de otra petición            | Establecer variables con configuración transaccional (`SET LOCAL`/`set_config(..., true)`) y probar reutilización del pool. |
| El propietario de una tabla puede eludir RLS                                  | Ejecutar la API con un rol separado que no sea propietario y no tenga `BYPASSRLS`; verificarlo en integración.              |
| Una relación sin `company_id` puede cruzar empresas                           | Duplicar `company_id` en tablas empresariales y usar FKs compuestas, además de pruebas negativas.                           |
| Revocación inmediata no se refleja en un JWT ya emitido                       | Validar estado y autorización contra la base en cada request protegido; usar access tokens de vida corta.                   |
| Dos administradores intentan eliminar al último administrador simultáneamente | Bloquear la empresa o membresías relevantes dentro de una transacción y comprobar el mínimo antes de confirmar.             |
| El registro/login puede ser abusado para enumerar empresas o cuentas          | Errores genéricos, rate limiting por IP/identificador y auditoría de intentos.                                              |
| Las rutas heredadas siguen siendo llamadas por clientes antiguos              | Retirarlas explícitamente y documentar que catálogo y ventas se reintroducirán mediante specs posteriores.                  |

## Lo que **no** está en esta especificación

- Catálogo, inventario, compras, ventas, caja y reportes.
- Membresía de una cuenta en varias empresas.
- Superadministrador de plataforma.
- Permisos granulares.
- Verificación o recuperación por correo.
- Proveedor externo de identidad.
- Conservación o migración de datos de desarrollo heredados.
