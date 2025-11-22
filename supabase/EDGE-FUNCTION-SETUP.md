# 🚀 Configuración de Edge Function para Gamificación

Esta Edge Function se ejecuta directamente en Supabase y tiene acceso completo a la base de datos, evitando problemas de RLS.

## 📋 Requisitos

1. CLI de Supabase instalado: `npm install -g supabase`
2. Proyecto Supabase configurado
3. Variables de entorno configuradas

## 🔧 Pasos para Desplegar

### 1. Inicializar Supabase CLI (si no lo has hecho)

```bash
supabase login
supabase link --project-ref tu-project-ref
```

Para obtener tu `project-ref`:
- Ve a tu proyecto en Supabase Dashboard
- Settings → API
- El "Reference ID" es tu project-ref

### 2. Desplegar la Edge Function

```bash
supabase functions deploy initialize-user-coins
```

### 3. Configurar Variables de Entorno (si es necesario)

Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se configuran automáticamente cuando haces `supabase link`.

## 📝 Uso desde el Código

Una vez desplegada, puedes llamarla desde tu código:

```typescript
// En app/auth/callback/route.ts o donde necesites
const response = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/initialize-user-coins`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      userId: user.id,
      referralCode: referralCode // opcional
    })
  }
)

const data = await response.json()
```

## ✅ Ventajas

- ✅ Se ejecuta en Supabase (más rápido)
- ✅ Bypass completo de RLS
- ✅ No requiere políticas adicionales
- ✅ Más confiable para operaciones críticas

## ⚠️ Nota

Si prefieres usar la Edge Function en lugar del código actual, necesitarás:
1. Desplegar la función
2. Actualizar `app/auth/callback/route.ts` para llamarla
3. Actualizar cualquier otro lugar que use `initializeUserCoinsServer`

