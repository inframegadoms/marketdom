'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import { VendedorProfile } from '@/types/database.types'

interface StoreCardProps {
  store: VendedorProfile & {
    product_count?: number
  }
}

export default function StoreCard({ store }: StoreCardProps) {
  const storeUrl = store.store_slug ? `/tienda/${store.store_slug}` : `/tienda/${store.id}`

  return (
    <Link href={storeUrl}>
      <Card hover className="h-full">
        <div className="flex flex-col h-full">
          {/* Store Logo/Banner */}
          <div className="relative w-full h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-t-lg overflow-hidden mb-4">
            {store.store_logo ? (
              <img
                src={store.store_logo}
                alt={store.store_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {store.store_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Store Info */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {store.store_name}
            </h3>
            
            {store.store_description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
                {store.store_description}
              </p>
            )}

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-500">Productos:</span>
                <span className="text-sm font-semibold text-primary-600">
                  {store.product_count || 0}
                </span>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-700 font-medium">
                {store.plan === 'gratuito' ? 'Gratuito' :
                 store.plan === 'basico' ? 'Básico' :
                 store.plan === 'medio' ? 'Medio' : 'Ilimitado'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

