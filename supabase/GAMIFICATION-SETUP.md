# 🎮 Configuración del Sistema de Gamificación

Esta guía te ayudará a configurar el sistema completo de gamificación y referidos para MarketDom.

## 📋 Requisitos Previos

1. ✅ Proyecto Supabase configurado
2. ✅ Base de datos inicial creada
3. ✅ Variables de entorno configuradas

## 🚀 Pasos para Configurar

### Paso 1: Ejecutar el Schema de Gamificación

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query**
4. Copia todo el contenido del archivo `supabase/gamification-schema.sql`
5. Pégalo en el SQL Editor
6. Haz clic en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)

Este script creará:
- ✅ Tabla `user_coins` - Saldo y estadísticas de Megacoins
- ✅ Tabla `coin_transactions` - Historial de transacciones
- ✅ Tabla `quests` - Misiones disponibles
- ✅ Tabla `quest_progress` - Progreso de misiones por usuario
- ✅ Tabla `referrals` - Sistema de referidos
- ✅ Tabla `user_badges` - Badges de logros
- ✅ Tabla `coin_redemptions` - Canjes de coins
- ✅ Tabla `social_shares` - Tracking de compartidos en redes
- ✅ Funciones RPC para gestionar coins
- ✅ Triggers automáticos
- ✅ Políticas RLS (Row Level Security)

### Paso 2: Verificar las Tablas Creadas

Ejecuta esta consulta para verificar que todas las tablas fueron creadas:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_coins',
    'coin_transactions',
    'quests',
    'quest_progress',
    'referrals',
    'user_badges',
    'coin_redemptions',
    'social_shares'
  )
ORDER BY table_name;
```

Deberías ver 8 tablas listadas.

### Paso 3: Verificar las Misiones Iniciales

Las misiones iniciales se crean automáticamente. Verifica que existan:

```sql
SELECT code, name, reward_amount, quest_type 
FROM quests 
WHERE is_active = true 
ORDER BY quest_type, reward_amount DESC;
```

Deberías ver 13 misiones activas.

### Paso 4: Verificar las Funciones RPC

Verifica que las funciones RPC estén creadas:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'add_user_coins',
    'spend_user_coins',
    'generate_referral_code',
    'calculate_user_level'
  );
```

## 🎯 Funcionalidades Implementadas

### 1. Sistema de Megacoins (MGC)
- ✅ Saldo de coins por usuario
- ✅ Historial de transacciones
- ✅ Niveles automáticos (Bronce, Plata, Oro, Platino, Diamante)
- ✅ Código de referido único por usuario

### 2. Misiones/Quests
- ✅ Completar perfil (50 MGC)
- ✅ Primera compra (100 MGC)
- ✅ Segunda compra (50 MGC)
- ✅ Quinta compra (150 MGC)
- ✅ Décima compra (300 MGC)
- ✅ Invitar amigo (50 MGC)
- ✅ Amigo referido compra (100 MGC)
- ✅ Compartir producto (10 MGC)
- ✅ Compartir tienda (25 MGC)
- ✅ Dejar reseña (20 MGC)
- ✅ Compra > $500 (50 MGC)
- ✅ Compra > $1,000 (100 MGC)
- ✅ Compra > $2,500 (200 MGC)

### 3. Sistema de Referidos
- ✅ Código único por usuario
- ✅ Tracking de referidos
- ✅ Recompensas automáticas
- ✅ Estados: pending, registered, first_purchase, rewarded

### 4. Dashboard de Gamificación
- ✅ Vista de saldo y nivel
- ✅ Progreso de misiones
- ✅ Lista de referidos
- ✅ Historial de transacciones
- ✅ Compartir código de referido

### 5. Integraciones Automáticas
- ✅ Recompensas en registro (50 MGC bienvenida)
- ✅ Recompensas en compras
- ✅ Recompensas en completar perfil
- ✅ Recompensas en referidos

## 📱 Uso del Sistema

### Para Usuarios Clientes

1. **Registro**: Al registrarse, reciben 50 MGC automáticamente
2. **Dashboard**: Acceden a `/dashboard/cliente/gamification` para ver su saldo
3. **Referidos**: Comparten su código único para ganar coins
4. **Misiones**: Completar acciones para ganar más coins
5. **Canje**: (Próximamente) Canjear coins por descuentos

### Para Desarrolladores

#### Obtener coins de un usuario:
```typescript
import { getUserCoins } from '@/lib/gamification'

const coins = await getUserCoins(userId)
console.log(coins.balance) // Saldo actual
console.log(coins.referral_code) // Código de referido
```

#### Agregar coins:
```typescript
import { addCoins } from '@/lib/gamification'

await addCoins(userId, 100, 'purchase', 'Primera compra', orderId)
```

#### Actualizar progreso de misión:
```typescript
import { updateQuestProgress } from '@/lib/gamification'

await updateQuestProgress(userId, 'first_purchase')
```

## 🔒 Seguridad

Todas las tablas tienen políticas RLS configuradas:
- Los usuarios solo pueden ver sus propios datos
- Las funciones RPC están protegidas
- Los códigos de referido son únicos y validados

## 📊 Métricas y Analytics

Puedes consultar métricas útiles:

```sql
-- Total de coins otorgados
SELECT SUM(amount) as total_coins_earned
FROM coin_transactions
WHERE type = 'earned';

-- Usuarios por nivel
SELECT level, COUNT(*) as usuarios
FROM user_coins
GROUP BY level
ORDER BY 
  CASE level
    WHEN 'bronce' THEN 1
    WHEN 'plata' THEN 2
    WHEN 'oro' THEN 3
    WHEN 'platino' THEN 4
    WHEN 'diamante' THEN 5
  END;

-- Top referidores
SELECT 
  r.referrer_id,
  COUNT(*) as total_referidos
FROM referrals r
GROUP BY r.referrer_id
ORDER BY total_referidos DESC
LIMIT 10;
```

## 🐛 Troubleshooting

### Error: "function add_user_coins does not exist"
- Verifica que ejecutaste el script completo de `gamification-schema.sql`
- Las funciones RPC deben estar creadas

### Error: "new row violates row-level security policy"
- Verifica que las políticas RLS estén activas
- Asegúrate de que el usuario esté autenticado

### Los coins no se inicializan al registrarse
- Verifica que la API route `/api/gamification/initialize` esté funcionando
- Revisa los logs del servidor para errores

## 🚀 Próximos Pasos

1. **Canje de Coins**: Implementar sistema de canje por descuentos
2. **Badges**: Agregar más badges y logros
3. **Leaderboard**: Tabla de líderes de referidos
4. **Notificaciones**: Alertas cuando se ganan coins
5. **Analytics Dashboard**: Panel para SuperAdmin con métricas

## 📝 Notas Importantes

- Los coins se otorgan automáticamente en ciertas acciones
- El nivel se calcula automáticamente basado en `total_earned`
- Los códigos de referido son únicos y se generan automáticamente
- Las misiones se pueden activar/desactivar desde la tabla `quests`

¡Listo! Tu sistema de gamificación está configurado y funcionando. 🎉

