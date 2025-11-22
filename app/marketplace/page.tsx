import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import ProductCard from '@/components/ProductCard'
import MarketplaceContent from '@/components/MarketplaceContent'

export default async function MarketplacePage() {
  const supabase = createSupabaseServerClient()

  // Fetch products
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      vendedor:vendedor_id (
        id,
        store_name,
        store_slug
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Fetch stores (vendedores) with product count
  const { data: stores } = await supabase
    .from('vendedor_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get product count for each store
  const storesWithCount = await Promise.all(
    (stores || []).map(async (store) => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_id', store.id)
        .eq('status', 'active')
      
      if (error) {
        console.error(`Error counting products for store ${store.id}:`, error)
      }
      
      return {
        ...store,
        product_count: count || 0,
      }
    })
  )

  // Filter stores that have at least one product
  const activeStores = storesWithCount.filter((store) => store.product_count > 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Modern Navigation */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-xl md:text-2xl font-bold gradient-text">MarketDom</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Descubre productos increíbles
            </h1>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto">
              Explora nuestro catálogo y encuentra lo que buscas
            </p>
          </div>
        </div>
      </div>

      {/* Marketplace Content with Tabs */}
      <MarketplaceContent 
        products={products || []} 
        stores={activeStores}
      />
    </div>
  )
}
