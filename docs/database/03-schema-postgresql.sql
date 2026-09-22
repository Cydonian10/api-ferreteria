-- PostgreSQL 16 reference schema. Review and convert it into TypeORM migrations;
-- do not execute this file against a database that contains the legacy tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  trade_name text,
  tax_id varchar(20) NOT NULL UNIQUE,
  address text,
  phone varchar(30),
  email text,
  currency_code char(3) NOT NULL DEFAULT 'PEN',
  timezone text NOT NULL DEFAULT 'America/Lima',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  code varchar(30) NOT NULL,
  name text NOT NULL,
  address text,
  phone varchar(30),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (company_id, code)
);

CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  code varchar(30) NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (store_id, code)
);

CREATE TABLE warehouse_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  code varchar(30) NOT NULL,
  name text NOT NULL,
  is_saleable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (warehouse_id, code)
);

CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type varchar(10),
  document_number varchar(30),
  first_name text NOT NULL,
  last_name text,
  phone varchar(30),
  email text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK ((document_type IS NULL) = (document_number IS NULL))
);

CREATE UNIQUE INDEX people_document_uq
  ON people (document_type, document_number)
  WHERE document_number IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL UNIQUE REFERENCES people(id),
  email text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX users_email_uq
  ON users (lower(email))
  WHERE deleted_at IS NULL;

CREATE TABLE roles (
  code varchar(30) PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users(id),
  role_code varchar(30) NOT NULL REFERENCES roles(code),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_code)
);

CREATE INDEX user_roles_role_idx ON user_roles (role_code);

CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX brands_name_uq ON brands (lower(name)) WHERE deleted_at IS NULL;

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES categories(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX categories_parent_idx ON categories (parent_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX categories_parent_name_uq
  ON categories (parent_id, lower(name)) WHERE deleted_at IS NULL;

CREATE TABLE units_of_measure (
  code varchar(20) PRIMARY KEY,
  name text NOT NULL,
  symbol varchar(10) NOT NULL,
  dimension varchar(20) NOT NULL CHECK (dimension IN ('unit', 'weight', 'volume')),
  allows_fraction boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id),
  category_id uuid REFERENCES categories(id),
  primary_uom_code varchar(20) NOT NULL REFERENCES units_of_measure(code),
  name text NOT NULL,
  description text,
  tracks_lots boolean NOT NULL DEFAULT true,
  tracks_expiration boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX products_category_active_idx ON products (category_id) WHERE deleted_at IS NULL AND is_active;
CREATE INDEX products_brand_active_idx ON products (brand_id) WHERE deleted_at IS NULL AND is_active;
CREATE INDEX products_primary_uom_idx ON products (primary_uom_code);

CREATE TABLE product_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  uom_code varchar(20) NOT NULL REFERENCES units_of_measure(code),
  label text NOT NULL,
  factor_to_primary numeric(14,4) NOT NULL CHECK (factor_to_primary > 0),
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (product_id, label),
  CHECK (NOT is_primary OR factor_to_primary = 1)
);

CREATE UNIQUE INDEX product_units_primary_uq ON product_units (product_id) WHERE is_primary AND deleted_at IS NULL;
CREATE INDEX product_units_uom_idx ON product_units (uom_code);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  sku varchar(100) NOT NULL,
  name text NOT NULL,
  minimum_stock numeric(14,4) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX product_variants_sku_uq ON product_variants (sku) WHERE deleted_at IS NULL;
CREATE INDEX product_variants_product_idx ON product_variants (product_id) WHERE deleted_at IS NULL;

CREATE TABLE product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (product_id, name)
);

CREATE INDEX product_options_product_idx ON product_options (product_id);

CREATE TABLE option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_option_id uuid NOT NULL REFERENCES product_options(id),
  value text NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (product_option_id, value)
);

CREATE INDEX option_values_option_idx ON option_values (product_option_id);

CREATE TABLE variant_option_values (
  variant_id uuid NOT NULL REFERENCES product_variants(id),
  option_value_id uuid NOT NULL REFERENCES option_values(id),
  PRIMARY KEY (variant_id, option_value_id)
);

