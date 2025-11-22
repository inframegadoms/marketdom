import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function ClienteOrdersPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'cliente') {
    redirect('/')
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      products:product_id (
        id,
        name,
        images
      ),
      vendedor:vendedor_id (
        id,
        store_name
      ),
      shipping_methods:shipping_method_id (
        id,
        name
      )
    `)
    .eq('cliente_id', user.id)
    .order('created_at', { ascending: false })

  const navItems = [
    { href: '/dashboard/cliente', label: 'Dashboard' },
    { href: '/dashboard/cliente/orders', label: 'Mis Órdenes' },
    { href: '/dashboard/cliente/profile', label: 'Mi Perfil' },
    { href: '/marketplace', label: 'Marketplace' },
  ]

  return (
    <DashboardLayout role="cliente" title="Mis Órdenes" navItems={navItems}>
      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{order.products?.name || 'Producto'}</h3>
                  <p className="text-sm text-gray-500">
                    Orden #{order.id.slice(0, 8)} • {formatDate(order.created_at)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Tienda: {order.vendedor?.store_name || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary-600">
                    {formatCurrency(order.total)}
                  </p>
                  <span className={`inline-block px-3 py-1 text-xs rounded mt-2 ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status === 'pending' ? 'Pendiente' :
                     order.status === 'paid' ? 'Pagado' :
                     order.status === 'shipped' ? 'Enviado' :
                     order.status === 'delivered' ? 'Entregado' :
                     'Cancelado'}
                  </span>
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cantidad:</span>
                  <span className="font-medium">{order.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Método de envío:</span>
                  <span className="font-medium">{order.shipping_methods?.name || 'N/A'}</span>
                </div>
                {order.shipping_address && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-gray-600 mb-1">Dirección de envío:</p>
                    <p className="text-sm">
                      {order.shipping_address.street}, {order.shipping_address.city}, {order.shipping_address.state}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">No tienes órdenes aún</p>
          <Link
            href="/marketplace"
            className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Explorar Marketplace
          </Link>
        </div>
      )}
    </DashboardLayout>
  )
}

