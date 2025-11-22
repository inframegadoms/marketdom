-- ============================================
-- INICIALIZAR GAMIFICACIÓN PARA USUARIOS EXISTENTES
-- MarketDom
-- ============================================

-- Este script inicializa el sistema de gamificación para usuarios clientes existentes
-- que se registraron antes de implementar el sistema de gamificación

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

-- Insertar user_coins para todos los usuarios clientes que no tengan registro
INSERT INTO user_coins (user_id, balance, total_earned, referral_code)
SELECT 
  u.id as user_id,
  50 as balance, -- 50 MGC de bienvenida
  50 as total_earned,
  generate_referral_code() as referral_code
FROM auth.users u
WHERE 
  -- Solo usuarios con rol 'cliente'
  (u.raw_user_meta_data->>'role')::text = 'cliente'
  -- Que no tengan registro en user_coins
  AND NOT EXISTS (
    SELECT 1 FROM user_coins uc WHERE uc.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Crear transacciones de bienvenida para los usuarios inicializados
INSERT INTO coin_transactions (user_id, amount, type, source, description)
SELECT 
  uc.user_id,
  50 as amount,
  'earned' as type,
  'welcome_bonus' as source,
  'Bienvenida a MarketDom - Inicialización retroactiva' as description
FROM user_coins uc
WHERE 
  -- Solo para usuarios que acabamos de crear (o que tienen exactamente 50 MGC)
  uc.total_earned = 50
  -- Y que no tengan transacción de bienvenida
  AND NOT EXISTS (
    SELECT 1 
    FROM coin_transactions ct 
    WHERE ct.user_id = uc.user_id 
      AND ct.source = 'welcome_bonus'
  );

-- Mostrar resumen
SELECT 
  COUNT(*) as usuarios_inicializados,
  SUM(balance) as total_coins_otorgados
FROM user_coins
WHERE total_earned = 50;