CREATE INDEX variant_option_values_value_idx ON variant_option_values (option_value_id);

CREATE TABLE product_barcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL REFERENCES product_variants(id),
  product_unit_id uuid REFERENCES product_units(id),
  barcode varchar(100) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_barcodes_variant_idx ON product_barcodes (product_variant_id);
CREATE INDEX product_barcodes_unit_idx ON product_barcodes (product_unit_id) WHERE product_unit_id IS NOT NULL;

CREATE TABLE tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate numeric(5,4) NOT NULL CHECK (rate >= 0 AND rate <= 1),
  is_active boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL,
  effective_to date,
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE variant_unit_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL REFERENCES product_variants(id),
  product_unit_id uuid NOT NULL REFERENCES product_units(id),
  tax_rate_id uuid NOT NULL REFERENCES tax_rates(id),
  price_including_tax numeric(14,2) NOT NULL CHECK (price_including_tax >= 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX variant_unit_prices_current_uq
  ON variant_unit_prices (product_variant_id, product_unit_id) WHERE ends_at IS NULL;
CREATE INDEX variant_unit_prices_lookup_idx
  ON variant_unit_prices (product_variant_id, product_unit_id, starts_at DESC);
CREATE INDEX variant_unit_prices_unit_idx ON variant_unit_prices (product_unit_id);
CREATE INDEX variant_unit_prices_tax_rate_idx ON variant_unit_prices (tax_rate_id);
CREATE INDEX variant_unit_prices_created_by_idx ON variant_unit_prices (created_by_user_id) WHERE created_by_user_id IS NOT NULL;

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type varchar(10),
  document_number varchar(30),
  legal_name text NOT NULL,
  contact_name text,
  phone varchar(30),
  email text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX suppliers_document_uq
  ON suppliers (document_type, document_number) WHERE document_number IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  received_by_user_id uuid NOT NULL REFERENCES users(id),
  supplier_document_number varchar(100),
  status varchar(20) NOT NULL DEFAULT 'received' CHECK (status IN ('draft', 'received', 'cancelled')),
  received_at timestamptz NOT NULL DEFAULT now(),
  subtotal_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  tax_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX purchases_supplier_received_idx ON purchases (supplier_id, received_at DESC);
CREATE INDEX purchases_warehouse_received_idx ON purchases (warehouse_id, received_at DESC);
CREATE INDEX purchases_received_by_idx ON purchases (received_by_user_id);

CREATE TABLE purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id),
  product_variant_id uuid NOT NULL REFERENCES product_variants(id),
  product_unit_id uuid NOT NULL REFERENCES product_units(id),
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  quantity_base numeric(14,4) NOT NULL CHECK (quantity_base > 0),
  factor_to_primary numeric(14,4) NOT NULL CHECK (factor_to_primary > 0),
  unit_cost_including_tax numeric(14,2) NOT NULL CHECK (unit_cost_including_tax >= 0),
  tax_rate numeric(5,4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 1),
  subtotal_amount numeric(14,2) NOT NULL CHECK (subtotal_amount >= 0),
  tax_amount numeric(14,2) NOT NULL CHECK (tax_amount >= 0),
  total_amount numeric(14,2) NOT NULL CHECK (total_amount >= 0),
  CHECK (quantity_base = quantity * factor_to_primary)
);

CREATE INDEX purchase_items_purchase_idx ON purchase_items (purchase_id);
CREATE INDEX purchase_items_variant_idx ON purchase_items (product_variant_id);
CREATE INDEX purchase_items_unit_idx ON purchase_items (product_unit_id);

CREATE TABLE inventory_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL REFERENCES product_variants(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  supplier_id uuid REFERENCES suppliers(id),
  purchase_item_id uuid REFERENCES purchase_items(id),
  lot_number varchar(100) NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  expires_at date,
  unit_cost_base_including_tax numeric(14,6) NOT NULL CHECK (unit_cost_base_including_tax >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, product_variant_id, lot_number)
);

