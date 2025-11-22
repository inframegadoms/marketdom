'use client'

import { useEffect, useState } from 'react'
import Modal from './ui/Modal'
import Card from './ui/Card'
import { formatCurrency } from '@/lib/utils'
import { Coupon } from '@/types/database.types'

interface CouponsModalProps {
  coupons: Coupon[]
  storeName: string
  storeSlug: string
}

export default function CouponsModal({ coupons, storeName, storeSlug }: CouponsModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Verificar si ya se mostró el modal para esta tienda
    const modalShownKey = `coupons_modal_shown_${storeSlug}`
    const hasShownModal = localStorage.getItem(modalShownKey)

    // Solo mostrar si hay cupones y no se ha mostrado antes
    if (coupons.length > 0 && !hasShownModal) {
      // Pequeño delay para mejor UX
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [coupons.length, storeSlug])

  const handleClose = () => {
    setIsOpen(false)
    // Marcar como mostrado en localStorage
    const modalShownKey = `coupons_modal_shown_${storeSlug}`
    localStorage.setItem(modalShownKey, 'true')
  }

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`
    } else {
      return `${formatCurrency(coupon.discount_value)} OFF`
    }
  }

  const getCouponDescription = (coupon: Coupon) => {
    const parts: string[] = []
    
    if (coupon.min_purchase) {
      parts.push(`Compra mínima: ${formatCurrency(coupon.min_purchase)}`)
    }
    
    if (coupon.max_discount && coupon.discount_type === 'percentage') {
      parts.push(`Descuento máximo: ${formatCurrency(coupon.max_discount)}`)
    }
    
    if (coupon.expires_at) {
      const expiresDate = new Date(coupon.expires_at)
      parts.push(`Válido hasta: ${expiresDate.toLocaleDateString('es-MX')}`)
    }
    
    if (coupon.usage_limit) {
      const remaining = coupon.usage_limit - (coupon.used_count || 0)
      if (remaining > 0) {
        parts.push(`${remaining} usos disponibles`)
      }
    }

    return parts.join(' • ')
  }

  if (coupons.length === 0) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`🎉 Cupones Disponibles en ${storeName}`}
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-gray-600 mb-6">
          ¡Aprovecha estos cupones de descuento especiales para tu compra!
        </p>

        <div className="grid grid-cols-1 gap-4">
          {coupons.map((coupon) => (
            <Card
              key={coupon.id}
              className="border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-purple-50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold text-lg">
                      {coupon.code}
                    </div>
                    <div className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold">
                      {formatDiscount(coupon)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{getCouponDescription(coupon)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            💡 Puedes aplicar estos cupones al momento de realizar tu compra
          </p>
        </div>
      </div>
    </Modal>
  )
}

