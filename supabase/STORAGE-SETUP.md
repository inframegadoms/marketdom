# Configuración de Supabase Storage para Productos

## Problema Común
Si al crear un producto se queda "pensando" o no se crea, puede ser porque el bucket de Storage no está configurado correctamente.

## Pasos para Configurar Storage

### 1. Crear el Bucket

1. Ve a tu proyecto en Supabase
2. Navega a **Storage** en el menú lateral
3. Haz clic en **"New bucket"**
4. Nombre del bucket: `products`
5. Marca **"Public bucket"** (esto permite acceso público a las imágenes)
6. Haz clic en **"Create bucket"**

### 2. Configurar Políticas RLS para Storage

Ve a **Storage** > **Policies** y asegúrate de tener estas políticas:

#### Política de Lectura (SELECT) - Pública
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');
```

#### Política de Inserción (INSERT) - Solo usuarios autenticados
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');
```

#### Política de Actualización (UPDATE) - Solo el propietario
```sql
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);
```

#### Política de Eliminación (DELETE) - Solo el propietario
```sql
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 3. Verificar la Configuración

1. El bucket `products` debe existir
2. El bucket debe ser **público** (para que las imágenes se puedan ver en el marketplace)
3. Las políticas RLS deben estar configuradas

## Solución Rápida

Si no quieres configurar Storage ahora, puedes:

1. **Crear productos sin imágenes** - El formulario permite crear productos sin imágenes
2. **Usar URLs externas** - Más adelante puedes editar el producto y agregar URLs de imágenes externas

## Troubleshooting

### Error: "Bucket not found"
- Verifica que el bucket `products` existe en Storage
- Verifica que el nombre sea exactamente `products` (sin mayúsculas)

### Error: "new row violates row-level security policy"
- Verifica que las políticas RLS estén configuradas correctamente
- Asegúrate de estar autenticado como vendedor

### Error: "Upload failed"
- Verifica que el bucket sea público o que tengas permisos de escritura
- Verifica el tamaño de las imágenes (Supabase tiene límites)

### El producto se crea pero sin imágenes
- Esto es normal si no subiste imágenes o si falló la subida
- Puedes editar el producto después para agregar imágenes

