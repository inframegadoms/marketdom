# Guía de Configuración de Políticas de Storage

Esta guía te ayudará a configurar las políticas RLS (Row Level Security) para el bucket de imágenes de productos en Supabase Storage.

## 📋 Requisitos Previos

1. ✅ El bucket `products` debe estar creado en Supabase Storage
2. ✅ El bucket debe estar configurado como **público** (para acceso público de lectura)
3. ✅ Debes tener acceso al SQL Editor de Supabase

## 🚀 Pasos para Configurar las Políticas

### Paso 1: Acceder al SQL Editor

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query**

### Paso 2: Ejecutar el Script

1. Copia todo el contenido del archivo `supabase/storage-policies.sql`
2. Pégalo en el SQL Editor
3. Haz clic en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)

### Paso 3: Verificar las Políticas

Para verificar que las políticas se crearon correctamente, ejecuta esta consulta:

```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%products%';
```

Deberías ver 4 políticas:
- `Public Access - Read Products Images` (SELECT)
- `Vendedores can upload product images` (INSERT)
- `Vendedores can update own product images` (UPDATE)
- `Vendedores can delete own product images` (DELETE)

## 📁 Estructura de Archivos

Las imágenes se organizan de la siguiente manera:

```
products/
  └── {vendedor_id}/
      ├── imagen1.jpg
      ├── imagen2.png
      └── ...
```

Donde `{vendedor_id}` es el `id` (UUID) de la tabla `vendedor_profiles`, no el `user_id`.

## 🔒 Seguridad

Las políticas garantizan que:

1. **Lectura Pública**: Cualquier usuario puede ver las imágenes (necesario para el marketplace)
2. **Escritura Restringida**: Solo vendedores autenticados pueden subir imágenes
3. **Propiedad**: Los vendedores solo pueden subir/actualizar/eliminar imágenes en su propia carpeta
4. **Validación**: Se verifica que el usuario tenga un perfil de vendedor antes de permitir cualquier operación

## 🧪 Pruebas

### Probar la Subida de Imágenes

1. Inicia sesión como vendedor
2. Ve a **Dashboard > Productos > Nuevo Producto**
3. Selecciona una imagen y crea el producto
4. Verifica que la imagen se suba correctamente

### Verificar Acceso Público

1. Cierra sesión o abre una ventana de incógnito
2. Ve al marketplace
3. Verifica que las imágenes de los productos se muestren correctamente

## ❌ Troubleshooting

### Error: "new row violates row-level security policy"

**Causa**: Las políticas no están configuradas o hay un problema con la validación.

**Solución**:
1. Verifica que ejecutaste el script completo
2. Verifica que el bucket `products` existe
3. Verifica que el usuario tiene un perfil de vendedor en `vendedor_profiles`
4. Verifica que el bucket es público

### Error: "Bucket not found"

**Causa**: El bucket `products` no existe.

**Solución**:
1. Ve a **Storage** en Supabase
2. Crea el bucket `products`
3. Márcalo como **público**
4. Vuelve a ejecutar el script de políticas

### Las imágenes no se muestran en el marketplace

**Causa**: El bucket no es público o falta la política de lectura.

**Solución**:
1. Verifica que el bucket está marcado como **público**
2. Verifica que la política `Public Access - Read Products Images` existe
3. Verifica que las URLs de las imágenes son correctas

### No puedo subir imágenes

**Causa**: Falta la política de INSERT o el usuario no es vendedor.

**Solución**:
1. Verifica que el usuario tiene un perfil en `vendedor_profiles`
2. Verifica que la política `Vendedores can upload product images` existe
3. Verifica que estás autenticado

## 📝 Notas Adicionales

- Las políticas se aplican a nivel de fila en la tabla `storage.objects`
- El bucket debe ser público para que las imágenes se puedan ver sin autenticación
- Los vendedores solo pueden acceder a sus propias carpetas
- El código usa el `id` de `vendedor_profiles` (UUID), no el `user_id`

## 🔄 Actualizar Políticas

Si necesitas actualizar las políticas:

1. Elimina las políticas existentes (descomenta las líneas DROP POLICY en el script)
2. Ejecuta el script completo nuevamente

## 📞 Soporte

Si tienes problemas, verifica:
1. Los logs de Supabase en **Logs > Postgres Logs**
2. La consola del navegador para errores de JavaScript
3. La pestaña Network en las DevTools para ver las peticiones a Storage

