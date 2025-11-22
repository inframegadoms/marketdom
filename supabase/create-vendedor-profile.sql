-- Script para crear manualmente un perfil de vendedor
-- Úsalo si un usuario vendedor no tiene perfil de vendedor

-- Reemplaza 'USER_ID_AQUI' con el ID del usuario (puedes obtenerlo de auth.users)
-- Reemplaza 'Nombre de la Tienda' con el nombre que desees

INSERT INTO vendedor_profiles (user_id, store_name, plan)
VALUES (
  'USER_ID_AQUI',  -- Reemplaza con el user_id de auth.users
  'Nombre de la Tienda',  -- Reemplaza con el nombre de la tienda
  'gratuito'
)
ON CONFLICT (user_id) DO NOTHING;

-- Para encontrar el user_id de un usuario por email:
-- SELECT id, email FROM auth.users WHERE email = 'email@ejemplo.com';

-- Ejemplo completo:
-- INSERT INTO vendedor_profiles (user_id, store_name, plan)
-- SELECT 
--   id,
--   'Mi Tienda',
--   'gratuito'
-- FROM auth.users
-- WHERE email = 'vendedor@ejemplo.com'
-- ON CONFLICT (user_id) DO NOTHING;

