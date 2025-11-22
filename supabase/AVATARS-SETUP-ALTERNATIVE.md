# Configuración Alternativa de Avatares (Sin SQL)

Si tienes problemas ejecutando el script SQL, puedes configurar las políticas directamente desde el Dashboard de Supabase.

## Opción 1: Configuración Manual desde el Dashboard

### Paso 1: Crear el Bucket

1. Ve al panel de Supabase Dashboard
2. Navega a **Storage** en el menú lateral
3. Haz clic en **New bucket**
4. Configura el bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Marca esta opción
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/gif,image/webp`

### Paso 2: Configurar Políticas desde el Dashboard

1. Ve a **Storage** → **Policies** (o haz clic en el bucket `avatars` → **Policies**)
2. Crea las siguientes políticas:

#### Política 1: Lectura Pública
- **Policy name**: `Public Access - Read Avatars`
- **Allowed operation**: `SELECT`
- **Policy definition**:
```sql
bucket_id = 'avatars'
```

#### Política 2: Subida de Usuario
- **Policy name**: `Users can upload own avatar`
- **Allowed operation**: `INSERT`
- **Policy definition**:
```sql
bucket_id = 'avatars' AND
auth.role() = 'authenticated' AND
(storage.foldername(name))[1] = 'avatars' AND
(storage.foldername(name))[2] = auth.uid()::text
```

#### Política 3: Actualización de Usuario
- **Policy name**: `Users can update own avatar`
- **Allowed operation**: `UPDATE`
- **Policy definition (USING)**:
```sql
bucket_id = 'avatars' AND
auth.role() = 'authenticated' AND
(storage.foldername(name))[1] = 'avatars' AND
(storage.foldername(name))[2] = auth.uid()::text
```
- **Policy definition (WITH CHECK)**:
```sql
bucket_id = 'avatars' AND
auth.role() = 'authenticated' AND
(storage.foldername(name))[1] = 'avatars' AND
(storage.foldername(name))[2] = auth.uid()::text
```

#### Política 4: Eliminación de Usuario
- **Policy name**: `Users can delete own avatar`
- **Allowed operation**: `DELETE`
- **Policy definition**:
```sql
bucket_id = 'avatars' AND
auth.role() = 'authenticated' AND
(storage.foldername(name))[1] = 'avatars' AND
(storage.foldername(name))[2] = auth.uid()::text
```

## Opción 2: Bucket Público Simple (Menos Seguro)

Si prefieres una configuración más simple y el bucket es público:

1. Crea el bucket `avatars` como público
2. No necesitas políticas adicionales para lectura
3. Solo necesitas políticas para INSERT, UPDATE y DELETE (como se muestra arriba)

## Opción 3: Usar el SQL Editor con Permisos Correctos

Si tienes acceso de superusuario o puedes solicitar permisos:

1. Ve a **SQL Editor** en Supabase
2. Asegúrate de estar usando la conexión correcta
3. Ejecuta el script `avatars-storage-policies.sql` (versión actualizada)

## Verificación

Después de configurar las políticas, verifica que:

1. El bucket `avatars` existe
2. El bucket es público (para lectura)
3. Las políticas están activas
4. Puedes subir una imagen de prueba desde la aplicación

## Nota sobre la Función `storage.foldername`

Si la función `storage.foldername` no existe, créala desde el SQL Editor:

```sql
CREATE OR REPLACE FUNCTION storage.foldername(path TEXT)
RETURNS TEXT[] LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN regexp_split_to_array(path, '/');
END;
$$;
```

Esta función es necesaria para que las políticas funcionen correctamente.

