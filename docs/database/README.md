# Diseno de Base de Datos

Este directorio define el modelo objetivo para una tienda con un almacen inicial. Es una fuente de diseno y no se ejecuta automaticamente como migracion.

## Alcance confirmado

- Catalogo con marcas, categorias, productos y variantes con SKU.
- Unidades por producto y conversiones a una unidad principal con factor `1`.
- Venta de cantidades fraccionarias, por ejemplo `0.250 kg` o `1.5 L`.
- Codigos de barras opcionales para una variante o una presentacion de venta.
- Proveedores, compras, lotes, vencimientos e inventario por almacen y ubicacion.
- Usuarios internos con autenticacion y roles `admin`, `cashier`, `seller` y `warehouse`.
- Caja por turno, pagos en efectivo o Yape, gastos, retiros y arqueo.
- Boleta, factura y nota de venta; precios con IGV incluido.

## Archivos

- `01-decisions.md`: limites y decisiones funcionales.
- `02-erd.mmd`: diagrama Mermaid del modelo.
- `03-schema-postgresql.sql`: DDL PostgreSQL de referencia.
- `04-indexes-and-rules.md`: indices, validaciones y reglas transaccionales.
- `05-typeorm-migration-plan.md`: orden seguro de implementacion sobre la aplicacion actual.
- `06-seed-data.sql`: datos de catalogo iniciales.

## Convenciones

- Motor: PostgreSQL 16.
- ORM objetivo: TypeORM.
- Identificadores nuevos: UUID generados por PostgreSQL.
- Importes: `numeric(14,2)` en PEN e incluyen IGV.
- Cantidades y factores: `numeric(14,4)` para admitir peso y volumen fraccionario.
- Fechas y eventos: `timestamptz`; la operacion se muestra en `America/Lima`.
- Documentos, pagos y movimientos de inventario son inmutables. Se corrigen con devoluciones, anulaciones o movimientos inversos; no se eliminan.

## Orden de lectura

1. Revisar `01-decisions.md` y el ERD.
2. Validar las reglas de `04-indexes-and-rules.md`.
3. Implementar las fases indicadas en `05-typeorm-migration-plan.md`.
