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
    const { userId } = body

    if (userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('user_coins')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, message: 'Coins ya inicializados' })
    }

    // Generar código de referido
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let referralCode = ''
    let exists = true
    
    while (exists) {
      referralCode = ''
      for (let i = 0; i < 8; i++) {
        referralCode += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      
      const { data: check } = await supabase
        .from('user_coins')
        .select('id')
        .eq('referral_code', referralCode)
        .single()
      
      exists = !!check
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
      return NextResponse.json({ error: 'Error al inicializar coins' }, { status: 500 })
    }

    // Crear transacción de bienvenida
    await supabase.from('coin_transactions').insert({
      user_id: userId,
      amount: 50,
      type: 'earned',
      source: 'welcome_bonus',
      description: 'Bienvenida a MarketDom'
    })

    return NextResponse.json({ success: true, message: 'Coins inicializados' })
  } catch (error: any) {
    console.error('Error initializing coins:', error)
    return NextResponse.json(
      { error: error.message || 'Error al inicializar coins' },
      { status: 500 }
    )
  }
}

