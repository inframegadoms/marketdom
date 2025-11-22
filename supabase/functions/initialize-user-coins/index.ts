// Supabase Edge Function para inicializar user_coins
// Esta función se ejecuta en el servidor de Supabase y tiene acceso completo a la base de datos

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente Supabase con service_role (bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId, referralCode } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('user_coins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, message: 'Coins ya inicializados', existing: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generar código de referido único
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let generatedReferralCode = ''
    let exists = true
    let attempts = 0
    
    while (exists && attempts < 10) {
      generatedReferralCode = ''
      for (let i = 0; i < 8; i++) {
        generatedReferralCode += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      
      const { data: check } = await supabase
        .from('user_coins')
        .select('id')
        .eq('referral_code', generatedReferralCode)
        .maybeSingle()
      
      exists = !!check
      attempts++
    }

    if (exists) {
      return new Response(
        JSON.stringify({ error: 'No se pudo generar un código de referido único' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear registro inicial con 50 MGC de bienvenida
    const { data: insertData, error: insertError } = await supabase
      .from('user_coins')
      .insert({
        user_id: userId,
        balance: 50,
        total_earned: 50,
        referral_code: generatedReferralCode
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error insertando user_coins:', insertError)
      return new Response(
        JSON.stringify({ error: 'Error al crear user_coins', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear transacción de bienvenida
    await supabase.from('coin_transactions').insert({
      user_id: userId,
      amount: 50,
      type: 'earned',
      source: 'welcome_bonus',
      description: 'Bienvenida a MarketDom'
    })

    // Si hay código de referido, procesarlo
    if (referralCode) {
      // Buscar el referrer
      const { data: referrerCoins } = await supabase
        .from('user_coins')
        .select('user_id')
        .eq('referral_code', referralCode)
        .maybeSingle()

      if (referrerCoins) {
        // Verificar que no existe ya
        const { data: existingReferral } = await supabase
          .from('referrals')
          .select('id')
          .eq('referred_id', userId)
          .maybeSingle()

        if (!existingReferral) {
          // Crear registro de referido
          await supabase.from('referrals').insert({
            referrer_id: referrerCoins.user_id,
            referred_id: userId,
            referral_code: referralCode,
            status: 'registered'
          })

          // Otorgar recompensa al referrer
          await supabase.rpc('add_user_coins', {
            p_user_id: referrerCoins.user_id,
            p_amount: 50,
            p_source: 'referral',
            p_description: 'Amigo referido se registró',
            p_reference_id: userId
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Coins inicializados exitosamente',
        data: insertData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error en Edge Function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

