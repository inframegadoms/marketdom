import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { order_id?: string; payment_id?: string }
}) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (searchParams.order_id) {
    // Update order status
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        mercado_pago_payment_id: searchParams.payment_id || null,
      })
      .eq('id', searchParams.order_id)
      .eq('cliente_id', user.id)

    // Update coupon usage if applicable
    const { data: order } = await supabase
      .from('orders')
      .select('coupon_id, total')
      .eq('id', searchParams.order_id)
      .single()

    if (order?.coupon_id) {
      // Get current used_count and increment
      const { data: coupon } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', order.coupon_id)
        .single()

      if (coupon) {
        await supabase
          .from('coupons')
          .update({ used_count: coupon.used_count + 1 })
          .eq('id', order.coupon_id)
      }
    }

    // Procesar recompensas de gamificación (solo para clientes)
    if (user.user_metadata?.role === 'cliente' && searchParams.order_id) {
      try {
        // Llamar a la API route para procesar recompensas
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await fetch(`${baseUrl}/api/gamification/rewards`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'purchase_completed',
            orderId: searchParams.order_id,
            orderTotal: order?.total
          }),
        })
      } catch (gamificationError) {
        console.error('Error procesando recompensas de gamificación:', gamificationError)
        // No bloquear el flujo si falla la gamificación
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          ¡Pago Exitoso!
        </h1>
        <p className="text-gray-600 mb-6">
          Tu pedido ha sido procesado correctamente. Recibirás un email de confirmación.
        </p>
        <div className="space-y-2">
          <Link
            href="/dashboard/cliente/orders"
            className="block w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Ver Mis Órdenes
          </Link>
          <Link
            href="/marketplace"
            className="block w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Continuar Comprando
          </Link>
        </div>
      </div>
    </div>
  )
}

