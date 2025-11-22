import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import AddToCartButton from '@/components/AddToCartButton'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import ProductImageGallery from '@/components/ProductImageGallery'

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()

  // First, get the product without shipping methods
  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`
      *,
      vendedor:vendedor_id (
        id,
        store_name,
        store_description,
        store_slug,
        contact_email,
        contact_phone,
        social_media
      )
    `)
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (productError) {
    console.error('Error loading product:', productError)
    notFound()
  }

  if (!product) {
    notFound()
  }

  // Then, get shipping methods separately
  const { data: shippingMethods } = await supabase
    .from('shipping_methods')
    .select('id, name, price, estimated_days, is_active')
    .eq('vendedor_id', product.vendedor_id)
    .eq('is_active', true)

  // Get active coupons
  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .eq('vendedor_id', product.vendedor_id)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })

  const activeCoupons = coupons?.filter((coupon) => {
    if (coupon.usage_limit && (coupon.used_count || 0) >= coupon.usage_limit) {
      return false
    }
    return true
  }) || []

  // Use the shipping methods we fetched separately
  const activeShippingMethods = shippingMethods || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
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
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 animate-fade-in">
          {/* Product Images */}
          <div className="space-y-4">
            <Card className="p-0 overflow-hidden">
              <ProductImageGallery images={product.images || []} productName={product.name} />
            </Card>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Price */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                {product.category && (
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                    {product.category}
                  </span>
                )}
                {product.stock > 0 ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>En stock</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    Sin stock
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>
              <div className="flex items-baseline space-x-3 mb-6">
                <p className="text-4xl md:text-5xl font-bold gradient-text">
                  {formatCurrency(product.price)}
                </p>
                {product.stock > 0 && (
                  <span className="text-sm text-gray-500">
                    {product.stock} disponible{product.stock !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <Card>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Descripción</h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            </Card>

            {/* Store Info */}
            {product.vendedor && (
              <Card className="bg-gradient-to-r from-primary-50 via-purple-50 to-indigo-50 border-primary-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1 font-medium">Vendido por</p>
                    {product.vendedor.store_slug ? (
                      <Link
                        href={`/tienda/${product.vendedor.store_slug}`}
                        className="text-xl font-bold text-primary-700 hover:text-primary-800 transition-colors inline-flex items-center space-x-2 group"
                      >
                        <span>{product.vendedor.store_name}</span>
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ) : (
                      <p className="text-xl font-bold text-gray-900">{product.vendedor.store_name}</p>
                    )}
                    {product.vendedor.store_description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.vendedor.store_description}</p>
                    )}
                  </div>
                  {product.vendedor.social_media && (
                    <div className="flex items-center space-x-3">
                      {product.vendedor.social_media.facebook && (
                        <a
                          href={product.vendedor.social_media.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-primary-600 transition-colors"
                          aria-label="Facebook"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        </a>
                      )}
                      {product.vendedor.social_media.instagram && (
                        <a
                          href={product.vendedor.social_media.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-primary-600 transition-colors"
                          aria-label="Instagram"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                          </svg>
                        </a>
                      )}
                      {product.vendedor.social_media.twitter && (
                        <a
                          href={product.vendedor.social_media.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-primary-600 transition-colors"
                          aria-label="Twitter"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Add to Cart */}
            {product.stock > 0 && activeShippingMethods.length > 0 ? (
              <Card className="border-2 border-primary-200 bg-gradient-to-br from-white to-primary-50/30">
                <AddToCartButton
                  productId={product.id}
                  vendedorId={product.vendedor_id}
                  price={product.price}
                  shippingMethods={activeShippingMethods}
                  coupons={activeCoupons}
                />
              </Card>
            ) : product.stock === 0 ? (
              <Card className="border-red-200 bg-red-50">
                <div className="text-center py-6">
                  <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-red-800 font-semibold text-lg">Producto sin stock</p>
                  <p className="text-red-600 text-sm mt-2">Este producto no está disponible en este momento</p>
                </div>
              </Card>
            ) : (
              <Card className="border-yellow-200 bg-yellow-50">
                <div className="text-center py-6">
                  <svg className="mx-auto h-12 w-12 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-yellow-800 font-semibold text-lg">Sin métodos de envío</p>
                  <p className="text-yellow-600 text-sm mt-2">Este vendedor no tiene métodos de envío configurados</p>
                </div>
              </Card>
            )}

            {/* Active Coupons */}
            {activeCoupons.length > 0 && (
              <Card className="bg-gradient-to-r from-yellow-50 via-orange-50 to-amber-50 border-yellow-200">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  <h3 className="text-lg font-bold text-gray-900">Cupones Disponibles</h3>
                </div>
                <div className="space-y-3">
                  {activeCoupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-yellow-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-mono font-bold text-primary-600 text-lg">
                            {coupon.code}
                          </span>
                          {coupon.min_purchase && (
                            <span className="text-xs text-gray-500">
                              (Mín. {formatCurrency(coupon.min_purchase)})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}% de descuento`
                            : `${formatCurrency(coupon.discount_value)} de descuento`}
                          {coupon.max_discount && coupon.discount_type === 'percentage' && (
                            <span className="text-gray-500"> (máx. {formatCurrency(coupon.max_discount)})</span>
                          )}
                        </p>
                        {coupon.usage_limit && (
                          <p className="text-xs text-gray-500 mt-1">
                            {coupon.usage_limit - (coupon.used_count || 0)} usos restantes
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
