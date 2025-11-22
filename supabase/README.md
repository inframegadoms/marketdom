# Configuración de Supabase

## Pasos para configurar la base de datos

1. Crea un proyecto en [Supabase](https://supabase.com)

2. Ve a SQL Editor y ejecuta el script `schema.sql` que se encuentra en esta carpeta

3. Configura Storage:
   - Ve a Storage en el panel de Supabase
   - Crea un bucket llamado `products` con políticas públicas para lectura
   - Configura las políticas RLS según sea necesario

4. Configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio (solo para operaciones admin)

## Crear un usuario SuperAdmin

Para crear un usuario SuperAdmin, ejecuta este SQL después de crear el usuario:

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"superadmin"'
)
WHERE email = 'tu-email@ejemplo.com';
```

## Notas importantes

- Asegúrate de configurar las políticas RLS correctamente
- El bucket `products` debe tener políticas públicas para lectura
- Los usuarios vendedores se crean automáticamente al registrarse con rol 'vendedor'

