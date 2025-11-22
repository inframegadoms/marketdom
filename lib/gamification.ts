import { createSupabaseClient } from '@/lib/supabase/client'
import { UserCoins, Quest, QuestProgress, Referral, CoinTransaction } from '@/types/database.types'

/**
 * Obtiene el saldo de coins de un usuario
 */
export async function getUserCoins(userId: string): Promise<UserCoins | null> {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase
    .from('user_coins')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle() // Usar maybeSingle en lugar de single para evitar error si no existe

  if (error) {
    // Si el error es que no existe (PGRST116), retornar null (es normal)
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error getting user coins:', error)
    return null
  }

  return data
}

/**
 * Inicializa coins para un nuevo usuario
 */
export async function initializeUserCoins(userId: string): Promise<UserCoins | null> {
  const supabase = createSupabaseClient()
  
  // Verificar si ya existe
  const existing = await getUserCoins(userId)
  if (existing) return existing

  // Crear registro inicial con 50 MGC de bienvenida
  const { data, error } = await supabase
    .rpc('add_user_coins', {
      p_user_id: userId,
      p_amount: 50,
      p_source: 'welcome_bonus',
      p_description: 'Bienvenida a MarketDom'
    })

  if (error) {
    console.error('Error initializing user coins:', error)
    // Intentar crear directamente si la función RPC falla
    const { data: directData, error: directError } = await supabase
      .from('user_coins')
      .insert({
        user_id: userId,
        balance: 50,
        total_earned: 50,
        referral_code: generateReferralCode()
      })
      .select()
      .single()

    if (directError) {
      console.error('Error creating user coins directly:', directError)
      return null
    }

    // Crear transacción de bienvenida
    await supabase.from('coin_transactions').insert({
      user_id: userId,
      amount: 50,
      type: 'earned',
      source: 'welcome_bonus',
      description: 'Bienvenida a MarketDom'
    })

    return directData
  }

  return await getUserCoins(userId)
}

/**
 * Genera un código de referido simple
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sin I, O, 0, 1 para evitar confusión
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Agrega coins a un usuario
 */
export async function addCoins(
  userId: string,
  amount: number,
  source: string,
  description?: string,
  referenceId?: string
): Promise<boolean> {
  const supabase = createSupabaseClient()

  const { error } = await supabase.rpc('add_user_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_source: source,
    p_description: description || null,
    p_reference_id: referenceId || null
  })

  if (error) {
    console.error('Error adding coins:', error)
    return false
  }

  return true
}

/**
 * Gasta coins de un usuario
 */
export async function spendCoins(
  userId: string,
  amount: number,
  source: string,
  description?: string,
  referenceId?: string
): Promise<boolean> {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase.rpc('spend_user_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_source: source,
    p_description: description || null,
    p_reference_id: referenceId || null
  })

  if (error || !data) {
    console.error('Error spending coins:', error)
    return false
  }

  return data
}

/**
 * Obtiene todas las misiones activas
 */
export async function getActiveQuests(): Promise<Quest[]> {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('is_active', true)
    .order('quest_type', { ascending: true })
    .order('reward_amount', { ascending: false })

  if (error) {
    console.error('Error getting quests:', error)
    return []
  }

  return data || []
}

/**
 * Obtiene el progreso de misiones de un usuario
 */
