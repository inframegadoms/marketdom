# MarketDom - Plataforma Marketplace

Plataforma web marketplace completa con autenticación Supabase, integración Mercado Pago y dashboards para SuperAdmin, Vendedores y Clientes.

## Características

- 🔐 Autenticación con Supabase
- 👤 Dashboards para SuperAdmin, Vendedores y Clientes
- 💳 Integración con Mercado Pago
- 📦 Sistema de planes para vendedores
- 🚚 Gestión de métodos de envío
- 🎫 Sistema de cupones
- 🖼️ Almacenamiento de imágenes en Supabase Storage

## Planes de Vendedor

- **Gratuito**: 3 productos publicados
- **Básico**: 10 productos
- **Medio**: 25 productos
- **Ilimitado**: Sin límite de productos

## Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

3. Configurar Supabase:
   - Crear proyecto en Supabase
   - Ejecutar el script SQL en `supabase/schema.sql`
   - Configurar Storage buckets

4. Ejecutar en desarrollo:
```bash
npm run dev
```

## Deploy

El proyecto está configurado para deploy en Vercel. Solo necesitas conectar tu repositorio y configurar las variables de entorno.

