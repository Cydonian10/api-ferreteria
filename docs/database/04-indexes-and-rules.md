# Indices y Reglas Transaccionales

## Indices principales

El DDL incluye los indices necesarios para claves foraneas y consultas frecuentes. Los principales patrones son:

| Consulta | Indice |
|---|---|
| Buscar articulo por SKU | `product_variants_sku_uq` |
| Escanear codigo de barras | `product_barcodes_barcode_uq` |
| Catalogo activo por categoria o marca | indices parciales de `products` |
| Precio vigente por variante y unidad | `variant_unit_prices_current_uq` |
| Stock vendible FEFO | `inventory_lots_fefo_idx` y `inventory_balances_lot_location_uq` |
| Historial de inventario | `inventory_movements_lot_created_idx` |
| Ventas por tienda, fecha o cliente | indices de `sales` |
| Vencimientos proximos | `inventory_lots_expiration_idx` |
| Sesion abierta de caja | indices parciales de `cash_sessions` |

No se agregan indices a cada columna: tienen costo de escritura y deben responder a una consulta concreta.

## Reglas que aplica la base de datos

- Claves foraneas protegen relaciones obligatorias.
- Los SKU, codigos de barras y numeracion documental son unicos.
- Los factores y cantidades deben ser mayores que cero cuando corresponda.
- El precio, impuesto y descuentos no pueden ser negativos.
- Una sola unidad principal por producto tiene factor `1`.
- Una sola sesion abierta existe por caja y por cajero.
- Yape exige una referencia de la operacion.
- Los registros maestros se desactivan con `deleted_at`; no se borran si tienen historial.

## Reglas que aplica el servicio dentro de una transaccion

Estas reglas requieren varias filas y deben ejecutarse mediante `UnitOfWork` usando el mismo `EntityManager`:

1. Validar que la unidad seleccionada pertenece al producto de la variante.
2. Calcular `quantity_base = quantity * factor_to_primary` y guardar ambos valores como snapshot.
3. Bloquear los saldos de lote elegidos con `SELECT ... FOR UPDATE` antes de descontar inventario.
4. Elegir lotes no vencidos con saldo positivo, ordenados por `expires_at NULLS LAST, received_at, id` (FEFO).
5. Rechazar una venta si la suma asignada en `sale_item_lots` no coincide con la cantidad base de su detalle.
6. Crear en la misma transaccion: venta, detalles, asignaciones de lote, movimientos de inventario, pagos y movimiento de caja si es efectivo.
7. Mantener el total de pagos igual al total de una venta `completed` antes de confirmarla.
8. Obtener el siguiente correlativo bloqueando la fila de `document_series` antes de incrementar `next_number`.
9. Al cerrar caja, calcular el esperado desde apertura y movimientos; nunca aceptar un valor escrito por el cliente como esperado.

## Controles operativos recomendados

- Alertar cuando `available_quantity` sea menor o igual a `minimum_stock` de la variante.
- Alertar lotes que vencen en 30 dias y bloquear vencidos.
- Registrar un motivo y usuario para ajustes de inventario, gastos y retiros de caja.
- Usar el campo `version` al actualizar catalogo para evitar sobrescribir cambios concurrentes.
- Auditar altas, cambios de precio, ajustes, anulaciones y cierres de caja.
- Ejecutar respaldo de PostgreSQL y probar una restauracion antes de operar con ventas reales.
