'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/DashboardLayout'
import Card from '@/components/ui/Card'
import { PlanType } from '@/types/database.types'
import { PLAN_NAMES } from '@/lib/plans'
import { useToast } from '@/contexts/ToastContext'

export default function PlanPaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const updatePlan = async () => {
      const plan = searchParams.get('plan') as PlanType
      const ref = searchParams.get('ref')

      if (!plan || !ref) {
        showError('Parámetros de pago no válidos')
        router.push('/dashboard/vendedor/plan')
        return
      }

      if (!['gratuito', 'basico', 'medio', 'ilimitado'].includes(plan)) {
        showError('Plan no válido')
        router.push('/dashboard/vendedor/plan')
        return
      }

      setUpdating(true)

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        // Actualizar el plan del vendedor
        const { error } = await supabase
          .from('vendedor_profiles')
          .update({
            plan: plan,
            plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          })
          .eq('user_id', user.id)

        if (error) throw error

        showSuccess(`¡Plan ${PLAN_NAMES[plan as PlanType]} activado exitosamente!`)
        
        setTimeout(() => {
          router.push('/dashboard/vendedor/plan')
        }, 2000)
      } catch (error: any) {
        console.error('Error updating plan:', error)
        showError('Error al actualizar el plan. Por favor, contacta al soporte.')
        setTimeout(() => {
          router.push('/dashboard/vendedor/plan')
        }, 3000)
      } finally {
        setLoading(false)
        setUpdating(false)
      }
    }

    updatePlan()
  }, [searchParams, router, supabase, showSuccess, showError])

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
    <DashboardLayout role="vendedor" title="Pago Exitoso" navItems={navItems}>
      <div className="max-w-2xl mx-auto">
        <Card className="text-center py-16">
          {updating ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Actualizando tu plan...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Pago Exitoso!</h2>
              <p className="text-gray-600 mb-6">
                Tu plan ha sido actualizado correctamente. Redirigiendo...
              </p>
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}

