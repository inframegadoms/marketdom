-- ============================================
-- AGREGAR POLÍTICA INSERT PARA user_coins
-- MarketDom
-- ============================================
-- Esta política permite a los usuarios insertar su propio registro de coins
-- Necesaria para que el sistema pueda inicializar coins para nuevos usuarios

-- Política para que los usuarios puedan insertar su propio registro de coins
CREATE POLICY "Users can insert own coins" ON user_coins
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

