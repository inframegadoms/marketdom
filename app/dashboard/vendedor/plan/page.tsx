import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import { PLAN_NAMES, PLAN_PRICES, PLAN_LIMITS, getProductLimit } from '@/lib/plans'
import { formatCurrency } from '@/lib/utils'
import { PlanType } from '@/types/database.types'
import UpgradePlanButton from '@/components/UpgradePlanButton'

export default async function PlanPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'vendedor') {
    redirect('/')
  }

  const { data: vendedorProfile } = await supabase
    .from('vendedor_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!vendedorProfile) {
    redirect('/')
  }

  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('vendedor_id', vendedorProfile.id)

  const currentCount = productCount || 0
  const currentLimit = getProductLimit(vendedorProfile.plan)

  const plans: PlanType[] = ['gratuito', 'basico', 'medio', 'ilimitado']

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
    <DashboardLayout role="vendedor" title="Mi Plan" navItems={navItems}>
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Plan Actual</h2>
          <div className="space-y-2">
            <p className="text-lg">
              <span className="font-medium">Plan:</span> {PLAN_NAMES[vendedorProfile.plan as PlanType]}
            </p>
            <p>
              <span className="font-medium">Productos publicados:</span> {currentCount} / {currentLimit === Infinity ? '∞' : currentLimit}
            </p>
            {vendedorProfile.plan_expires_at && (
              <p>
                <span className="font-medium">Expira:</span> {new Date(vendedorProfile.plan_expires_at).toLocaleDateString('es-MX')}
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Planes Disponibles</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const isCurrent = plan === vendedorProfile.plan
              const limit = PLAN_LIMITS[plan]
              
              return (
                <div
                  key={plan}
                  className={`bg-white shadow rounded-lg p-6 ${
                    isCurrent ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <h3 className="text-lg font-semibold mb-2">{PLAN_NAMES[plan as PlanType]}</h3>
                  <p className="text-3xl font-bold text-primary-600 mb-2">
                    {formatCurrency(PLAN_PRICES[plan])}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    {limit === Infinity ? 'Productos ilimitados' : `${limit} productos`}
                  </p>
                  {isCurrent ? (
                    <div className="px-4 py-2 bg-primary-100 text-primary-800 rounded text-center font-medium">
                      Plan Actual
                    </div>
                  ) : (
                    <UpgradePlanButton
                      currentPlan={vendedorProfile.plan}
                      newPlan={plan}
                      disabled={PLAN_PRICES[plan] <= PLAN_PRICES[vendedorProfile.plan as PlanType]}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

