-- Script para agregar campos adicionales a vendedor_profiles
-- Ejecuta este script en el SQL Editor de Supabase

-- Agregar campos para Mercado Pago y configuración de tienda
ALTER TABLE vendedor_profiles
ADD COLUMN IF NOT EXISTS mercado_pago_access_token TEXT,
ADD COLUMN IF NOT EXISTS mercado_pago_public_key TEXT,
ADD COLUMN IF NOT EXISTS store_slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS store_logo TEXT,
ADD COLUMN IF NOT EXISTS store_banner TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}';

-- Crear índice para búsqueda rápida por slug
CREATE INDEX IF NOT EXISTS idx_vendedor_profiles_slug ON vendedor_profiles(store_slug);

-- Función para generar slug automático si no existe
CREATE OR REPLACE FUNCTION generate_store_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.store_slug IS NULL OR NEW.store_slug = '' THEN
    NEW.store_slug := lower(regexp_replace(NEW.store_name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Asegurar unicidad
    WHILE EXISTS (SELECT 1 FROM vendedor_profiles WHERE store_slug = NEW.store_slug AND id != NEW.id) LOOP
      NEW.store_slug := NEW.store_slug || '-' || floor(random() * 1000)::text;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar slug automáticamente
DROP TRIGGER IF EXISTS generate_slug_trigger ON vendedor_profiles;
CREATE TRIGGER generate_slug_trigger
  BEFORE INSERT OR UPDATE ON vendedor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_store_slug();

