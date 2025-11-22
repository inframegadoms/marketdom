import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Funciones de gamificación para Server Components
 */

/**
 * Inicializa coins para un nuevo usuario (Server Component)
 */
export async function initializeUserCoinsServer(userId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  
  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('user_coins')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) return true

  // Generar código de referido
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let referralCode = ''
  for (let i = 0; i < 8; i++) {
    referralCode += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // Crear registro inicial con 50 MGC de bienvenida
  const { error: insertError } = await supabase
    .from('user_coins')
    .insert({
      user_id: userId,
      balance: 50,
      total_earned: 50,
      referral_code: referralCode
    })

  if (insertError) {
    console.error('Error initializing user coins:', insertError)
    return false
  }

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
 */
export async function registerReferralServer(
  referrerId: string,
  referredId: string,
  referralCode: string
): Promise<boolean> {
  const supabase = createSupabaseServerClient()

  // Verificar que el código pertenece al referrer
  const { data: referrerCoins } = await supabase
    .from('user_coins')
    .select('referral_code')
    .eq('user_id', referrerId)
    .single()

  if (!referrerCoins || referrerCoins.referral_code !== referralCode) {
    return false
  }

  // Verificar que no existe ya
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', referredId)
    .single()

  if (existing) {
    return false
  }

  // Crear registro de referido
  const { error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrerId,
      referred_id: referredId,
      referral_code: referralCode,
      status: 'registered'
    })

  if (error) {
    console.error('Error registering referral:', error)
    return false
  }

  // Otorgar recompensa al referrer
  await supabase.rpc('add_user_coins', {
    p_user_id: referrerId,
    p_amount: 50,
    p_source: 'referral',
    p_description: 'Amigo referido se registró',
    p_reference_id: referredId
  })

  return true
}

