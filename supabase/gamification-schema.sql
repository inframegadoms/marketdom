-- ============================================
-- SISTEMA DE GAMIFICACIÓN Y REFERIDOS
-- MarketDom
-- ============================================

-- Tabla de moneda digital (Megacoins)
CREATE TABLE IF NOT EXISTS user_coins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0 NOT NULL CHECK (balance >= 0),
  total_earned DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  total_spent DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  level TEXT DEFAULT 'bronce' CHECK (level IN ('bronce', 'plata', 'oro', 'platino', 'diamante')),
  referral_code TEXT UNIQUE NOT NULL, -- Código único de referido
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de transacciones de coins
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'spent')),
  source TEXT NOT NULL, -- 'referral', 'purchase', 'review', 'social_share', 'quest', etc.
  description TEXT,
  reference_id UUID, -- ID de la orden, reseña, referido, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de misiones/objetivos
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- 'first_purchase', 'share_product', 'complete_profile', etc.
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_amount DECIMAL(10, 2) NOT NULL,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('referral', 'purchase', 'social', 'content', 'engagement')),
  is_active BOOLEAN DEFAULT true,
  max_completions INTEGER, -- NULL = ilimitado
  target_value INTEGER DEFAULT 1, -- Cantidad objetivo (ej: 5 reseñas, 3 compras)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de progreso de misiones
CREATE TABLE IF NOT EXISTS quest_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE NOT NULL,
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quest_id)
);

-- Tabla de referidos
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'first_purchase', 'rewarded')),
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- Tabla de badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_code TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT,
  badge_description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_code)
);

