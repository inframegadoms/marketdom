import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

/**
 * Funciones de gamificación para Server Components
 */

/**
 * Inicializa coins para un nuevo usuario (Server Component)
 * Usa el cliente admin para bypass RLS
 */
export async function initializeUserCoinsServer(userId: string): Promise<boolean> {
  // Usar cliente admin para bypass RLS
  const supabase = createSupabaseAdminClient()
  
  // Verificar que el cliente admin se creó correctamente
  if (!supabase) {
    console.error('[initializeUserCoinsServer] Error: No se pudo crear el cliente admin de Supabase')
    console.error('[initializeUserCoinsServer] Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurada')
    return false
  }
  
  console.log(`[initializeUserCoinsServer] Cliente admin creado. Verificando si ya existe user_coins para: ${userId}`)
  
  // Verificar si ya existe
  const { data: existing, error: existingError } = await supabase
    .from('user_coins')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('[initializeUserCoinsServer] Error verificando existencia:', existingError)
  }

  if (existing) {
    console.log(`[initializeUserCoinsServer] user_coins ya existe para: ${userId}`)
    return true
  }
  
  console.log(`[initializeUserCoinsServer] Creando nuevo user_coins para: ${userId}`)

  // Generar código de referido único
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let referralCode = ''
  let exists = true
  let attempts = 0
  
  while (exists && attempts < 10) {
    referralCode = ''
    for (let i = 0; i < 8; i++) {
      referralCode += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    // Verificar si el código ya existe
    const { data: check } = await supabase
      .from('user_coins')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle()
    
    exists = !!check
    attempts++
  }
  
  if (exists) {
    console.error('No se pudo generar un código de referido único después de 10 intentos')
    return false
  }

  // Crear registro inicial con 50 MGC de bienvenida
  console.log(`[initializeUserCoinsServer] Insertando user_coins con código: ${referralCode}`)
  const { data: insertData, error: insertError } = await supabase
    .from('user_coins')
    .insert({
      user_id: userId,
      balance: 50,
      total_earned: 50,
      referral_code: referralCode
    })
    .select()

  if (insertError) {
    console.error('[initializeUserCoinsServer] Error insertando user_coins:', insertError)
    console.error('[initializeUserCoinsServer] Código de error:', insertError.code)
    console.error('[initializeUserCoinsServer] Mensaje:', insertError.message)
    return false
  }
  
  console.log(`[initializeUserCoinsServer] user_coins creado exitosamente:`, insertData)

  // Crear transacción de bienvenida
  await supabase.from('coin_transactions').insert({
    user_id: userId,
    amount: 50,
    type: 'earned',
    source: 'welcome_bonus',
    description: 'Bienvenida a MarketDom'
  })

  return true
}

/**
 * Registra un referido (Server Component)
 * Usa el cliente admin para bypass RLS
 */
export async function registerReferralServer(
  referrerId: string,
  referredId: string,
  referralCode: string
): Promise<boolean> {
  console.log(`[registerReferralServer] Iniciando registro. Referrer: ${referrerId}, Referred: ${referredId}, Code: ${referralCode}`)
  
  // Usar cliente admin para bypass RLS
  const supabase = createSupabaseAdminClient()
  
  if (!supabase) {
    console.error('[registerReferralServer] ❌ No se pudo crear el cliente admin')
    return false
  }

  // Verificar que el código pertenece al referrer
  console.log(`[registerReferralServer] Verificando código de referido...`)
  const { data: referrerCoins, error: referrerCheckError } = await supabase
    .from('user_coins')
    .select('referral_code')
    .eq('user_id', referrerId)
    .maybeSingle()

  if (referrerCheckError) {
    console.error('[registerReferralServer] ❌ Error verificando referrer:', referrerCheckError)
    return false
  }

  if (!referrerCoins || referrerCoins.referral_code !== referralCode) {
    console.error(`[registerReferralServer] ❌ Código no coincide. Esperado: ${referralCode}, Encontrado: ${referrerCoins?.referral_code || 'null'}`)
    return false
  }

  console.log(`[registerReferralServer] ✅ Código verificado correctamente`)

  // Verificar que no existe ya
  console.log(`[registerReferralServer] Verificando si el referido ya existe...`)
  const { data: existing, error: existingError } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', referredId)
    .maybeSingle()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('[registerReferralServer] ❌ Error verificando existencia:', existingError)
    return false
  }

  if (existing) {
    console.log(`[registerReferralServer] ℹ️ Referido ya existe, no se creará duplicado`)
    return true // Retornar true porque ya existe
  }

  // Crear registro de referido
  console.log(`[registerReferralServer] 📝 Creando registro de referido...`)
  const { data: referralData, error: referralInsertError } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrerId,
      referred_id: referredId,
      referral_code: referralCode,
      status: 'registered'
    })
    .select()

  if (referralInsertError) {
    console.error('[registerReferralServer] ❌ Error insertando referral:', referralInsertError)
    console.error('[registerReferralServer] Código:', referralInsertError.code)
    console.error('[registerReferralServer] Mensaje:', referralInsertError.message)
    return false
  }

  console.log(`[registerReferralServer] ✅ Referral creado:`, referralData)

  // Otorgar recompensa al referrer
  console.log(`[registerReferralServer] 💰 Otorgando recompensa de 50 MGC al referrer...`)
  const { error: coinsError } = await supabase.rpc('add_user_coins', {
    p_user_id: referrerId,
    p_amount: 50,
    p_source: 'referral',
    p_description: 'Amigo referido se registró',
    p_reference_id: referredId
  })

  if (coinsError) {
    console.error('[registerReferralServer] ❌ Error otorgando coins:', coinsError)
    // No retornar false aquí, el referral ya se creó
  } else {
    console.log(`[registerReferralServer] ✅ Recompensa otorgada exitosamente`)
  }

  return true
}

