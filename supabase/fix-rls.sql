-- Script para corregir políticas RLS y agregar trigger automático
-- Ejecuta este script en el SQL Editor de Supabase si ya ejecutaste schema.sql

-- 1. Eliminar políticas existentes si es necesario (opcional, solo si hay conflictos)
-- DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Vendedores can insert own profile" ON vendedor_profiles;

-- 2. Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Eliminar trigger si existe y recrearlo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Asegurar que existe la política de inserción para user_profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Agregar política de inserción para vendedor_profiles
DROP POLICY IF EXISTS "Vendedores can insert own profile" ON vendedor_profiles;
CREATE POLICY "Vendedores can insert own profile" ON vendedor_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

