# Configuración de Google OAuth - MarketDom

## Pasos para configurar Google OAuth en Supabase

### 1. Configurar en Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **Providers**
3. Busca **Google** en la lista de proveedores
4. Habilita el proveedor Google
5. Ingresa las siguientes credenciales:

   **Client ID (for OAuth):**
   ```
   6c80e67f-4b30-4204-94fc-92af1435c20b
   ```

   **Client Secret (for OAuth):**
   ```
   [Tu Client Secret de Google Cloud Console]
   ```

6. **Redirect URL** (ya configurada automáticamente):
   ```
   https://ngpzxnuxdscpuqrqpfuj.supabase.co/auth/v1/callback
   ```

7. Guarda los cambios

### 2. Verificar configuración en Google Cloud Console

Asegúrate de que en Google Cloud Console tengas configurado:

**Orígenes autorizados de JavaScript:**
- `https://marketdom-beta.vercel.app`
- `http://localhost:3000` (para desarrollo)

**URIs de redireccionamiento autorizados:**
- `https://ngpzxnuxdscpuqrqpfuj.supabase.co/auth/v1/callback`

### 3. Funcionalidad implementada

✅ **Login con Google** (`/auth/login`)
- Botón "Continuar con Google" disponible
- Redirige automáticamente después de la autenticación

✅ **Registro con Google** (`/auth/register`)
- Botón "Continuar con Google" disponible
- Crea automáticamente el perfil de usuario
- Inicializa gamificación para usuarios clientes

✅ **Callback Handler** (`/auth/callback`)
- Maneja el retorno de Google OAuth
- Crea/actualiza perfiles de usuario automáticamente
- Redirige según el rol del usuario

### 4. Notas importantes

- Los usuarios nuevos que se registran con Google se crean automáticamente con rol `cliente`
- El nombre completo se obtiene de los datos de Google (`full_name` o `name`)
- Si el usuario no tiene nombre en Google, se usa la parte antes del `@` del email
- La gamificación se inicializa automáticamente para nuevos usuarios clientes
- Los usuarios existentes que inician sesión con Google mantienen su rol actual

### 5. Troubleshooting

**Error: "redirect_uri_mismatch"**
- Verifica que la URL de callback en Google Cloud Console coincida exactamente con la de Supabase
- Asegúrate de que no haya espacios o caracteres extra

**Error: "invalid_client"**
- Verifica que el Client ID y Secret estén correctos en Supabase
- Asegúrate de que el Client ID sea el correcto (no el Client ID de la aplicación web)

**El usuario no se redirige correctamente**
- Verifica que la página `/auth/callback` esté accesible
- Revisa la consola del navegador para errores

