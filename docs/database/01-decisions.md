# Decisiones de Dominio

## Estructura operativa

Se crea una empresa, una tienda, un almacen y una ubicacion inicial. Aunque al inicio solo existan uno de cada uno, esta separacion evita redisenar inventario y comprobantes al abrir una segunda sucursal.

`warehouse_locations` representa posiciones fisicas como `MOSTRADOR`, `DEPOSITO` o `VITRINA`. El saldo se controla por lote y ubicacion.

## Catalogo, variantes y unidades

- Un `product` contiene la informacion comun: nombre, marca, categoria y unidad principal.
- Un `product_variant` es el articulo inventariable y vendible: tiene SKU propio y puede representar color, sabor, talla o modelo.
- Las opciones se normalizan con `product_options`, `option_values` y `variant_option_values`.
- `product_units` define las presentaciones permitidas para un producto. Solo una es principal y debe tener factor `1`.
- El factor convierte la unidad de venta a la unidad principal. Una bolsa de 5 kg tiene factor `5`; un saco de 50 kg tiene factor `50`.
- El saldo se guarda siempre en unidad principal. Una venta de `0.250 kg` descuenta `0.250` del saldo.
- El precio se define por `variante + unidad de producto`, porque una caja puede costar menos que la multiplicacion de unidades sueltas.

Ejemplo: arroz a granel tiene `kg` como unidad principal. La variante estandar puede venderse en `kg`, `bolsa de 5 kg` y `saco de 50 kg`. El inventario sigue expresado en kg.

## Codigos de barras

Los codigos no son obligatorios. `product_barcodes` permite asignar un codigo a:

- Una variante, para venderla en su unidad principal.
- Una variante y una presentacion concreta, como una bolsa de 5 kg.

El codigo es unico en toda la empresa. El SKU si es obligatorio y unico globalmente.

## Lotes y vencimientos

- Toda entrada inventariable crea o actualiza un `inventory_lot`.
- Un lote pertenece a una variante y almacen. Registra costo, proveedor, fecha de recepcion y vencimiento opcional.
- La disponibilidad se guarda en `inventory_balances` por lote y ubicacion.
- Las salidas de venta se asignan en `sale_item_lots`.
- El servicio de venta selecciona lotes FEFO: primero vence, primero sale. No permite vencidos ni saldo negativo.

## Personas, usuarios y clientes

`people` contiene datos personales. `users` contiene solo credenciales y estado de acceso, y se relaciona uno a uno con una persona. Una persona puede ser cliente sin tener usuario. La venta puede no tener cliente, pero puede asociarlo para historial y comprobantes.

Los roles iniciales son `admin`, `cashier`, `seller` y `warehouse`. La autorizacion fina puede agregarse despues con permisos por modulo; no se necesita modelarla antes del primer uso real.

## Ventas, pagos y comprobantes

- Una venta guarda los importes historicos, incluidos IGV, descuento y total.
- Cada detalle guarda snapshots de nombre, SKU, unidad, factor, precio e IGV. Cambios posteriores de catalogo no alteran ventas pasadas.
- Una venta puede tener varios pagos.
- Los metodos iniciales son `cash` y `yape`; Yape requiere referencia externa.
- Solo los pagos en efectivo crean un movimiento positivo de caja.
- Una venta confirma un numero unico por serie y tipo documental. La integracion electronica con SUNAT queda fuera del primer corte, pero el esquema conserva el tipo, serie y correlativo necesarios.

## Caja y correcciones

Una sesion de caja pertenece a una caja fisica y a un cajero. Guarda apertura, cierre esperado, cierre contado y diferencia. Solo puede haber una sesion abierta por caja y por cajero.

Los gastos, retiros y ajustes se registran como `cash_movements`. Ningun importe se modifica directamente. Las devoluciones y anulaciones se implementan como documentos y movimientos inversos en una fase posterior.

## Fuera del primer corte

- Integracion API de facturacion electronica SUNAT.
- Cuentas por cobrar y por pagar.
- Devoluciones de compra y venta.
- Ordenes de compra y aprobaciones.
- Multiempresa real y politicas RLS.