-- Tabla de canjes
CREATE TABLE IF NOT EXISTS coin_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  redemption_type TEXT NOT NULL CHECK (redemption_type IN ('discount', 'free_shipping', 'product', 'coupon')),
  coins_spent DECIMAL(10, 2) NOT NULL,
  value DECIMAL(10, 2) NOT NULL, -- Valor en MXN del canje
  coupon_code TEXT UNIQUE, -- Si es un cupón generado
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  order_id UUID REFERENCES orders(id), -- Si se usó en una orden
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de shares en redes sociales
CREATE TABLE IF NOT EXISTS social_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('product', 'store', 'marketplace')),
  reference_id UUID NOT NULL, -- ID del producto, tienda, etc.
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'whatsapp', 'other')),
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, share_type, reference_id, platform, DATE(created_at)) -- Una recompensa por día por plataforma
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created ON coin_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(type);
CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_quest ON quest_progress(quest_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_redemptions_user ON coin_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_redemptions_status ON coin_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_social_shares_user ON social_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coins_referral_code ON user_coins(referral_code);

-- Función para generar código de referido único
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generar código de 8 caracteres alfanuméricos
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM user_coins WHERE referral_code = code) INTO exists_check;
    
    -- Si no existe, salir del loop
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular nivel basado en total_earned
CREATE OR REPLACE FUNCTION calculate_user_level(total_earned DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF total_earned >= 10000 THEN
    RETURN 'diamante';
  ELSIF total_earned >= 5000 THEN
    RETURN 'platino';
  ELSIF total_earned >= 2000 THEN
    RETURN 'oro';
  ELSIF total_earned >= 500 THEN
    RETURN 'plata';
  ELSE
    RETURN 'bronce';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en user_coins
CREATE TRIGGER update_user_coins_updated_at
  BEFORE UPDATE ON user_coins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar nivel automáticamente
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := calculate_user_level(NEW.total_earned);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_level_on_earn
  BEFORE UPDATE OF total_earned ON user_coins
  FOR EACH ROW
  WHEN (NEW.total_earned <> OLD.total_earned)
  EXECUTE FUNCTION update_user_level();

-- Función para agregar coins a un usuario
CREATE OR REPLACE FUNCTION add_user_coins(
  p_user_id UUID,
  p_amount DECIMAL,
  p_source TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance DECIMAL;
BEGIN
  -- Insertar o actualizar user_coins
  INSERT INTO user_coins (user_id, balance, total_earned, referral_code)
  VALUES (
    p_user_id,
    p_amount,
    p_amount,
    generate_referral_code()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    balance = user_coins.balance + p_amount,
    total_earned = user_coins.total_earned + p_amount,
    updated_at = NOW();

  -- Obtener balance actualizado
  SELECT balance INTO v_current_balance FROM user_coins WHERE user_id = p_user_id;

  -- Crear transacción
  INSERT INTO coin_transactions (user_id, amount, type, source, description, reference_id)
  VALUES (p_user_id, p_amount, 'earned', p_source, p_description, p_reference_id)
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para gastar coins
CREATE OR REPLACE FUNCTION spend_user_coins(
  p_user_id UUID,
  p_amount DECIMAL,
  p_source TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  -- Verificar balance
  SELECT balance INTO v_current_balance FROM user_coins WHERE user_id = p_user_id;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN false;
  END IF;

  -- Actualizar balance
  UPDATE user_coins
  SET
    balance = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Crear transacción
  INSERT INTO coin_transactions (user_id, amount, type, source, description, reference_id)
  VALUES (p_user_id, p_amount, 'spent', p_source, p_description, p_reference_id);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insertar misiones iniciales
INSERT INTO quests (code, name, description, reward_amount, quest_type, target_value) VALUES
  ('complete_profile', 'Completa tu Perfil', 'Agrega tu nombre completo, teléfono y foto de perfil', 50, 'engagement', 1),
  ('first_purchase', 'Primera Compra', 'Realiza tu primera compra en el marketplace', 100, 'purchase', 1),
  ('second_purchase', 'Segunda Compra', 'Realiza tu segunda compra', 50, 'purchase', 1),
  ('fifth_purchase', 'Comprador Frecuente', 'Realiza tu quinta compra', 150, 'purchase', 1),
  ('tenth_purchase', 'Cliente VIP', 'Realiza tu décima compra', 300, 'purchase', 1),
  ('refer_friend', 'Invita un Amigo', 'Invita a un amigo que se registre', 50, 'referral', 1),
  ('refer_friend_purchase', 'Amigo Comprador', 'Tu amigo referido realiza su primera compra', 100, 'referral', 1),
  ('share_product', 'Comparte un Producto', 'Comparte un producto en redes sociales', 10, 'social', 1),
  ('share_store', 'Comparte una Tienda', 'Comparte una tienda completa', 25, 'social', 1),
  ('leave_review', 'Deja una Reseña', 'Deja una reseña de un producto comprado', 20, 'content', 1),
  ('purchase_over_500', 'Compra Grande', 'Realiza una compra mayor a $500 MXN', 50, 'purchase', 1),
  ('purchase_over_1000', 'Compra Muy Grande', 'Realiza una compra mayor a $1,000 MXN', 100, 'purchase', 1),
  ('purchase_over_2500', 'Compra Premium', 'Realiza una compra mayor a $2,500 MXN', 200, 'purchase', 1)
ON CONFLICT (code) DO NOTHING;

-- RLS Policies
ALTER TABLE user_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;

-- Políticas para user_coins
CREATE POLICY "Users can view own coins" ON user_coins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own coins" ON user_coins
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coins" ON user_coins
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Políticas para coin_transactions
CREATE POLICY "Users can view own transactions" ON coin_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Políticas para quests (públicas para lectura)
CREATE POLICY "Anyone can view active quests" ON quests
  FOR SELECT USING (is_active = true);

-- Políticas para quest_progress
CREATE POLICY "Users can view own quest progress" ON quest_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quest progress" ON quest_progress
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para referrals
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Políticas para user_badges
CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- Políticas para coin_redemptions
CREATE POLICY "Users can view own redemptions" ON coin_redemptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions" ON coin_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para social_shares
CREATE POLICY "Users can view own shares" ON social_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own shares" ON social_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

