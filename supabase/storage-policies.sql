-- ============================================
-- POLÍTICAS DE STORAGE PARA BUCKET DE PRODUCTOS
-- ============================================
-- Este script crea las políticas RLS para el bucket 'products' en Supabase Storage
-- Ejecuta este script en el SQL Editor de Supabase
-- IMPORTANTE: Asegúrate de que el bucket 'products' esté creado y sea público

-- ============================================
-- PASO 1: Eliminar políticas existentes (si las hay)
-- ============================================
-- Descomenta estas líneas si necesitas eliminar políticas existentes:
-- DROP POLICY IF EXISTS "Public Access - Read Products Images" ON storage.objects;
-- DROP POLICY IF EXISTS "Vendedores can upload product images" ON storage.objects;
-- DROP POLICY IF EXISTS "Vendedores can update own product images" ON storage.objects;
-- DROP POLICY IF EXISTS "Vendedores can delete own product images" ON storage.objects;

-- ============================================
-- PASO 2: Crear las políticas
-- ============================================

-- 1. Política de LECTURA PÚBLICA
-- Permite que cualquier usuario (autenticado o no) pueda ver las imágenes de productos
CREATE POLICY "Public Access - Read Products Images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'products'
);

-- 2. Política de ESCRITURA para VENDEDORES
-- Solo los vendedores autenticados pueden subir imágenes
-- Las imágenes se organizan por vendedor_id: products/{vendedor_id}/{filename}
-- El código usa el 'id' de vendedor_profiles (UUID), no el user_id
CREATE POLICY "Vendedores can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'products' AND
  auth.role() = 'authenticated' AND
  -- Verificar que el usuario es vendedor
  EXISTS (
    SELECT 1
    FROM vendedor_profiles
    WHERE vendedor_profiles.user_id = auth.uid()
  ) AND
  -- Verificar que la carpeta del archivo coincide con el id del vendedor
  -- El código sube a: products/{vendedorProfile.id}/{fileName}
  (storage.foldername(name))[1] = (
    SELECT id::text
    FROM vendedor_profiles
    WHERE vendedor_profiles.user_id = auth.uid()
    LIMIT 1
  )
);

-- 3. Política de ACTUALIZACIÓN para VENDEDORES
-- Los vendedores solo pueden actualizar sus propias imágenes
CREATE POLICY "Vendedores can update own product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'products' AND
  auth.role() = 'authenticated' AND
  -- Verificar que el usuario es vendedor
  EXISTS (
    SELECT 1
    FROM vendedor_profiles
    WHERE vendedor_profiles.user_id = auth.uid()
  ) AND
  -- Verificar que la imagen pertenece al vendedor
  (storage.foldername(name))[1] = (
    SELECT id::text
    FROM vendedor_profiles
    WHERE vendedor_profiles.user_id = auth.uid()
    LIMIT 1
  )
);

-- 4. Política de ELIMINACIÓN para VENDEDORES
-- Los vendedores solo pueden eliminar sus propias imágenes
CREATE POLICY "Vendedores can delete own product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'products' AND
  auth.role() = 'authenticated' AND
  -- Verificar que el usuario es vendedor
  EXISTS (
    SELECT 1
    FROM vendedor_profiles
    WHERE vendedor_profiles.user_id = auth.uid()
  ) AND
  -- Verificar que la imagen pertenece al vendedor
  (storage.foldername(name))[1] = (
    SELECT id::text
    FROM vendedor_profiles
    WHERE vendedor_profiles.user_id = auth.uid()
    LIMIT 1
  )
);

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Asegúrate de que el bucket 'products' esté creado en Supabase Storage
-- 2. El bucket debe estar configurado como 'public' si quieres acceso público de lectura
-- 3. Las imágenes se organizan por vendedor_id: products/{vendedor_id}/{filename}
-- 4. Los vendedores solo pueden subir/actualizar/eliminar imágenes en su propia carpeta
-- 5. Cualquier usuario puede ver las imágenes (lectura pública)

-- ============================================
-- VERIFICACIÓN:
-- ============================================
-- Para verificar que las políticas están activas, ejecuta:
-- SELECT * FROM storage.policies WHERE bucket_id = 'products';

