'use client'

import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import Card from '@/components/ui/Card'
import Link from 'next/link'

export default function PlanPaymentPendingPage() {
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
    <DashboardLayout role="vendedor" title="Pago Pendiente" navItems={navItems}>
      <div className="max-w-2xl mx-auto">
        <Card className="text-center py-16">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pago Pendiente</h2>
          <p className="text-gray-600 mb-4">
            Tu pago está siendo procesado. Te notificaremos cuando se complete.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Una vez que el pago sea confirmado, tu plan se actualizará automáticamente.
          </p>
          <Link
            href="/dashboard/vendedor/plan"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Volver a Planes
          </Link>
        </Card>
      </div>
    </DashboardLayout>
  )
}

