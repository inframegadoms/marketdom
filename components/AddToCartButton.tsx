'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { ShippingMethod, Coupon } from '@/types/database.types'
import { formatCurrency } from '@/lib/utils'
import Button from './ui/Button'
import Input from './ui/Input'
import Card from './ui/Card'
import { useToast } from '@/contexts/ToastContext'

interface AddToCartButtonProps {
  productId: string
  vendedorId: string
  price: number
  shippingMethods: ShippingMethod[]
  coupons: Coupon[]
}

export default function AddToCartButton({
  productId,
  vendedorId,
  price,
  shippingMethods,
  coupons,
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedShipping, setSelectedShipping] = useState<string>('')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showSuccess, showError, showWarning } = useToast()

  const applyCoupon = () => {
    const coupon = coupons.find(
      (c) => c.code.toUpperCase() === couponCode.toUpperCase() &&
      c.is_active &&
      (!c.expires_at || new Date(c.expires_at) > new Date()) &&
      (!c.usage_limit || c.used_count < c.usage_limit)
    )
    
    if (coupon) {
      setAppliedCoupon(coupon)
      showSuccess('Cupón aplicado correctamente')
    } else {
      showError('Cupón no válido o expirado')
    }
  }

  const calculateTotal = () => {
    let subtotal = price * quantity
    let discount = 0

    if (appliedCoupon) {
      if (appliedCoupon.min_purchase && subtotal < appliedCoupon.min_purchase) {
        return { subtotal, discount: 0, shipping: 0, total: subtotal }
      }

      if (appliedCoupon.discount_type === 'percentage') {
        discount = (subtotal * appliedCoupon.discount_value) / 100
        if (appliedCoupon.max_discount && discount > appliedCoupon.max_discount) {
          discount = appliedCoupon.max_discount
        }
      } else {
        discount = appliedCoupon.discount_value
      }
    }

    const shipping = selectedShipping
      ? shippingMethods.find((m) => m.id === selectedShipping)?.price || 0
      : 0

    const total = subtotal - discount + shipping

    return { subtotal, discount, shipping, total }
  }

  const handleCheckout = async () => {
    if (!selectedShipping) {
      showWarning('Por favor selecciona un método de envío')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?redirect=/marketplace/product/' + productId)
        return
      }

      const { subtotal, discount, shipping, total } = calculateTotal()

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          cliente_id: user.id,
          vendedor_id: vendedorId,
          product_id: productId,
          quantity,
          total,
          shipping_method_id: selectedShipping,
          coupon_id: appliedCoupon?.id || null,
          status: 'pending',
          shipping_address: {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: 'México',
          },
        })
        .select()
        .single()

      if (orderError) throw orderError

      const response = await fetch('/api/payment/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          total,
          title: 'Compra en MarketDom',
          description: `Orden #${order.id}`,
        }),
      })

      if (!response.ok) throw new Error('Error al crear preferencia de pago')

      const { preference } = await response.json()

      if (preference.init_point) {
        showSuccess('Redirigiendo a Mercado Pago...')
        setTimeout(() => {
          window.location.href = preference.init_point
        }, 1000)
      } else {
        throw new Error('No se pudo obtener el enlace de pago')
      }
    } catch (error: any) {
      console.error('Error en checkout:', error)
      showError(error.message || 'Error al procesar el pago. Por favor, inténtalo de nuevo.')
      setLoading(false)
    }
  }

  const { subtotal, discount, shipping, total } = calculateTotal()

  return (
    <div className="space-y-6">
      {/* Quantity Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Cantidad</label>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50 flex items-center justify-center transition-all duration-200 font-bold text-gray-700"
          >
            −
          </button>
          <div className="w-16 h-10 rounded-lg border-2 border-primary-500 bg-primary-50 flex items-center justify-center font-bold text-primary-700">
            {quantity}
          </div>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50 flex items-center justify-center transition-all duration-200 font-bold text-gray-700"
          >
            +
          </button>
        </div>
      </div>

      {/* Shipping Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Método de Envío *</label>
        <div className="space-y-2">
          {shippingMethods.map((method) => (
            <label
              key={method.id}
              className={`
                flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                ${selectedShipping === method.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <input
                type="radio"
                name="shipping"
                value={method.id}
                checked={selectedShipping === method.id}
                onChange={(e) => setSelectedShipping(e.target.value)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{method.name}</span>
                  <span className="font-bold text-primary-600">{formatCurrency(method.price)}</span>
                </div>
                {method.description && (
                  <p className="text-sm text-gray-500 mt-1">{method.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Tiempo estimado: {method.estimated_days} días</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Coupon Section */}
      {coupons.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Cupón de Descuento</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Código del cupón"
              className="flex-1 input"
            />
            <Button
              type="button"
              onClick={applyCoupon}
              variant="outline"
              disabled={!couponCode}
            >
              Aplicar
            </Button>
          </div>
          {appliedCoupon && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">
                ✓ Cupón aplicado: <span className="font-mono">{appliedCoupon.code}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Price Summary */}
      <Card className="bg-gradient-to-br from-gray-50 to-white">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Resumen de Compra</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Descuento</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          {shipping > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Envío</span>
              <span>{formatCurrency(shipping)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold gradient-text">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Checkout Button */}
      <Button
        onClick={handleCheckout}
        disabled={loading || !selectedShipping}
        loading={loading}
        size="lg"
        className="w-full shadow-glow hover:shadow-glow-lg"
      >
        {loading ? 'Procesando...' : 'Comprar con Mercado Pago'}
      </Button>
    </div>
  )
}
