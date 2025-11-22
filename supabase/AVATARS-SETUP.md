# Configuración de Avatares de Usuario

Este documento explica cómo configurar el almacenamiento de avatares de usuario en Supabase Storage.

## Pasos de Configuración

### 1. Crear el Bucket de Avatares

1. Ve al panel de Supabase Dashboard
2. Navega a **Storage** en el menú lateral
3. Haz clic en **New bucket**
4. Configura el bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Marca esta opción (para que las imágenes sean accesibles públicamente)
   - **File size limit**: 5 MB (recomendado)
   - **Allowed MIME types**: `image/jpeg,image/png,image/gif,image/webp`

### 2. Aplicar Políticas RLS

**IMPORTANTE**: Si obtienes un error de permisos al ejecutar el script SQL, usa la configuración manual desde el Dashboard (ver `AVATARS-SETUP-ALTERNATIVE.md`).

Para ejecutar el script SQL:

1. Ve a **SQL Editor** en el panel de Supabase
2. Crea una nueva query
3. Copia y pega el contenido de `supabase/avatars-storage-policies.sql`
4. Ejecuta el script

**Nota**: Si recibes el error "must be owner of table objects", las políticas de Storage están protegidas. En ese caso:
- Usa la configuración manual desde el Dashboard (recomendado)
- O solicita permisos de superusuario a tu administrador de Supabase

### 3. Verificar la Configuración

Después de ejecutar el script, verifica que:

- El bucket `avatars` existe y es público
- Las políticas RLS están activas
- Los usuarios pueden subir imágenes a su propia carpeta (`avatars/{user_id}/`)

## Estructura de Archivos

Las imágenes de avatar se almacenan con la siguiente estructura:
```
avatars/
  └── {user_id}/
      └── {timestamp}-{random}.{ext}
```

Ejemplo:
```
avatars/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── 1703123456789-abc123.jpg
```

## Políticas de Seguridad

Las políticas implementadas garantizan que:

1. **Lectura pública**: Cualquiera puede ver las imágenes de avatar (perfiles públicos)
2. **Subida privada**: Solo el usuario autenticado puede subir imágenes a su propia carpeta
3. **Actualización privada**: Solo el usuario puede actualizar sus propias imágenes
4. **Eliminación privada**: Solo el usuario puede eliminar sus propias imágenes

## Límites

- **Tamaño máximo**: 5 MB por imagen
- **Formatos permitidos**: JPG, PNG, GIF, WebP
- **Una imagen por usuario**: Al subir una nueva imagen, se reemplaza la anterior (usando `upsert: true`)

## Solución de Problemas

### Error: "new row violates row-level security policy"

Si recibes este error al intentar subir una imagen:

1. Verifica que el bucket `avatars` existe
2. Verifica que las políticas RLS están aplicadas correctamente
3. Asegúrate de que el usuario está autenticado
4. Revisa que la ruta del archivo sigue el formato correcto: `avatars/{user_id}/filename.ext`

### Error: "Bucket not found"

1. Asegúrate de que el bucket `avatars` está creado en Supabase Storage
2. Verifica que el nombre del bucket es exactamente `avatars` (sin mayúsculas)

### Las imágenes no se muestran

1. Verifica que el bucket es público
2. Revisa que la URL pública se está generando correctamente
3. Comprueba que la imagen se subió correctamente en el panel de Storage