CREATE INDEX inventory_lots_fefo_idx
  ON inventory_lots (warehouse_id, product_variant_id, expires_at ASC NULLS LAST, received_at ASC);
CREATE INDEX inventory_lots_expiration_idx ON inventory_lots (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX inventory_lots_variant_idx ON inventory_lots (product_variant_id);
CREATE INDEX inventory_lots_supplier_idx ON inventory_lots (supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX inventory_lots_purchase_item_idx ON inventory_lots (purchase_item_id) WHERE purchase_item_id IS NOT NULL;

CREATE TABLE inventory_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_lot_id uuid NOT NULL REFERENCES inventory_lots(id),
  warehouse_location_id uuid NOT NULL REFERENCES warehouse_locations(id),
  available_quantity numeric(14,4) NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inventory_lot_id, warehouse_location_id)
);

CREATE INDEX inventory_balances_location_idx ON inventory_balances (warehouse_location_id);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_lot_id uuid NOT NULL REFERENCES inventory_lots(id),
  warehouse_location_id uuid NOT NULL REFERENCES warehouse_locations(id),
  movement_type varchar(30) NOT NULL CHECK (movement_type IN ('purchase_receipt', 'sale', 'sale_return', 'transfer_in', 'transfer_out', 'adjustment_in', 'adjustment_out', 'expiration')),
  quantity_base numeric(14,4) NOT NULL CHECK (quantity_base <> 0),
  reference_type varchar(30) NOT NULL,
  reference_id uuid NOT NULL,
  reason text,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_movements_lot_created_idx ON inventory_movements (inventory_lot_id, created_at DESC);
CREATE INDEX inventory_movements_reference_idx ON inventory_movements (reference_type, reference_id);
CREATE INDEX inventory_movements_location_idx ON inventory_movements (warehouse_location_id, created_at DESC);
CREATE INDEX inventory_movements_user_idx ON inventory_movements (created_by_user_id, created_at DESC);

CREATE TABLE document_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  document_type varchar(20) NOT NULL CHECK (document_type IN ('receipt', 'invoice', 'sale_note')),
  series varchar(10) NOT NULL,
  next_number integer NOT NULL DEFAULT 1 CHECK (next_number > 0),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (store_id, document_type, series)
);

CREATE TABLE cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  code varchar(30) NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);

CREATE TABLE cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES cash_registers(id),
  opened_by_user_id uuid NOT NULL REFERENCES users(id),
  closed_by_user_id uuid REFERENCES users(id),
  status varchar(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (opening_amount >= 0),
  expected_closing_amount numeric(14,2),
  counted_closing_amount numeric(14,2),
  difference_amount numeric(14,2),
  closing_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'open' AND closed_at IS NULL) OR (status = 'closed' AND closed_at IS NOT NULL))
);

CREATE UNIQUE INDEX cash_sessions_open_register_uq ON cash_sessions (cash_register_id) WHERE status = 'open';
CREATE UNIQUE INDEX cash_sessions_open_user_uq ON cash_sessions (opened_by_user_id) WHERE status = 'open';

CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  document_series_id uuid REFERENCES document_series(id),
  customer_person_id uuid REFERENCES people(id),
  sold_by_user_id uuid NOT NULL REFERENCES users(id),
  cash_session_id uuid REFERENCES cash_sessions(id),
  document_type varchar(20) NOT NULL CHECK (document_type IN ('receipt', 'invoice', 'sale_note')),
  series varchar(10),
  document_number integer,
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
  sold_at timestamptz NOT NULL DEFAULT now(),
  subtotal_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((document_number IS NULL AND series IS NULL) OR (document_number IS NOT NULL AND series IS NOT NULL))
);

CREATE UNIQUE INDEX sales_document_number_uq
  ON sales (store_id, document_type, series, document_number) WHERE document_number IS NOT NULL;
