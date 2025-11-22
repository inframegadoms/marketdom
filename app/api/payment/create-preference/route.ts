import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createPaymentPreference } from '@/lib/mercado-pago'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, total, title, description } = body

    const preference = await createPaymentPreference({
      title: title || 'Compra en MarketDom',
      description: description || `Orden #${orderId}`,
      quantity: 1,
      unit_price: total,
      payer_email: user.email!,
      external_reference: orderId,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?order_id=${orderId}`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failure?order_id=${orderId}`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/payment/pending?order_id=${orderId}`,
      },
    })

    return NextResponse.json({ preference })
  } catch (error: any) {
    console.error('Error creating payment preference:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear preferencia de pago' },
      { status: 500 }
    )
  }
}

