'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import ProductCard from '@/components/ProductCard'
import StoreCard from '@/components/StoreCard'
import MarketplaceTabs from '@/components/MarketplaceTabs'
import { Product, VendedorProfile } from '@/types/database.types'

interface MarketplaceContentProps {
  products: Product[]
  stores: (VendedorProfile & { product_count?: number })[]
}

export default function MarketplaceContent({ products, stores }: MarketplaceContentProps) {
  const [activeTab, setActiveTab] = useState<'tiendas' | 'productos' | 'categorias'>('productos')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Tabs Navigation */}
      <MarketplaceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'tiendas' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tiendas Disponibles</h2>
          {stores && stores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <div className="max-w-md mx-auto">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay tiendas disponibles</h3>
                <p className="text-gray-500">Vuelve pronto para ver nuevas tiendas</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'productos' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Todos los Productos</h2>
          {products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product: any, index: number) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <div className="max-w-md mx-auto">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos disponibles</h3>
                <p className="text-gray-500">Vuelve pronto para ver nuevos productos</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'categorias' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Categorías</h2>
          <Card className="text-center py-12">
            <div className="max-w-md mx-auto">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Categorías próximamente</h3>
              <p className="text-gray-500">Estamos trabajando en organizar los productos por categorías</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

