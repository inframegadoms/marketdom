import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createPaymentPreference } from '@/lib/mercado-pago'
import { PlanType } from '@/types/database.types'
import { PLAN_NAMES } from '@/lib/plans'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { plan, price } = body

    if (!plan || !['gratuito', 'basico', 'medio', 'ilimitado'].includes(plan)) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 })
    }

    if (!price || price <= 0) {
      return NextResponse.json({ error: 'Precio no válido' }, { status: 400 })
    }

    // Verificar que el usuario tiene un perfil de vendedor
    const { data: vendedorProfile } = await supabase
      .from('vendedor_profiles')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single()

    if (!vendedorProfile) {
      return NextResponse.json({ error: 'Perfil de vendedor no encontrado' }, { status: 404 })
    }

    // Crear referencia única para el pago del plan
    const externalReference = `plan-${vendedorProfile.id}-${plan}-${Date.now()}`

    const preference = await createPaymentPreference({
      title: `Upgrade a ${PLAN_NAMES[plan as PlanType]}`,
      description: `Pago del plan ${PLAN_NAMES[plan as PlanType]} para tu tienda`,
      quantity: 1,
      unit_price: price,
      payer_email: user.email!,
      external_reference: externalReference,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendedor/plan/payment/success?plan=${plan}&ref=${externalReference}`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendedor/plan/payment/failure?plan=${plan}&ref=${externalReference}`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendedor/plan/payment/pending?plan=${plan}&ref=${externalReference}`,
      },
    })

    return NextResponse.json({ preference })
  } catch (error: any) {
    console.error('Error creating plan payment preference:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear preferencia de pago' },
      { status: 500 }
    )
  }
}

