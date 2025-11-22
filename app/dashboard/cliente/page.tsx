import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import CoinsBalance from '@/components/CoinsBalance'

export default async function ClienteDashboard() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'cliente') {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

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
        store_name,
        store_slug
      )
    `)
    .eq('cliente_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const navItems = [
    { href: '/dashboard/cliente', label: 'Dashboard' },
    { href: '/dashboard/cliente/orders', label: 'Mis Órdenes' },
    { href: '/dashboard/cliente/profile', label: 'Mi Perfil' },
    { href: '/dashboard/cliente/gamification', label: 'Megacoins' },
    { href: '/marketplace', label: 'Marketplace' },
  ]

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

  return (
    <DashboardLayout role="cliente" title="Mi Dashboard" navItems={navItems}>
      <div className="space-y-6">
        {/* Coins Balance */}
        <CoinsBalance />

        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                ¡Hola, {profile?.full_name || user.email?.split('@')[0] || 'Usuario'}!
              </h2>
              <p className="text-primary-100">Bienvenido a tu panel de control</p>
            </div>
            <Link href="/marketplace" className="mt-4 md:mt-0">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Explorar Marketplace
              </Button>
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card>
            <div className="flex items-center space-x-4 mb-6">
              {profile?.avatar_url ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary-200">
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Usuario'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900">{profile?.full_name || 'Usuario'}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <Link href="/dashboard/cliente/profile">
              <Button variant="outline" className="w-full">
                Editar Perfil
              </Button>
            </Link>
          </Card>

          {/* Recent Orders */}
          <Card className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Mis Órdenes Recientes</h2>
              <Link
                href="/dashboard/cliente/orders"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Ver todas →
              </Link>
            </div>
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          {order.products?.images && order.products.images.length > 0 && (
                            <img
                              src={order.products.images[0]}
                              alt={order.products.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {order.products?.name || 'Producto'}
                            </h3>
                            {order.vendedor?.store_slug ? (
                              <Link
                                href={`/tienda/${order.vendedor.store_slug}`}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                              >
                                {order.vendedor.store_name}
                              </Link>
                            ) : (
                              <p className="text-sm text-gray-500">
                                {order.vendedor?.store_name || 'Tienda'}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-xl font-bold gradient-text">
                          {formatCurrency(order.total)}
                        </p>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-gray-500 mb-4">No tienes órdenes aún</p>
                <Link href="/marketplace">
                  <Button>Explorar Productos</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