CREATE INDEX sales_store_sold_idx ON sales (store_id, sold_at DESC);
CREATE INDEX sales_customer_sold_idx ON sales (customer_person_id, sold_at DESC) WHERE customer_person_id IS NOT NULL;
CREATE INDEX sales_session_idx ON sales (cash_session_id) WHERE cash_session_id IS NOT NULL;
CREATE INDEX sales_sold_by_idx ON sales (sold_by_user_id, sold_at DESC);
CREATE INDEX sales_document_series_idx ON sales (document_series_id) WHERE document_series_id IS NOT NULL;

CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id),
  product_variant_id uuid NOT NULL REFERENCES product_variants(id),
  product_unit_id uuid NOT NULL REFERENCES product_units(id),
  product_name_snapshot text NOT NULL,
  variant_name_snapshot text NOT NULL,
  sku_snapshot varchar(100) NOT NULL,
  unit_label_snapshot text NOT NULL,
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  quantity_base numeric(14,4) NOT NULL CHECK (quantity_base > 0),
  factor_to_primary numeric(14,4) NOT NULL CHECK (factor_to_primary > 0),
  unit_price_including_tax numeric(14,2) NOT NULL CHECK (unit_price_including_tax >= 0),
  discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_rate numeric(5,4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 1),
  subtotal_amount numeric(14,2) NOT NULL CHECK (subtotal_amount >= 0),
  tax_amount numeric(14,2) NOT NULL CHECK (tax_amount >= 0),
  total_amount numeric(14,2) NOT NULL CHECK (total_amount >= 0),
  CHECK (quantity_base = quantity * factor_to_primary)
);

CREATE INDEX sale_items_sale_idx ON sale_items (sale_id);
CREATE INDEX sale_items_variant_idx ON sale_items (product_variant_id);
CREATE INDEX sale_items_unit_idx ON sale_items (product_unit_id);

CREATE TABLE sale_item_lots (
  sale_item_id uuid NOT NULL REFERENCES sale_items(id),
  inventory_lot_id uuid NOT NULL REFERENCES inventory_lots(id),
  quantity_base numeric(14,4) NOT NULL CHECK (quantity_base > 0),
  PRIMARY KEY (sale_item_id, inventory_lot_id)
);

CREATE INDEX sale_item_lots_lot_idx ON sale_item_lots (inventory_lot_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id),
  payment_method varchar(20) NOT NULL CHECK (payment_method IN ('cash', 'yape')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  external_reference varchar(100),
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (payment_method <> 'yape' OR external_reference IS NOT NULL)
);

CREATE INDEX payments_sale_idx ON payments (sale_id);
CREATE INDEX payments_yape_reference_idx ON payments (external_reference) WHERE payment_method = 'yape';
CREATE INDEX payments_received_by_idx ON payments (received_by_user_id, received_at DESC);

CREATE TABLE cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id uuid NOT NULL REFERENCES cash_sessions(id),
  payment_id uuid UNIQUE REFERENCES payments(id),
  movement_type varchar(30) NOT NULL CHECK (movement_type IN ('opening', 'cash_sale', 'sale_return', 'expense', 'withdrawal', 'adjustment_in', 'adjustment_out')),
  amount numeric(14,2) NOT NULL CHECK (amount <> 0),
  category text,
  note text,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cash_movements_session_created_idx ON cash_movements (cash_session_id, created_at);
CREATE INDEX cash_movements_user_idx ON cash_movements (created_by_user_id, created_at DESC);
CREATE INDEX cash_sessions_closed_by_idx ON cash_sessions (closed_by_user_id) WHERE closed_by_user_id IS NOT NULL;

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),
  entity_type varchar(50) NOT NULL,
  entity_id uuid NOT NULL,
  action varchar(30) NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_user_id, created_at DESC) WHERE actor_user_id IS NOT NULL;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER warehouse_locations_updated_at BEFORE UPDATE ON warehouse_locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER people_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_units_updated_at BEFORE UPDATE ON product_units FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER cash_registers_updated_at BEFORE UPDATE ON cash_registers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION set_updated_at();
