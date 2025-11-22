import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import { getProductLimit, getRemainingProducts, PLAN_NAMES } from '@/lib/plans'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import Card from '@/components/ui/Card'

export default async function VendedorDashboard() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'vendedor') {
    redirect('/')
  }

  const { data: vendedorProfile } = await supabase
    .from('vendedor_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!vendedorProfile) {
    redirect('/')
  }

  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('vendedor_id', vendedorProfile.id)

  const currentCount = productCount || 0
  const limit = getProductLimit(vendedorProfile.plan)
  const remaining = getRemainingProducts(vendedorProfile.plan, currentCount)

  const { count: ordersCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('vendedor_id', vendedorProfile.id)

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
    <DashboardLayout role="vendedor" title="Dashboard Vendedor" navItems={navItems}>
      <div className="space-y-6">
        {/* Store Info Card */}
        <Card className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{vendedorProfile.store_name}</h2>
              {vendedorProfile.store_description && (
                <p className="text-primary-100 mb-4">{vendedorProfile.store_description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  Plan: {PLAN_NAMES[vendedorProfile.plan]}
                </span>
                {vendedorProfile.store_slug && (
                  <Link
                    href={`/tienda/${vendedorProfile.store_slug}`}
                    target="_blank"
                    className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors"
                  >
                    Ver Tienda Pública →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card hover className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  remaining === 0 ? 'bg-red-100 text-red-800' :
                  remaining <= 2 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {remaining === Infinity ? 'Ilimitado' : `${remaining} disponibles`}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Productos Publicados</h3>
              <p className="text-3xl font-bold text-gray-900">
                {currentCount} <span className="text-lg text-gray-500">/ {limit === Infinity ? '∞' : limit}</span>
              </p>
              {remaining !== Infinity && remaining > 0 && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(currentCount / limit) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card hover className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Órdenes Totales</h3>
              <p className="text-3xl font-bold text-gray-900">{ordersCount || 0}</p>
              <Link
                href="/dashboard/vendedor/orders"
                className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block font-medium"
              >
                Ver todas →
              </Link>
            </div>
          </Card>

          <Card hover className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100 rounded-full -mr-16 -mt-16 opacity-50" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Mi Plan</h3>
              <p className="text-xl font-bold text-gray-900 mb-2">{PLAN_NAMES[vendedorProfile.plan]}</p>
              <Link
                href="/dashboard/vendedor/plan"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Actualizar plan →
              </Link>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/dashboard/vendedor/products/new"
              className="group p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all duration-200 text-center"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-200 transition-colors">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Nuevo Producto</h3>
              <p className="text-sm text-gray-500">Agrega un producto a tu tienda</p>
            </Link>
            <Link
              href="/dashboard/vendedor/shipping/new"
              className="group p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all duration-200 text-center"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Método de Envío</h3>
              <p className="text-sm text-gray-500">Configura opciones de envío</p>
            </Link>
            <Link
              href="/dashboard/vendedor/coupons/new"
              className="group p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all duration-200 text-center"
            >
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-pink-200 transition-colors">
                <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Nuevo Cupón</h3>
              <p className="text-sm text-gray-500">Crea un cupón de descuento</p>
            </Link>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
