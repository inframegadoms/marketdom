import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { referrerCode, referredId } = body

    if (referredId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!referrerCode) {
      return NextResponse.json({ error: 'Código de referido requerido' }, { status: 400 })
    }

    // Buscar el referrer por código
    const { data: referrerCoins } = await supabase
      .from('user_coins')
      .select('user_id')
      .eq('referral_code', referrerCode)
      .single()

    if (!referrerCoins) {
      return NextResponse.json({ error: 'Código de referido inválido' }, { status: 400 })
    }

    // Verificar que no existe ya
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', referredId)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, message: 'Referido ya registrado' })
    }

    // Crear registro de referido
    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerCoins.user_id,
        referred_id: referredId,
        referral_code: referrerCode,
        status: 'registered'
      })

    if (referralError) {
      console.error('Error registering referral:', referralError)
      return NextResponse.json({ error: 'Error al registrar referido' }, { status: 500 })
    }

    // Otorgar recompensa al referrer
    await supabase.rpc('add_user_coins', {
      p_user_id: referrerCoins.user_id,
      p_amount: 50,
      p_source: 'referral',
      p_description: 'Amigo referido se registró',
      p_reference_id: referredId
    })

    // Actualizar progreso de misión del referrer
    await updateQuestProgress(supabase, referrerCoins.user_id, 'refer_friend')

    return NextResponse.json({ success: true, message: 'Referido registrado exitosamente' })
  } catch (error: any) {
    console.error('Error processing referral:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar referido' },
      { status: 500 }
    )
  }
}

/**
 * Helper para actualizar progreso de misiones
 */
async function updateQuestProgress(
  supabase: any,
  userId: string,
  questCode: string,
  increment: number = 1
): Promise<boolean> {
  try {
    // Obtener la misión
    const { data: quest } = await supabase
      .from('quests')
      .select('*')
      .eq('code', questCode)
      .eq('is_active', true)
      .single()

    if (!quest) {
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
      const updateData: any = {
        progress: newProgress,
        updated_at: new Date().toISOString()
      }

      if (newProgress >= target && !progress.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }

      await supabase
        .from('quest_progress')
        .update(updateData)
        .eq('id', progress.id)
    } else {
      await supabase
        .from('quest_progress')
        .insert({
          user_id: userId,
          quest_id: quest.id,
          progress: newProgress,
          target: target,
          completed_at: newProgress >= target ? new Date().toISOString() : null
        })
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
        await supabase.rpc('add_user_coins', {
          p_user_id: userId,
          p_amount: quest.reward_amount,
          p_source: 'quest',
          p_description: `Misión completada: ${quest.name}`,
          p_reference_id: quest.id
        })

        await supabase
          .from('quest_progress')
          .update({ claimed_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('quest_id', quest.id)
      }
    }

    return true
  } catch (error) {
    console.error('Error updating quest progress:', error)
    return false
  }
}

