export type UserRole = 'superadmin' | 'vendedor' | 'cliente'

export type PlanType = 'gratuito' | 'basico' | 'medio' | 'ilimitado'

export interface PlanLimits {
  gratuito: 3
  basico: 10
  medio: 25
  ilimitado: Infinity
}

export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
  profile?: UserProfile
}

export interface UserProfile {
  id: string
  user_id: string
  full_name: string
  phone?: string
  avatar_url?: string
  created_at: string
}

export interface VendedorProfile {
  id: string
  user_id: string
  store_name: string
  store_description?: string
  store_slug?: string
  store_logo?: string
  store_banner?: string
  plan: PlanType
  plan_expires_at?: string
  mercado_pago_access_token?: string
  mercado_pago_public_key?: string
  contact_email?: string
  contact_phone?: string
  social_media?: Record<string, string>
  created_at: string
}

export interface Product {
  id: string
  vendedor_id: string
  name: string
  description: string
  price: number
  stock: number
  images: string[]
  category: string
  status: 'draft' | 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface ShippingMethod {
  id: string
  vendedor_id: string
  name: string
  description?: string
  price: number
  estimated_days: number
  is_active: boolean
  created_at: string
}

export interface Coupon {
  id: string
  vendedor_id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase?: number
  max_discount?: number
  usage_limit?: number
  used_count: number
  expires_at?: string
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  cliente_id: string
  vendedor_id: string
  product_id: string
  quantity: number
  total: number
  shipping_method_id: string
  coupon_id?: string
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  mercado_pago_payment_id?: string
  shipping_address: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  created_at: string
  updated_at: string
}

// Gamificación Types
export type UserLevel = 'bronce' | 'plata' | 'oro' | 'platino' | 'diamante'
export type QuestType = 'referral' | 'purchase' | 'social' | 'content' | 'engagement'
export type RedemptionType = 'discount' | 'free_shipping' | 'product' | 'coupon'
export type SharePlatform = 'facebook' | 'instagram' | 'twitter' | 'whatsapp' | 'other'
export type ShareType = 'product' | 'store' | 'marketplace'

export interface UserCoins {
  id: string
  user_id: string
  balance: number
  total_earned: number
  total_spent: number
  level: UserLevel
  referral_code: string
  created_at: string
  updated_at: string
}

export interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  type: 'earned' | 'spent'
  source: string
  description?: string
  reference_id?: string
  created_at: string
}

export interface Quest {
  id: string
  code: string
  name: string
  description: string
  reward_amount: number
  quest_type: QuestType
  is_active: boolean
  max_completions?: number
  target_value: number
  created_at: string
  updated_at: string
}

export interface QuestProgress {
  id: string
  user_id: string
  quest_id: string
  progress: number
  target: number
  completed_at?: string
  claimed_at?: string
  created_at: string
  updated_at: string
  quest?: Quest
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  referral_code: string
  status: 'pending' | 'registered' | 'first_purchase' | 'rewarded'
  reward_claimed: boolean
  created_at: string
  updated_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_code: string
  badge_name: string
  badge_icon?: string
  badge_description?: string
  earned_at: string
}

export interface CoinRedemption {
  id: string
  user_id: string
  redemption_type: RedemptionType
  coins_spent: number
  value: number
  coupon_code?: string
  status: 'pending' | 'used' | 'expired' | 'cancelled'
  expires_at?: string
  used_at?: string
  order_id?: string
  created_at: string
}

export interface SocialShare {
  id: string
  user_id: string
  share_type: ShareType
  reference_id: string
  platform: SharePlatform
  reward_claimed: boolean
  created_at: string
}

