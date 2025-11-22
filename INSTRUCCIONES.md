# Instrucciones de Uso - MarketDom

## 🚀 Inicio Rápido

### 1. Instalación

```bash
npm install
```

### 2. Configuración de Variables de Entorno

Copia el archivo `.env.example` a `.env` y completa las variables:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:
- Supabase URL y keys
- Mercado Pago Access Token
- URL de la aplicación

### 3. Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script SQL en `supabase/schema.sql`
3. Crea un bucket de Storage llamado `products` con políticas públicas
4. Consulta `supabase/README.md` para más detalles

### 4. Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 👥 Roles y Permisos

### SuperAdmin
- Acceso completo a todos los datos
- Gestión de usuarios, vendedores, productos y órdenes
- Dashboard con estadísticas generales

**Para crear un SuperAdmin:**
1. Regístrate normalmente
2. Ejecuta este SQL en Supabase:
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"superadmin"'
)
WHERE email = 'tu-email@ejemplo.com';
```

### Vendedor
- Publicar productos (según plan contratado)
- Configurar métodos de envío
- Crear y gestionar cupones
- Ver órdenes de su tienda
- Gestionar su plan

**Planes disponibles:**
- **Gratuito**: 3 productos
- **Básico**: 10 productos ($1,000 MXN)
- **Medio**: 25 productos ($2,500 MXN)
- **Ilimitado**: Sin límite ($5,000 MXN)

### Cliente
- Explorar marketplace
- Realizar compras
- Ver historial de órdenes
- Gestionar perfil

## 🛍️ Flujo de Compra

1. Cliente navega por el marketplace
2. Selecciona un producto
3. Elige cantidad, método de envío y aplica cupón (opcional)
4. Se crea una orden pendiente
5. Se redirige a Mercado Pago para el pago
6. Al confirmar el pago, la orden se marca como "paid"
7. El vendedor puede actualizar el estado a "shipped" y luego "delivered"

## 📦 Funcionalidades Principales

### Para Vendedores

#### Gestión de Productos
- Crear productos con imágenes
- Editar productos existentes
- Controlar stock y estado (draft/active/inactive)
- Límite según plan contratado

#### Métodos de Envío
- Crear múltiples métodos de envío
- Configurar precio y tiempo estimado
- Activar/desactivar métodos

#### Cupones
- Crear cupones con descuento porcentual o fijo
- Configurar límites de uso y fecha de expiración
- Establecer compra mínima y descuento máximo

### Para Clientes

#### Marketplace
- Catálogo de productos activos
- Vista detallada de productos
- Aplicación de cupones
- Selección de método de envío

#### Órdenes
- Historial completo de compras
- Seguimiento de estado de órdenes
- Detalles de envío y pago

## 💳 Integración con Mercado Pago

La aplicación está configurada para usar Mercado Pago como procesador de pagos:

1. Se crea una preferencia de pago al confirmar la compra
2. El cliente es redirigido a Mercado Pago
3. Después del pago, se redirige de vuelta a la aplicación
4. La orden se actualiza automáticamente

**Nota:** En producción, asegúrate de usar las credenciales de producción de Mercado Pago.

## 🔒 Seguridad

- Autenticación mediante Supabase Auth
- Row Level Security (RLS) en todas las tablas
- Validación de roles en cada dashboard
- Políticas de acceso según tipo de usuario

## 📝 Notas Importantes

1. **Storage**: Las imágenes de productos se almacenan en Supabase Storage. Asegúrate de configurar las políticas correctamente.

2. **RLS**: Todas las tablas tienen políticas RLS activadas. Revisa `supabase/schema.sql` para ver las políticas implementadas.

3. **Planes**: Los planes se actualizan directamente en la base de datos. En producción, deberías integrar un sistema de pagos recurrente.

4. **Mercado Pago**: La integración actual crea preferencias de pago. Para webhooks y actualizaciones automáticas, necesitarías configurar endpoints adicionales.

## 🐛 Troubleshooting

### Error al subir imágenes
- Verifica que el bucket `products` existe en Supabase
- Revisa las políticas de Storage

### Error de autenticación
- Verifica las variables de entorno de Supabase
- Asegúrate de que el usuario tenga el rol correcto en `user_metadata`

### Error en Mercado Pago
- Verifica que el Access Token sea válido
- Asegúrate de usar credenciales de producción en producción

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs)
- [Guía de Deploy](DEPLOY.md)

