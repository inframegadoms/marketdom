import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * API Route para procesar recompensas de gamificación
 * Se llama desde el servidor después de eventos como compras
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, orderId, orderTotal, referralCode } = body

    // Procesar según la acción
    switch (action) {
      case 'purchase_completed': {
        if (!orderId) {
          return NextResponse.json({ error: 'orderId requerido' }, { status: 400 })
        }

        // Contar compras del usuario
        const { count: purchaseCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('cliente_id', user.id)
          .eq('status', 'paid')

        const totalPurchases = purchaseCount || 0

        // Primera compra
        if (totalPurchases === 1) {
          await supabase.rpc('add_user_coins', {
            p_user_id: user.id,
            p_amount: 100,
            p_source: 'purchase',
            p_description: 'Primera compra realizada',
            p_reference_id: orderId
          })
          await updateQuestProgress(supabase, user.id, 'first_purchase')
        }
        // Segunda compra
        else if (totalPurchases === 2) {
          await supabase.rpc('add_user_coins', {
            p_user_id: user.id,
            p_amount: 50,
            p_source: 'purchase',
            p_description: 'Segunda compra realizada',
            p_reference_id: orderId
          })
          await updateQuestProgress(supabase, user.id, 'second_purchase')
        }
        // Quinta compra
        else if (totalPurchases === 5) {
          await supabase.rpc('add_user_coins', {
            p_user_id: user.id,
            p_amount: 150,
            p_source: 'purchase',
            p_description: 'Quinta compra realizada',
            p_reference_id: orderId
          })
          await updateQuestProgress(supabase, user.id, 'fifth_purchase')
        }
        // Décima compra
        else if (totalPurchases === 10) {
          await supabase.rpc('add_user_coins', {
            p_user_id: user.id,
            p_amount: 300,
            p_source: 'purchase',
            p_description: 'Décima compra realizada',
            p_reference_id: orderId
          })
          await updateQuestProgress(supabase, user.id, 'tenth_purchase')
        }

        // Recompensas por valor de compra
        if (orderTotal) {
          const total = parseFloat(orderTotal.toString())
          if (total >= 2500) {
            await supabase.rpc('add_user_coins', {
              p_user_id: user.id,
              p_amount: 200,
              p_source: 'purchase',
              p_description: 'Compra premium (+$2,500)',
              p_reference_id: orderId
            })
            await updateQuestProgress(supabase, user.id, 'purchase_over_2500')
          } else if (total >= 1000) {
            await supabase.rpc('add_user_coins', {
              p_user_id: user.id,
              p_amount: 100,
              p_source: 'purchase',
              p_description: 'Compra grande (+$1,000)',
              p_reference_id: orderId
            })
            await updateQuestProgress(supabase, user.id, 'purchase_over_1000')
          } else if (total >= 500) {
            await supabase.rpc('add_user_coins', {
              p_user_id: user.id,
              p_amount: 50,
              p_source: 'purchase',
              p_description: 'Compra mediana (+$500)',
              p_reference_id: orderId
            })
            await updateQuestProgress(supabase, user.id, 'purchase_over_500')
          }
        }

        // Actualizar referidos si el usuario fue referido
        const { data: referral } = await supabase
          .from('referrals')
          .select('*')
          .eq('referred_id', user.id)
          .eq('status', 'registered')
          .single()

        if (referral && totalPurchases === 1) {
          // Primera compra del referido
          await supabase.rpc('add_user_coins', {
            p_user_id: referral.referrer_id,
            p_amount: 100,
            p_source: 'referral',
            p_description: 'Tu amigo referido realizó su primera compra',
            p_reference_id: orderId
          })
          await updateQuestProgress(supabase, referral.referrer_id, 'refer_friend_purchase')

          // Actualizar estado del referido
          await supabase
            .from('referrals')
            .update({
              status: 'first_purchase',
              updated_at: new Date().toISOString()
            })
            .eq('id', referral.id)
        }

        return NextResponse.json({ success: true, message: 'Recompensas procesadas' })
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error processing rewards:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar recompensas' },
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
      const progressData = progress || await supabase
        .from('quest_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('quest_id', quest.id)
        .single()
        .then(({ data }) => data)

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

