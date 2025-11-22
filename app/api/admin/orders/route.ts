import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Usar cliente admin para obtener órdenes
    const adminClient = createSupabaseAdminClient()

    // Obtener órdenes
    const { data: orders, error: ordersError } = await adminClient
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    // Obtener datos relacionados
    const clienteIds = Array.from(new Set(orders.map((o: any) => o.cliente_id).filter(Boolean)))
    const vendedorIds = Array.from(new Set(orders.map((o: any) => o.vendedor_id).filter(Boolean)))
    const orderIds = orders.map((o: any) => o.id)

    // Obtener perfiles de clientes
    const { data: clientes } = await adminClient
      .from('user_profiles')
      .select('user_id, full_name')
      .in('user_id', clienteIds)

    // Obtener perfiles de vendedores
    const { data: vendedores } = await adminClient
      .from('vendedor_profiles')
      .select('id, store_name')
      .in('id', vendedorIds)

    // Obtener usuarios de auth para emails
    const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers()

    // Obtener order_items
    const { data: orderItems } = await adminClient
      .from('order_items')
      .select('*')
      .in('order_id', orderIds)

    // Obtener productos para order_items
    const productIds = Array.from(new Set(orderItems?.map((item: any) => item.product_id).filter(Boolean) || []))
    const { data: products } = productIds.length > 0
      ? await adminClient
          .from('products')
          .select('id, name, price')
          .in('id', productIds)
      : { data: [] }

    // Combinar datos
    const ordersWithDetails = orders.map((order: any) => {
      const cliente = clientes?.find((c: any) => c.user_id === order.cliente_id)
      const authUser = authUsers?.find((u: any) => u.id === order.cliente_id)
      const vendedor = vendedores?.find((v: any) => v.id === order.vendedor_id)
      const items = orderItems?.filter((item: any) => item.order_id === order.id) || []
      const itemsWithProducts = items.map((item: any) => {
        const product = products?.find((p: any) => p.id === item.product_id)
        return {
          ...item,
          product: product || null,
        }
      })

      return {
        ...order,
        cliente: cliente ? {
          full_name: cliente.full_name,
          email: authUser?.email || 'N/A',
        } : null,
        vendedor: vendedor ? {
          store_name: vendedor.store_name,
        } : null,
        order_items: itemsWithProducts,
      }
    })

    return NextResponse.json({ orders: ordersWithDetails })
  } catch (error: any) {
    console.error('Error in GET /api/admin/orders:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

