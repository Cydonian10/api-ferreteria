# Plan de Implementacion TypeORM

## Estado actual

La aplicacion actual tiene las tablas `products`, `users`, `sales` y `sale_details` sin migraciones fuente. Sus columnas no representan el modelo objetivo: el stock y precio viven en `products`, los usuarios mezclan identidad y contacto, y el detalle de venta apunta al producto sin variante, unidad ni lote.

Por ello no debe generarse una migracion automatica desde las entidades actuales. Las migraciones se escribiran a mano, en fases, con SQL y entidades TypeORM alineadas.

## Estrategia para desarrollo

Si la base local no tiene datos que deban conservarse:

1. Borrar los datos en desarrollo.
2. Crear entidades del modelo objetivo por modulo.
3. Crear una migracion inicial manual, por ejemplo `InitialRetailSchema`.
4. Reiniciar el volumen local de PostgreSQL.
5. Ejecutar `npm run migration:run` y cargar `06-seed-data.sql` adaptado a los UUID generados.

No usar `synchronize: true`.

## Estrategia para datos que se deban preservar

Aplicar expand-contract en versiones separadas:

1. Crear las tablas nuevas borrando las antiguas.
2. Crear una variante principal y unidad principal por cada producto existente.
3. Migrar precio y stock solo como saldo inicial auditado, no como historial inventario real.
4. Migrar cada usuario a `people` y `users`; conservar el correo como credencial.
5. Convertir las ventas antiguas a ventas historicas usando la variante principal y snapshots.
6. Desplegar codigo que escribe unicamente el modelo nuevo.
7. Validar conteos, totales y muestras de ventas.
8. Archivar o eliminar tablas antiguas en una migracion posterior aprobada.
9. Ahorita preferentemente borrar todos los datos y tablas porque estamos en desarrollo

## Fases de migracion

### Fase 1: Base y seguridad

- Extension `pgcrypto`, funcion y triggers de `updated_at`.
- Empresa, tienda, almacen, ubicacion, personas, usuarios y roles.
- Datos iniciales de roles y unidades.

### Fase 2: Catalogo

- Marcas, categorias, productos, unidades por producto y variantes.
- Opciones de variante, codigos de barras, tasas de IGV y precios por unidad.
- Reemplazar el modulo `products` actual por entidades que no tengan columnas `price` ni `stock`.

### Fase 3: Compras e inventario

- Proveedores, compras y detalles.
- Lotes, saldos y movimientos de inventario.
- Implementar recepcion de compra en una unica transaccion.

### Fase 4: Caja y ventas

- Series documentales, cajas, sesiones y movimientos.
- Ventas, detalles, asignaciones de lote y pagos.
- Implementar venta atomica: bloquear stock, crear documentos, pagos y movimientos en el mismo `UnitOfWork`.

### Fase 5: Correcciones y reportes

- Devoluciones, anulaciones, conteos fisicos y ajustes.
- Alertas de stock minimo/vencimiento y reportes de margen.
- Integracion SUNAT, cuando se defina proveedor de facturacion electronica.

## Modulos NestJS sugeridos

Mantener los limites de dominio separados:

- `identity`: personas, usuarios, autenticacion y roles.
- `catalog`: marcas, categorias, productos, variantes, unidades y precios.
- `inventory`: almacenes, ubicaciones, lotes, saldos y movimientos.
- `purchasing`: proveedores y compras.
- `sales`: ventas, comprobantes, detalles, pagos y devoluciones.
- `cash`: cajas, turnos, arqueo, gastos y retiros.

Las operaciones de recepcion, venta, devolucion y cierre de caja deben usar `UnitOfWork`; no deben mezclar repositorios fuera del `EntityManager` transaccional.

## Verificacion de cada fase

- `npm run build`
- `npm run lint`
- Pruebas unitarias de handlers junto a cada handler.
- Pruebas de integracion contra PostgreSQL para restricciones, stock concurrente, FEFO, pago mixto y cierre de caja.
- `npm run migration:show` en una base vacia y una base de actualizacion controlada.
