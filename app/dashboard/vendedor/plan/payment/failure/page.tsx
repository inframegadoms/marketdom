'use client'

import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import Card from '@/components/ui/Card'
import Link from 'next/link'

export default function PlanPaymentFailurePage() {
  const router = useRouter()

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
    <DashboardLayout role="vendedor" title="Pago Fallido" navItems={navItems}>
      <div className="max-w-2xl mx-auto">
        <Card className="text-center py-16">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pago No Completado</h2>
          <p className="text-gray-600 mb-6">
            El pago no pudo ser procesado. Por favor, intenta nuevamente o contacta al soporte si el problema persiste.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard/vendedor/plan"
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Volver a Planes
            </Link>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Intentar Nuevamente
            </button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}

