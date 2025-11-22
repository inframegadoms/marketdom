import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import Card from '@/components/ui/Card'
import CouponsModal from '@/components/CouponsModal'

export default async function TiendaPage({ params }: { params: { slug: string } }) {
  const supabase = createSupabaseServerClient()

  const { data: vendedorProfile } = await supabase
    .from('vendedor_profiles')
    .select('*')
    .eq('store_slug', params.slug)
    .single()

  if (!vendedorProfile) {
    notFound()
  }

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('vendedor_id', vendedorProfile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Get active coupons
  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .eq('vendedor_id', vendedorProfile.id)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })

  const activeCoupons = coupons?.filter((coupon) => {
    if (coupon.usage_limit && (coupon.used_count || 0) >= coupon.usage_limit) {
      return false
    }
    return true
  }) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Coupons Modal */}
      {vendedorProfile.store_slug && (
        <CouponsModal
          coupons={activeCoupons}
          storeName={vendedorProfile.store_name}
          storeSlug={vendedorProfile.store_slug}
        />
      )}
      {/* Modern Navigation */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/marketplace" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-xl md:text-2xl font-bold gradient-text">MarketDom</span>
            </Link>
            <Link
              href="/marketplace"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              ← Volver
            </Link>
          </div>
        </div>
      </nav>

      {/* Store Header */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            {vendedorProfile.store_logo && (
              <div className="flex-shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl">
                  <img
                    src={vendedorProfile.store_logo}
                    alt={vendedorProfile.store_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                {vendedorProfile.store_name}
              </h1>
              {vendedorProfile.store_description && (
                <p className="text-lg text-primary-100 mb-6 max-w-2xl">
                  {vendedorProfile.store_description}
                </p>
              )}
              
              <div className="flex flex-wrap gap-6 text-sm">
                {vendedorProfile.contact_email && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{vendedorProfile.contact_email}</span>
                  </div>
                )}
                {vendedorProfile.contact_phone && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{vendedorProfile.contact_phone}</span>
                  </div>
                )}
              </div>

              {/* Social Media */}
              {vendedorProfile.social_media && (
                <div className="flex gap-4 mt-6">
                  {vendedorProfile.social_media.facebook && (
                    <a
                      href={vendedorProfile.social_media.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all duration-200"
                    >
                      <span className="text-white font-semibold text-sm">f</span>
                    </a>
                  )}
                  {vendedorProfile.social_media.instagram && (
                    <a
                      href={vendedorProfile.social_media.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all duration-200"
                    >
                      <span className="text-white font-semibold text-sm">@</span>
                    </a>
                  )}
                  {vendedorProfile.social_media.twitter && (
                    <a
                      href={vendedorProfile.social_media.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all duration-200"
                    >
                      <span className="text-white font-semibold text-sm">𝕏</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods & Info Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Métodos de Pago</h3>
                  <p className="text-sm text-gray-300 mb-4">
                    Aceptamos pagos seguros a través de Mercado Pago
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-xs font-semibold text-white border border-white/20 hover:bg-white/20 transition-colors">
                      💳 Crédito
                    </span>
                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-xs font-semibold text-white border border-white/20 hover:bg-white/20 transition-colors">
                      💰 Débito
                    </span>
                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-xs font-semibold text-white border border-white/20 hover:bg-white/20 transition-colors">
                      📱 Mercado Pago
                    </span>
                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-xs font-semibold text-white border border-white/20 hover:bg-white/20 transition-colors">
                      🏦 Transferencias
                    </span>
                  </div>
                  {vendedorProfile.mercado_pago_public_key && (
                    <div className="mt-4 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs font-medium text-green-400">
                        Pagos procesados de forma segura
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Active Coupons Preview */}
            {activeCoupons.length > 0 && (
              <Card className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 border-emerald-500 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/30">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      Cupones Disponibles
                    </h3>
                    <p className="text-sm text-green-100 mb-4">
                      {activeCoupons.length} cupón(es) activo(s) para usar
                    </p>
                    <div className="space-y-2">
                      {activeCoupons.slice(0, 2).map((coupon) => (
                        <div key={coupon.id} className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/15 transition-colors">
                          <span className="font-mono text-sm font-bold text-white">
                            {coupon.code}
                          </span>
                          <span className="text-sm font-extrabold text-yellow-300">
                            {coupon.discount_type === 'percentage'
                              ? `${coupon.discount_value}% OFF`
                              : `${formatCurrency(coupon.discount_value)} OFF`}
                          </span>
                        </div>
                      ))}
                      {activeCoupons.length > 2 && (
                        <p className="text-xs font-medium text-green-100 text-center pt-1">
                          +{activeCoupons.length - 2} cupón(es) más disponible(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Productos</h2>
          <span className="text-gray-500">{products?.length || 0} productos</span>
        </div>
        
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <Link
                key={product.id}
                href={`/marketplace/product/${product.id}`}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Card hover glow className="h-full flex flex-col overflow-hidden">
                  {product.images && product.images.length > 0 && (
                    <div className="relative w-full h-56 overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-gray-900 group-hover:text-primary-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2 flex-1">{product.description}</p>
                    <div className="mt-auto">
                      <p className="text-2xl font-bold gradient-text mb-2">
                        {formatCurrency(product.price)}
                      </p>
                      {product.stock > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          En stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Sin stock
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="text-center py-16">
            <div className="max-w-md mx-auto">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay productos disponibles</h3>
              <p className="text-gray-500">Esta tienda aún no tiene productos publicados</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
