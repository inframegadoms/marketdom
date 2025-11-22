'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

interface ProductCardProps {
  product: {
    id: string
    name: string
    price: number
    stock: number
    images?: string[]
    vendedor?: {
      id: string
      store_name: string
      store_slug?: string
    } | null
  }
  index: number
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/marketplace/product/${product.id}`)
  }

  return (
    <div
      className="group animate-fade-in cursor-pointer"
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={handleCardClick}
    >
      <Card hover glow className="h-full flex flex-col overflow-hidden">
        {product.images && product.images.length > 0 && (
          <div className="relative w-full h-48 overflow-hidden rounded-t-xl">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-gray-900 group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
          {product.vendedor?.store_slug ? (
            <Link
              href={`/tienda/${product.vendedor.store_slug}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-primary-600 hover:text-primary-700 mb-2 font-medium"
            >
              {product.vendedor.store_name}
            </Link>
          ) : (
            <p className="text-sm text-gray-500 mb-2">
              {product.vendedor?.store_name || 'Tienda'}
            </p>
          )}
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
    </div>
  )
}

