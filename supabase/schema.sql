-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE user_role AS ENUM ('superadmin', 'vendedor', 'cliente');
CREATE TYPE plan_type AS ENUM ('gratuito', 'basico', 'medio', 'ilimitado');
CREATE TYPE product_status AS ENUM ('draft', 'active', 'inactive');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

-- User Profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendedor Profiles
CREATE TABLE vendedor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  store_name TEXT NOT NULL,
  store_description TEXT,
  plan plan_type DEFAULT 'gratuito',
  plan_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendedor_id UUID REFERENCES vendedor_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  status product_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipping Methods
CREATE TABLE shipping_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendedor_id UUID REFERENCES vendedor_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  estimated_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendedor_id UUID REFERENCES vendedor_profiles(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  discount_type discount_type NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase DECIMAL(10, 2),
  max_discount DECIMAL(10, 2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vendedor_id, code)
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vendedor_id UUID REFERENCES vendedor_profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  shipping_method_id UUID REFERENCES shipping_methods(id) NOT NULL,
  coupon_id UUID REFERENCES coupons(id),
  status order_status DEFAULT 'pending',
  mercado_pago_payment_id TEXT,
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Vendedor profiles policies
CREATE POLICY "Anyone can view active vendedor profiles" ON vendedor_profiles
  FOR SELECT USING (true);

CREATE POLICY "Vendedores can insert own profile" ON vendedor_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendedores can update own profile" ON vendedor_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Products policies
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (status = 'active');

CREATE POLICY "Vendedores can manage own products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vendedor_profiles
      WHERE vendedor_profiles.id = products.vendedor_id
      AND vendedor_profiles.user_id = auth.uid()
    )
  );

-- Shipping methods policies
CREATE POLICY "Anyone can view active shipping methods" ON shipping_methods
  FOR SELECT USING (is_active = true);

CREATE POLICY "Vendedores can manage own shipping methods" ON shipping_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vendedor_profiles
      WHERE vendedor_profiles.id = shipping_methods.vendedor_id
      AND vendedor_profiles.user_id = auth.uid()
    )
  );

-- Coupons policies
CREATE POLICY "Anyone can view active coupons" ON coupons
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Vendedores can manage own coupons" ON coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vendedor_profiles
      WHERE vendedor_profiles.id = coupons.vendedor_id
      AND vendedor_profiles.user_id = auth.uid()
    )
  );

-- Orders policies
CREATE POLICY "Clientes can view own orders" ON orders
  FOR SELECT USING (auth.uid() = cliente_id);

CREATE POLICY "Vendedores can view own store orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendedor_profiles
      WHERE vendedor_profiles.id = orders.vendedor_id
      AND vendedor_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Clientes can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = cliente_id);

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT raw_user_meta_data->>'role' INTO user_role
  FROM auth.users
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, 'cliente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX idx_products_vendedor ON products(vendedor_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_cliente ON orders(cliente_id);
CREATE INDEX idx_orders_vendedor ON orders(vendedor_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_vendedor ON coupons(vendedor_id);

