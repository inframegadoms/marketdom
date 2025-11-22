import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import { formatCurrency, formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import UpdateOrderStatus from '@/components/UpdateOrderStatus'

export default async function VendedorOrdersPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'vendedor') {
    redirect('/')
  }

  const { data: vendedorProfile } = await supabase
    .from('vendedor_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!vendedorProfile) {
    redirect('/')
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      products:product_id (
        id,
        name,
        images,
        price
      ),
      shipping_methods:shipping_method_id (
        id,
        name
      ),
      coupons:coupon_id (
        id,
        code
      )
    `)
    .eq('vendedor_id', vendedorProfile.id)
    .order('created_at', { ascending: false })

  // Get user profiles for orders
  const clienteIds = orders?.map((o: any) => o.cliente_id).filter(Boolean) || []
  const { data: userProfiles } = clienteIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('user_id, full_name, phone')
        .in('user_id', clienteIds)
    : { data: [] }

  // Merge user profiles with orders
  const ordersWithClientInfo = orders?.map((order: any) => {
    const userProfile = userProfiles?.find((p: any) => p.user_id === order.cliente_id)
    return {
      ...order,
      user_profiles: userProfile || null,
    }
  }) || []

  // Calculate statistics
  const stats = {
    total: ordersWithClientInfo?.length || 0,
    pending: ordersWithClientInfo?.filter((o: any) => o.status === 'pending').length || 0,
    paid: ordersWithClientInfo?.filter((o: any) => o.status === 'paid').length || 0,
    shipped: ordersWithClientInfo?.filter((o: any) => o.status === 'shipped').length || 0,
    delivered: ordersWithClientInfo?.filter((o: any) => o.status === 'delivered').length || 0,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'paid':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'paid': return 'Pagado'
      case 'shipped': return 'Enviado'
      case 'delivered': return 'Entregado'
      default: return 'Cancelado'
    }
  }

  const navItems = [
    { href: '/dashboard/vendedor', label: 'Dashboard' },
    { href: '/dashboard/vendedor/products', label: 'Productos' },
    { href: '/dashboard/vendedor/shipping', label: 'Envíos' },
    { href: '/dashboard/vendedor/coupons', label: 'Cupones' },
    { href: '/dashboard/vendedor/orders', label: 'Órdenes' },
    { href: '/dashboard/vendedor/plan', label: 'Mi Plan' },
    { href: '/dashboard/vendedor/profile', label: 'Mi Perfil' },
  ]

  return (
    <DashboardLayout role="vendedor" title="Mis Órdenes" navItems={navItems}>
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500 mt-1">Total</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-500 mt-1">Pendientes</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
            <p className="text-sm text-gray-500 mt-1">Pagadas</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
            <p className="text-sm text-gray-500 mt-1">Enviadas</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            <p className="text-sm text-gray-500 mt-1">Entregadas</p>
          </Card>
        </div>

        {/* Orders List */}
        {ordersWithClientInfo && ordersWithClientInfo.length > 0 ? (
          <div className="space-y-4">
            {ordersWithClientInfo.map((order: any, index: number) => (
              <Card
                key={order.id}
                hover
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Product Info */}
                  <div className="flex items-start space-x-4 flex-1">
                    {order.products?.images && order.products.images.length > 0 && (
                      <img
                        src={order.products.images[0]}
                        alt={order.products.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {order.products?.name || 'Producto'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        Cantidad: {order.quantity} × {formatCurrency(order.products?.price || 0)}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Cliente:</span>{' '}
                          {order.user_profiles?.full_name || `ID: ${order.cliente_id.slice(0, 8)}` || 'N/A'}
                        </div>
                        {order.user_profiles?.phone && (
                          <div>
                            <span className="font-medium">Tel:</span> {order.user_profiles.phone}
                          </div>
                        )}
                      </div>
                      {order.shipping_address && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Dirección:</span>{' '}
                          {order.shipping_address.street}, {order.shipping_address.city}, {order.shipping_address.state}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="lg:text-right space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Orden #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold gradient-text mb-2">
                        {formatCurrency(order.total)}
                      </p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    {order.shipping_methods && (
                      <p className="text-sm text-gray-500">
                        Envío: {order.shipping_methods.name}
                      </p>
                    )}
                    {order.coupons && (
                      <p className="text-sm text-primary-600">
                        Cupón: {order.coupons.code}
                      </p>
                    )}
                    <div className="pt-2">
                      <UpdateOrderStatus orderId={order.id} currentStatus={order.status} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-16">
            <div className="max-w-md mx-auto">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay órdenes aún</h3>
              <p className="text-gray-500">Las órdenes de tus productos aparecerán aquí</p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

