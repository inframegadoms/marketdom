'use client'

import { useRouter } from 'next/navigation'
import { PlanType } from '@/types/database.types'
import { PLAN_PRICES } from '@/lib/plans'

interface UpgradePlanButtonProps {
  currentPlan: PlanType
  newPlan: PlanType
  disabled?: boolean
}

export default function UpgradePlanButton({ currentPlan, newPlan, disabled }: UpgradePlanButtonProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    if (disabled || PLAN_PRICES[newPlan] <= PLAN_PRICES[currentPlan]) return

    // Redirigir a la página de pago con el plan seleccionado
    router.push(`/dashboard/vendedor/plan/payment?plan=${newPlan}`)
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={disabled}
      className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {disabled ? 'No disponible' : PLAN_PRICES[newPlan] === 0 ? 'Seleccionar Plan' : 'Contratar Plan'}
    </button>
  )
}