export async function getUserQuestProgress(userId: string): Promise<QuestProgress[]> {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from('quest_progress')
    .select(`
      *,
      quest:quests (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting quest progress:', error)
    return []
  }

  return data || []
}

/**
 * Actualiza el progreso de una misión
 */
export async function updateQuestProgress(
  userId: string,
  questCode: string,
  increment: number = 1
): Promise<boolean> {
  const supabase = createSupabaseClient()

  // Obtener la misión
  const { data: quest } = await supabase
    .from('quests')
    .select('*')
    .eq('code', questCode)
    .eq('is_active', true)
    .single()

  if (!quest) {
    console.error('Quest not found:', questCode)
    return false
  }

  // Obtener o crear progreso
  const { data: progress } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_id', quest.id)
    .single()

  const newProgress = (progress?.progress || 0) + increment
  const target = quest.target_value

  if (progress) {
    // Actualizar progreso existente
    const updateData: any = {
      progress: newProgress,
      updated_at: new Date().toISOString()
    }

    // Si se completó, marcar como completado
    if (newProgress >= target && !progress.completed_at) {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('quest_progress')
      .update(updateData)
      .eq('id', progress.id)

    if (error) {
      console.error('Error updating quest progress:', error)
      return false
    }
  } else {
    // Crear nuevo progreso
    const { error } = await supabase
      .from('quest_progress')
      .insert({
        user_id: userId,
        quest_id: quest.id,
        progress: newProgress,
        target: target,
        completed_at: newProgress >= target ? new Date().toISOString() : null
      })

    if (error) {
      console.error('Error creating quest progress:', error)
      return false
    }
  }

  // Si se completó, otorgar recompensa
  if (newProgress >= target) {
    let progressData = progress
    if (!progressData) {
      const { data: fetchedProgress } = await supabase
        .from('quest_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('quest_id', quest.id)
        .single()
      progressData = fetchedProgress
    }

    if (progressData && !progressData.claimed_at) {
      // Otorgar recompensa
      await addCoins(
        userId,
        quest.reward_amount,
        'quest',
        `Misión completada: ${quest.name}`,
        quest.id
      )

      // Marcar como reclamado
      await supabase
        .from('quest_progress')
        .update({ claimed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('quest_id', quest.id)
    }
  }

  return true
}

/**
 * Obtiene referidos de un usuario
 */
export async function getUserReferrals(userId: string): Promise<Referral[]> {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting referrals:', error)
    return []
  }

  return data || []
}

/**
 * Registra un referido
 */
export async function registerReferral(
  referrerId: string,
  referredId: string,
  referralCode: string
): Promise<boolean> {
  const supabase = createSupabaseClient()

  // Verificar que el código pertenece al referrer
  const { data: referrerCoins } = await supabase
    .from('user_coins')
    .select('referral_code')
    .eq('user_id', referrerId)
    .single()

  if (!referrerCoins || referrerCoins.referral_code !== referralCode) {
    console.error('Invalid referral code')
    return false
  }

  // Verificar que no existe ya
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', referredId)
    .single()

  if (existing) {
    return false // Ya está registrado
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
  await addCoins(
    referrerId,
    50,
    'referral',
    'Amigo referido se registró',
    referredId
  )

  // Actualizar progreso de misión
  await updateQuestProgress(referrerId, 'refer_friend')

  return true
}

/**
 * Obtiene transacciones de coins de un usuario
 */
export async function getUserCoinTransactions(
  userId: string,
  limit: number = 20
): Promise<CoinTransaction[]> {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from('coin_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error getting coin transactions:', error)
    return []
  }

  return data || []
}

/**
 * Obtiene el descuento según el nivel del usuario
 */
export function getLevelDiscount(level: string): number {
  const discounts: Record<string, number> = {
    bronce: 0.05,
    plata: 0.10,
    oro: 0.15,
    platino: 0.20,
    diamante: 0.25
  }
  return discounts[level] || 0
}

/**
 * Formatea el nombre del nivel
 */
export function getLevelName(level: string): string {
  const names: Record<string, string> = {
    bronce: 'Bronce',
    plata: 'Plata',
    oro: 'Oro',
    platino: 'Platino',
    diamante: 'Diamante'
  }
  return names[level] || 'Bronce'
}

/**
 * Obtiene el color del nivel
 */
export function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    bronce: 'from-amber-600 to-amber-800',
    plata: 'from-gray-400 to-gray-600',
    oro: 'from-yellow-400 to-yellow-600',
    platino: 'from-cyan-400 to-cyan-600',
    diamante: 'from-purple-400 to-purple-600'
  }
  return colors[level] || 'from-amber-600 to-amber-800'
}

