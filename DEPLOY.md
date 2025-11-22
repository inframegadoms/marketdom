# Guía de Deploy - MarketDom

## Deploy en Vercel

### 1. Preparación

1. Asegúrate de tener todas las dependencias instaladas:
```bash
npm install
```

2. Verifica que el proyecto compile correctamente:
```bash
npm run build
```

### 2. Configuración de Variables de Entorno en Vercel

En el dashboard de Vercel, configura las siguientes variables de entorno:

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de Supabase (solo para operaciones admin)

#### Mercado Pago
- `MERCADOPAGO_ACCESS_TOKEN`: Token de acceso de Mercado Pago
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`: Clave pública de Mercado Pago (opcional, si la usas en el frontend)

#### App
- `NEXT_PUBLIC_APP_URL`: URL de tu aplicación en producción (ej: https://tu-app.vercel.app)

### 3. Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)

2. Ejecuta el script SQL en `supabase/schema.sql` desde el SQL Editor

3. Configura Storage:
   - Crea un bucket llamado `products`
   - Configura políticas públicas para lectura
   - Configura políticas RLS para escritura (solo usuarios autenticados)

4. Crea un usuario SuperAdmin:
   - Regístrate normalmente
   - Ejecuta el SQL proporcionado en `supabase/README.md` para asignar el rol de superadmin

### 4. Configuración de Mercado Pago

1. Crea una cuenta en [Mercado Pago](https://www.mercadopago.com.ar)

2. Obtén tu Access Token desde el panel de desarrolladores

3. Configura las URLs de retorno en Mercado Pago:
   - Success: `https://tu-app.vercel.app/payment/success`
   - Failure: `https://tu-app.vercel.app/payment/failure`
   - Pending: `https://tu-app.vercel.app/payment/pending`

### 5. Deploy en Vercel

1. **Conecta tu repositorio de GitHub a Vercel:**
   - Ve a [Vercel](https://vercel.com) e inicia sesión
   - Haz clic en "Add New Project"
   - Selecciona "Import Git Repository"
   - Conecta tu cuenta de GitHub si aún no lo has hecho
   - Selecciona el repositorio `inframegadoms/marketdom`
   - Haz clic en "Import"

2. **Configuración del proyecto:**
   - Vercel detectará automáticamente que es un proyecto Next.js
   - Framework Preset: Next.js (debe detectarse automáticamente)
   - Root Directory: `./` (raíz del proyecto)
   - Build Command: `npm run build` (por defecto)
   - Output Directory: `.next` (por defecto)
   - Install Command: `npm install` (por defecto)

3. **Configura las variables de entorno:**
   - En la sección "Environment Variables", agrega todas las variables mencionadas en la sección 2
   - Asegúrate de agregarlas para todos los ambientes (Production, Preview, Development)

4. **Haz clic en "Deploy"**
   - Vercel comenzará a construir y desplegar tu aplicación
   - El proceso puede tomar unos minutos
   - Una vez completado, recibirás una URL de producción (ej: `https://marketdom.vercel.app`)

### 6. Verificación Post-Deploy

1. Verifica que la aplicación carga correctamente

2. Prueba el registro de usuarios

3. Verifica que los dashboards funcionan según el rol

4. Prueba la creación de productos (como vendedor)

5. Prueba una compra de prueba (como cliente)

## Notas Importantes

- **Storage de Supabase**: Asegúrate de configurar correctamente las políticas de Storage para que las imágenes de productos se puedan subir y visualizar
- **RLS Policies**: Revisa las políticas RLS en Supabase para asegurar que los usuarios solo puedan acceder a sus propios datos
- **Mercado Pago**: En producción, asegúrate de usar las credenciales de producción, no las de prueba
- **Dominio Personalizado**: Puedes configurar un dominio personalizado en Vercel después del deploy

## Troubleshooting

### Error: "Invalid API key"
- Verifica que las variables de entorno estén correctamente configuradas en Vercel
- Asegúrate de usar las claves correctas (producción vs desarrollo)

### Error: "Storage bucket not found"
- Verifica que el bucket `products` esté creado en Supabase
- Revisa las políticas de Storage

### Error: "Payment preference creation failed"
- Verifica que el token de Mercado Pago sea válido
- Asegúrate de que las URLs de retorno estén correctamente configuradas

