-- ============================================
-- POLÍTICAS RLS PARA SUPERADMIN EN GAMIFICACIÓN
-- MarketDom
-- ============================================

-- Política para que SuperAdmin pueda ver todas las user_coins
CREATE POLICY "SuperAdmin can view all user_coins" ON user_coins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'superadmin'
    )
  );

-- Política para que SuperAdmin pueda ver todas las coin_transactions
CREATE POLICY "SuperAdmin can view all coin_transactions" ON coin_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'superadmin'
    )
  );

-- Política para que SuperAdmin pueda ver todas las referrals
CREATE POLICY "SuperAdmin can view all referrals" ON referrals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'superadmin'
    )
  );

-- Política para que SuperAdmin pueda ver todas las user_badges
CREATE POLICY "SuperAdmin can view all user_badges" ON user_badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'superadmin'
    )
  );

-- Política para que SuperAdmin pueda ver todas las coin_redemptions
CREATE POLICY "SuperAdmin can view all coin_redemptions" ON coin_redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'superadmin'
    )
  );

-- Política para que SuperAdmin pueda ver todas las quest_progress
CREATE POLICY "SuperAdmin can view all quest_progress" ON quest_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'superadmin'
    )
  );

-- Política para que SuperAdmin pueda ver todas las social_shares
CREATE POLICY "SuperAdmin can view all social_shares" ON social_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'superadmin'
    )
  );

