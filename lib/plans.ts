import { PlanType, PlanLimits } from '@/types/database.types'

export const PLAN_LIMITS: PlanLimits = {
  gratuito: 3,
  basico: 10,
  medio: 25,
  ilimitado: Infinity
}

export const PLAN_NAMES: Record<PlanType, string> = {
  gratuito: 'Plan Gratuito',
  basico: 'Plan Básico',
  medio: 'Plan Medio',
  ilimitado: 'Plan Ilimitado'
}

export const PLAN_PRICES: Record<PlanType, number> = {
  gratuito: 0,
  basico: 1000,
  medio: 2500,
  ilimitado: 5000
}

export function getProductLimit(plan: PlanType): number {
  return PLAN_LIMITS[plan]
}

export function canPublishProduct(plan: PlanType, currentProductCount: number): boolean {
  const limit = getProductLimit(plan)
  return currentProductCount < limit
}

export function getRemainingProducts(plan: PlanType, currentProductCount: number): number {
  const limit = getProductLimit(plan)
  if (limit === Infinity) return Infinity
  return Math.max(0, limit - currentProductCount)
}

