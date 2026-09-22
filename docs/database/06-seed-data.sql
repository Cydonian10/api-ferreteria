-- Load after the initial schema migration. Create company/store/warehouse values
-- through an administrative bootstrap command because their UUIDs are referenced.

INSERT INTO roles (code, name, description) VALUES
  ('admin', 'Administrador', 'Configuracion y acceso total'),
  ('cashier', 'Cajero', 'Apertura, cobro y cierre de caja'),
  ('seller', 'Vendedor', 'Registro de ventas'),
  ('warehouse', 'Almacen', 'Compras, lotes e inventario')
ON CONFLICT (code) DO NOTHING;

INSERT INTO units_of_measure (code, name, symbol, dimension, allows_fraction) VALUES
  ('unit', 'Unidad', 'und', 'unit', false),
  ('package', 'Paquete', 'paq', 'unit', false),
  ('box', 'Caja', 'caja', 'unit', false),
  ('bag', 'Bolsa', 'bolsa', 'unit', false),
  ('kg', 'Kilogramo', 'kg', 'weight', true),
  ('g', 'Gramo', 'g', 'weight', true),
  ('l', 'Litro', 'L', 'volume', true),
  ('ml', 'Mililitro', 'mL', 'volume', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO tax_rates (name, rate, is_active, effective_from) VALUES
  ('IGV 18%', 0.1800, true, DATE '2026-01-01');

-- Example product configuration after creating category/brand/product UUIDs:
-- 1. Create a product with primary_uom_code = 'kg'.
-- 2. Insert product_units: ('Kilogramo', 1, true), ('Bolsa 5 kg', 5, false).
-- 3. Create its variant with a unique SKU.
-- 4. Create a current variant_unit_prices row for each sellable unit.
-- 5. Add a product_barcodes row only if the provider supplied a barcode.
