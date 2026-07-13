-- ============================================================
-- Lettering Venezuela - Esquema de Base de Datos Supabase
-- ============================================================

-- 1. EXTENSIONES
create extension if not exists "uuid-ossp";

-- 2. TABLAS

-- Perfiles de usuario (vinculados a auth.users de Supabase)
create table if not exists profiles (
    id uuid primary key references auth.users on delete cascade,
    name text not null,
    phone text not null default '',
    created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Categorías
create table if not exists categories (
    id bigint generated always as identity primary key,
    name text not null unique,
    foto_url text default '',
    created_at timestamptz default now()
);

alter table categories enable row level security;

-- Marcas
create table if not exists brands (
    id bigint generated always as identity primary key,
    name text not null unique,
    foto_url text default '',
    created_at timestamptz default now()
);

alter table brands enable row level security;

-- Productos
create table if not exists products (
    id bigint generated always as identity primary key,
    name text not null unique,
    category_id bigint references categories(id) on delete set null,
    brand_id bigint references brands(id) on delete set null,
    quantity integer not null default 0,
    price numeric(10,2) not null default 0,
    descripcion text default '',
    codigo text default '',
    activo boolean default true,
    variantes jsonb default '[]'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Add columns if missing (for existing tables)
alter table products add column if not exists descripcion text default '';
alter table products add column if not exists codigo text default '';
alter table products add column if not exists activo boolean default true;
alter table products add column if not exists variantes jsonb default '[]'::jsonb;

alter table products enable row level security;

-- Fotos de productos
create table if not exists product_photos (
    id bigint generated always as identity primary key,
    product_id bigint not null references products(id) on delete cascade,
    url text not null,
    sort_order integer not null default 0,
    created_at timestamptz default now()
);

alter table product_photos enable row level security;

-- Clientes (personas)
create table if not exists clients (
    id bigint generated always as identity primary key,
    name text not null,
    phone text not null default '',
    created_at timestamptz default now()
);

alter table clients enable row level security;

-- Ventas (cada compra de un cliente)
create table if not exists sales (
    id bigint generated always as identity primary key,
    client_id bigint references clients(id) on delete cascade,
    sale_date date not null default current_date,
    total_usd numeric(10,2) not null default 0,
    total_bs numeric(10,2) not null default 0,
    paid_usd numeric(10,2) not null default 0,
    paid_bs numeric(10,2) not null default 0,
    notes text default '',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table sales enable row level security;

-- Items de cada venta
create table if not exists sale_items (
    id bigint generated always as identity primary key,
    sale_id bigint not null references sales(id) on delete cascade,
    product_name text not null,
    quantity integer not null default 1,
    price_usd numeric(10,2) not null default 0
);

alter table sale_items enable row level security;

-- Fotos asociadas a una venta (foto de producto + recibos)
create table if not exists sale_photos (
    id bigint generated always as identity primary key,
    sale_id bigint not null references sales(id) on delete cascade,
    url text not null,
    photo_type text not null check (photo_type in ('product', 'receipt')),
    sort_order integer not null default 0,
    created_at timestamptz default now()
);

alter table sale_photos enable row level security;

-- Abonos (pagos parciales)
create table if not exists payment_records (
    id bigint generated always as identity primary key,
    sale_id bigint not null references sales(id) on delete cascade,
    payment_date date not null default current_date,
    usd_amount numeric(10,2) not null default 0,
    bs_amount numeric(10,2) not null default 0,
    tasa numeric(10,2) not null default 0,
    created_at timestamptz default now()
);

alter table payment_records enable row level security;

-- Pedidos de la tienda online
create table if not exists orders (
    id bigint generated always as identity primary key,
    order_id text not null unique,
    user_id uuid references profiles(id) on delete set null,
    user_email text default '',
    user_name text default '',
    user_phone text default '',
    items_json jsonb not null default '[]',
    total_usd numeric(10,2) not null default 0,
    total_bs numeric(10,2) not null default 0,
    status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'cancelado', 'entregado')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table orders enable row level security;

-- Configuración: tasa de cambio
create table if not exists exchange_rates (
    id bigint generated always as identity primary key,
    mode text not null default 'manual' check (mode in ('auto', 'manual')),
    rate numeric(10,2) not null default 36.50,
    source text default 'oficial' check (source in ('oficial', 'paralelo')),
    updated_at timestamptz default now()
);

alter table exchange_rates enable row level security;

-- Configuración: información de contacto
create table if not exists contact_info (
    id bigint generated always as identity primary key,
    whatsapp text default '584121234567',
    instagram text default '',
    facebook text default '',
    updated_at timestamptz default now()
);

alter table contact_info enable row level security;

-- Historial de ventas consolidadas (para el dashboard)
create table if not exists sales_history (
    id bigint generated always as identity primary key,
    date date not null default current_date,
    items_json jsonb not null default '[]',
    total_usd numeric(10,2) not null default 0,
    created_at timestamptz default now()
);

alter table sales_history enable row level security;

-- 3. FUNCIONES ÚTILES

-- Actualizar updated_at automáticamente
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Triggers para updated_at
create trigger set_products_updated_at
    before update on products
    for each row execute function update_updated_at();

create trigger set_sales_updated_at
    before update on sales
    for each row execute function update_updated_at();

create trigger set_orders_updated_at
    before update on orders
    for each row execute function update_updated_at();

-- 4. POLÍTICAS DE SEGURIDAD (RLS)

-- Permitir lectura anónima para la tienda pública
create policy "Allow public read access to categories"
    on categories for select using (true);

create policy "Allow public read access to brands"
    on brands for select using (true);

create policy "Allow public read access to products"
    on products for select using (true);

create policy "Allow public read access to product_photos"
    on product_photos for select using (true);

create policy "Allow public read access to exchange_rates"
    on exchange_rates for select using (true);

create policy "Allow public read access to contact_info"
    on contact_info for select using (true);

-- Solo usuarios autenticados pueden modificar (dashboard)
create policy "Allow authenticated insert categories"
    on categories for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated update categories"
    on categories for update using (auth.role() = 'authenticated');

create policy "Allow authenticated delete categories"
    on categories for delete using (auth.role() = 'authenticated');

create policy "Allow authenticated insert brands"
    on brands for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated update brands"
    on brands for update using (auth.role() = 'authenticated');

create policy "Allow authenticated delete brands"
    on brands for delete using (auth.role() = 'authenticated');

create policy "Allow authenticated insert products"
    on products for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated update products"
    on products for update using (auth.role() = 'authenticated');

create policy "Allow authenticated delete products"
    on products for delete using (auth.role() = 'authenticated');

create policy "Allow authenticated all product_photos"
    on product_photos for all using (auth.role() = 'authenticated');

create policy "Allow authenticated all clients"
    on clients for all using (auth.role() = 'authenticated');

create policy "Allow authenticated all sales"
    on sales for all using (auth.role() = 'authenticated');

create policy "Allow authenticated all sale_items"
    on sale_items for all using (auth.role() = 'authenticated');

create policy "Allow authenticated all sale_photos"
    on sale_photos for all using (auth.role() = 'authenticated');

create policy "Allow authenticated all payment_records"
    on payment_records for all using (auth.role() = 'authenticated');

create policy "Allow authenticated all orders"
    on orders for all using (auth.role() = 'authenticated');

create policy "Allow authenticated all exchange_rates"
    on exchange_rates for all using (auth.role() = 'authenticated');

create policy "Allow authenticated all contact_info"
    on contact_info for all using (auth.role() = 'authenticated');

create policy "Allow authenticated all sales_history"
    on sales_history for all using (auth.role() = 'authenticated');

-- Perfiles: el usuario solo ve su propio perfil
create policy "Users can view own profile"
    on profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
    on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
    on profiles for update using (auth.uid() = id);

-- Órdenes: usuarios autenticados pueden ver sus propias órdenes
create policy "Users can view own orders"
    on orders for select using (auth.uid() = user_id or auth.role() = 'authenticated');

-- 5. DATOS INICIALES

-- Insertar configuración por defecto
insert into exchange_rates (mode, rate, source) values ('manual', 36.50, 'oficial')
    on conflict do nothing;

insert into contact_info (whatsapp, instagram, facebook) values ('584121234567', '', '')
    on conflict do nothing;

-- Categorías por defecto
insert into categories (name) values ('Marcadores'), ('Papelería'), ('Arte')
    on conflict do nothing;

-- Marcas por defecto
insert into brands (name) values ('Crayola'), ('Kores'), ('Sharpie')
    on conflict do nothing;
