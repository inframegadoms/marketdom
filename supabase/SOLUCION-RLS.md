# Solución para Error de RLS al Registrar Usuarios

## Problema
Al registrar un nuevo usuario, aparece el error: `new row violates row-level security policy for table "user_profiles"`

## Solución

### Opción 1: Ejecutar el script de corrección (Recomendado)

1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Copia y pega el contenido del archivo `fix-rls.sql`
4. Ejecuta el script

Este script:
- Crea un trigger automático que crea el perfil cuando se registra un usuario
- Corrige las políticas RLS para permitir la inserción
- Agrega la política faltante para `vendedor_profiles`

### Opción 2: Si ya ejecutaste schema.sql

Si ya ejecutaste `schema.sql` anteriormente, solo necesitas ejecutar estas líneas adicionales en el SQL Editor:

```sql
-- Agregar política de inserción para vendedor_profiles
CREATE POLICY "Vendedores can insert own profile" ON vendedor_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Verificación

Después de ejecutar el script:

1. Intenta registrar un nuevo usuario desde la página de registro
2. El perfil debería crearse automáticamente
3. Si eres vendedor, el perfil de vendedor también se creará

### Nota sobre Confirmación de Email

Si tienes habilitada la confirmación de email en Supabase:
- El usuario recibirá un email de confirmación
- Debe hacer clic en el enlace para activar su cuenta
- Después de confirmar, podrá iniciar sesión normalmente

Para deshabilitar la confirmación de email (solo para desarrollo):
1. Ve a Authentication > Settings en Supabase
2. Desactiva "Enable email confirmations"

## Troubleshooting

Si aún tienes problemas:

1. Verifica que el trigger esté creado:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

2. Verifica las políticas RLS:
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
SELECT * FROM pg_policies WHERE tablename = 'vendedor_profiles';
```

3. Si el trigger no existe, créalo manualmente con el código del archivo `schema.sql` (líneas 117-133)

