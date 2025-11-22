import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default async function VendedorProductsPage() {
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

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('vendedor_id', vendedorProfile.id)
    .order('created_at', { ascending: false })

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
    <DashboardLayout role="vendedor" title="Mis Productos" navItems={navItems}>
      <div className="mb-6">
        <Link href="/dashboard/vendedor/products/new">
          <Button size="lg" className="shadow-md hover:shadow-lg">
            <svg className="w-5 h-5 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Producto
          </Button>
        </Link>
      </div>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <Card
              key={product.id}
              hover
              className="flex flex-col overflow-hidden animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {product.images && product.images.length > 0 && (
                <div className="relative w-full h-48 overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                      product.status === 'active' ? 'bg-green-500/90 text-white' :
                      product.status === 'draft' ? 'bg-gray-500/90 text-white' :
                      'bg-red-500/90 text-white'
                    }`}>
                      {product.status === 'active' ? 'Activo' :
                       product.status === 'draft' ? 'Borrador' :
                       'Inactivo'}
                    </span>
                  </div>
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-gray-900">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-1">{product.description}</p>
                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold gradient-text">
                      {formatCurrency(product.price)}
                    </p>
                    <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                  </div>
                  <Link
                    href={`/dashboard/vendedor/products/${product.id}/edit`}
                    className="block"
                  >
                    <Button variant="outline" className="w-full">
                      Editar Producto
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes productos aún</h3>
            <p className="text-gray-500 mb-6">Comienza agregando tu primer producto a tu tienda</p>
            <Link href="/dashboard/vendedor/products/new">
              <Button size="lg">
                Crear Primer Producto
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </DashboardLayout>
  )
}
