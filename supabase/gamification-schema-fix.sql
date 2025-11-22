-- ============================================
-- CORRECCIÓN: Tabla social_shares
-- MarketDom
-- ============================================

-- Eliminar la tabla si existe (por si acaso)
DROP TABLE IF EXISTS social_shares CASCADE;

-- Crear la tabla social_shares con una columna DATE para el índice único
CREATE TABLE social_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('product', 'store', 'marketplace')),
  reference_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'whatsapp', 'other')),
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  share_date DATE NOT NULL DEFAULT CURRENT_DATE -- Columna DATE para el índice único
);

-- Crear índice único usando la columna share_date (sin funciones)
-- Esto permite solo una recompensa por día por plataforma, tipo y referencia
CREATE UNIQUE INDEX idx_social_shares_unique_daily 
ON social_shares (
  user_id, 
  share_type, 
  reference_id, 
  platform, 
  share_date
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_social_shares_user ON social_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_social_shares_created ON social_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_shares_type ON social_shares(share_type);
CREATE INDEX IF NOT EXISTS idx_social_shares_platform ON social_shares(platform);

-- Habilitar RLS
ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para social_shares
CREATE POLICY "Users can view own shares" ON social_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own shares" ON social_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shares" ON social_shares
  FOR UPDATE USING (auth.uid() = user_id);

-- Comentario explicativo
COMMENT ON TABLE social_shares IS 'Registra los compartidos en redes sociales para tracking de recompensas. Solo permite una recompensa por día por plataforma.';
COMMENT ON INDEX idx_social_shares_unique_daily IS 'Garantiza que un usuario solo pueda recibir una recompensa por día por cada combinación de tipo, referencia y plataforma.';

