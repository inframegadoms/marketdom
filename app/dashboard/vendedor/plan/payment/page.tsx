'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/DashboardLayout'
import Card from '@/components/ui/Card'
import { PlanType } from '@/types/database.types'
import { PLAN_NAMES, PLAN_PRICES } from '@/lib/plans'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'

export default function PlanPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()
  const { showSuccess, showError, showInfo } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<PlanType | null>(null)
  const [currentPlan, setCurrentPlan] = useState<PlanType | null>(null)

  useEffect(() => {
    const planParam = searchParams.get('plan') as PlanType
    if (planParam && ['gratuito', 'basico', 'medio', 'ilimitado'].includes(planParam)) {
      setPlan(planParam)
      loadCurrentPlan()
    } else {
      showError('Plan no válido')
      router.push('/dashboard/vendedor/plan')
    }
  }, [searchParams, router, showError])

  const loadCurrentPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: vendedorProfile } = await supabase
        .from('vendedor_profiles')
        .select('plan')
        .eq('user_id', user.id)
        .single()

      if (vendedorProfile) {
        setCurrentPlan(vendedorProfile.plan)
      }
    } catch (error) {
      console.error('Error loading current plan:', error)
    }
  }

  const handlePayment = async () => {
    if (!plan) return

    setLoading(true)
    showInfo('Procesando pago...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const planPrice = PLAN_PRICES[plan]
      
      // Si el plan es gratuito, actualizar directamente
      if (planPrice === 0) {
        const { error } = await supabase
          .from('vendedor_profiles')
          .update({
            plan: plan,
            plan_expires_at: null,
          })
          .eq('user_id', user.id)

        if (error) throw error

        showSuccess('Plan actualizado correctamente')
        router.push('/dashboard/vendedor/plan')
        return
      }

      // Para planes de pago, crear preferencia de Mercado Pago
      const response = await fetch('/api/plan/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plan,
          price: planPrice,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear preferencia de pago')
      }

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
      console.error('Error processing payment:', error)
      showError(error.message || 'Error al procesar el pago. Por favor, inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { href: '/dashboard/vendedor', label: 'Dashboard' },
    { href: '/dashboard/vendedor/products', label: 'Productos' },
    { href: '/dashboard/vendedor/shipping', label: 'Envíos' },
    { href: '/dashboard/vendedor/coupons', label: 'Cupones' },
    { href: '/dashboard/vendedor/orders', label: 'Órdenes' },
    { href: '/dashboard/vendedor/plan', label: 'Mi Plan' },
    { href: '/dashboard/vendedor/profile', label: 'Mi Perfil' },
  ]

  if (!plan) {
    return (
      <DashboardLayout role="vendedor" title="Pago de Plan" navItems={navItems}>
        <Card className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información del plan...</p>
        </Card>
      </DashboardLayout>
    )
  }

  const planPrice = PLAN_PRICES[plan]
  const isUpgrade = currentPlan && PLAN_PRICES[currentPlan] < planPrice

  return (
    <DashboardLayout role="vendedor" title="Pago de Plan" navItems={navItems}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isUpgrade ? 'Actualizar Plan' : 'Contratar Plan'}
              </h2>
              <p className="text-gray-600">
                {isUpgrade 
                  ? `Estás actualizando de ${currentPlan ? PLAN_NAMES[currentPlan as PlanType] : 'tu plan actual'} a ${PLAN_NAMES[plan as PlanType]}`
                  : `Estás contratando el ${PLAN_NAMES[plan as PlanType]}`
                }
              </p>
            </div>

            <div className="bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-900">Plan seleccionado:</span>
                <span className="text-xl font-bold text-primary-600">{PLAN_NAMES[plan as PlanType]}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Precio:</span>
                <span className="text-3xl font-bold text-primary-600">
                  {formatCurrency(planPrice)}
                </span>
              </div>
              {planPrice > 0 && (
                <p className="text-sm text-gray-500 mt-4">
                  * El plan tiene una duración de 30 días desde la fecha de pago
                </p>
              )}
            </div>

            {planPrice === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">
                  Este plan es gratuito. Al confirmar, se actualizará tu plan inmediatamente.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium mb-2">
                  Serás redirigido a Mercado Pago para completar el pago de forma segura.
                </p>
                <p className="text-sm text-blue-600">
                  Una vez completado el pago, tu plan se actualizará automáticamente.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handlePayment}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {loading 
                  ? 'Procesando...' 
                  : planPrice === 0 
                    ? 'Confirmar Plan Gratuito' 
                    : 'Continuar con el Pago'
                }
              </button>
              <button
                onClick={() => router.back()}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}

