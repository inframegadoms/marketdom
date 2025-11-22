'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/DashboardLayout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/app/providers'
import { useToast } from '@/contexts/ToastContext'
import {
  getUserCoins,
  getActiveQuests,
  getUserQuestProgress,
  getUserReferrals,
  getUserCoinTransactions,
  getLevelName,
  getLevelColor,
  getLevelDiscount
} from '@/lib/gamification'
import { UserCoins, QuestProgress, Referral, CoinTransaction } from '@/types/database.types'
import { formatCurrency } from '@/lib/utils'

export default function GamificationPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { user: authUser, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()

  const [userCoins, setUserCoins] = useState<UserCoins | null>(null)
  const [questProgress, setQuestProgress] = useState<QuestProgress[]>([])
  const [allQuests, setAllQuests] = useState<any[]>([]) // Todas las misiones disponibles
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [transactions, setTransactions] = useState<CoinTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)

  const loadGamificationData = async () => {
    if (!authUser) {
      console.warn('loadGamificationData: No hay usuario autenticado')
      return
    }

    try {
      console.log('loadGamificationData: Iniciando carga de datos para usuario:', authUser.id)
      setLoading(true)

      // Cargar datos en paralelo con manejo individual de errores
      const results = await Promise.allSettled([
        getUserCoins(authUser.id),
        getUserQuestProgress(authUser.id),
        getActiveQuests(),
        getUserReferrals(authUser.id),
        getUserCoinTransactions(authUser.id, 10)
      ])

      const [coinsResult, progressResult, questsResult, referralsResult, transactionsResult] = results

      // Procesar resultados
      const coins = coinsResult.status === 'fulfilled' ? coinsResult.value : null
      const progress = progressResult.status === 'fulfilled' ? progressResult.value : []
      const quests = questsResult.status === 'fulfilled' ? questsResult.value : []
      const userReferrals = referralsResult.status === 'fulfilled' ? referralsResult.value : []
      const userTransactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : []

      // Log errores individuales
      if (coinsResult.status === 'rejected') {
        console.error('Error cargando coins:', coinsResult.reason)
      }
      if (progressResult.status === 'rejected') {
        console.error('Error cargando progreso:', progressResult.reason)
      }
      if (questsResult.status === 'rejected') {
        console.error('Error cargando misiones:', questsResult.reason)
      }
      if (referralsResult.status === 'rejected') {
        console.error('Error cargando referidos:', referralsResult.reason)
      }
      if (transactionsResult.status === 'rejected') {
        console.error('Error cargando transacciones:', transactionsResult.reason)
      }

      setUserCoins(coins)
      setQuestProgress(progress)
      setAllQuests(quests)
      setReferrals(userReferrals)
      setTransactions(userTransactions)

      // Si no tiene coins, inicializar
      if (!coins) {
        console.log('Usuario no tiene coins, inicializando...')
        try {
          const { initializeUserCoins } = await import('@/lib/gamification')
          const newCoins = await initializeUserCoins(authUser.id)
          if (newCoins) {
            setUserCoins(newCoins)
            showSuccess('¡Bienvenido! Has recibido 50 Megacoins de bienvenida 🎉')
            console.log('Coins inicializados exitosamente')
          } else {
            console.warn('No se pudieron inicializar los coins')
          }
        } catch (initError) {
          console.error('Error inicializando coins:', initError)
          showError('Error al inicializar tu cuenta de Megacoins')
        }
      } else {
        console.log('Coins cargados exitosamente:', coins.balance)
      }
    } catch (error: any) {
      console.error('Error loading gamification data:', error)
      showError('Error al cargar datos de gamificación. Por favor, intenta recargar la página.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return

    if (!authUser) {
      // Pequeño delay para evitar redirecciones innecesarias durante el refresh de sesión
      const timeoutId = setTimeout(() => {
        router.push('/auth/login')
      }, 1000)
      return () => clearTimeout(timeoutId)
    }

    loadGamificationData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, authLoading, router])

  const copyReferralCode = async () => {
    if (!userCoins?.referral_code) return

    const referralUrl = `${window.location.origin}/auth/register?ref=${userCoins.referral_code}`
    
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopiedCode(true)
      showSuccess('¡Código de referido copiado!')
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (error) {
      showError('Error al copiar código')
    }
  }

  const shareReferralCode = (platform: 'facebook' | 'twitter' | 'whatsapp') => {
    if (!userCoins?.referral_code) return

    const referralUrl = `${window.location.origin}/auth/register?ref=${userCoins.referral_code}`
    const text = `¡Únete a MarketDom y obtén 50 Megacoins gratis! Usa mi código: ${userCoins.referral_code} - ${referralUrl}`

    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`
    }

    window.open(urls[platform], '_blank', 'width=600,height=400')
  }

  const navItems = [
    { href: '/dashboard/cliente', label: 'Dashboard' },
    { href: '/dashboard/cliente/orders', label: 'Mis Órdenes' },
    { href: '/dashboard/cliente/profile', label: 'Mi Perfil' },
    { href: '/dashboard/cliente/gamification', label: 'Megacoins' },
    { href: '/marketplace', label: 'Marketplace' },
  ]

  if (loading || authLoading) {
    return (
      <DashboardLayout role="cliente" title="Megacoins" navItems={navItems}>
        <Card className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </Card>
      </DashboardLayout>
    )
  }

  if (!userCoins) {
    if (loading) {
      return (
        <DashboardLayout role="cliente" title="Megacoins" navItems={navItems}>
          <Card className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos de gamificación...</p>
          </Card>
        </DashboardLayout>
      )
    }
    
    return (
      <DashboardLayout role="cliente" title="Megacoins" navItems={navItems}>
        <Card className="text-center py-16">
          <p className="text-gray-600 mb-4">No se pudieron cargar los datos de gamificación</p>
          <p className="text-sm text-gray-500 mb-4">
            Si es tu primera vez, estamos inicializando tu cuenta...
          </p>
          <Button onClick={loadGamificationData} className="mt-4">
            Reintentar
          </Button>
        </Card>
      </DashboardLayout>
    )
  }

  const levelName = getLevelName(userCoins.level)
  const levelColor = getLevelColor(userCoins.level)
  const levelDiscount = getLevelDiscount(userCoins.level)

  return (
    <DashboardLayout role="cliente" title="Megacoins" navItems={navItems}>
      <div className="space-y-6">
        {/* Balance y Nivel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Tu Saldo</p>
                <p className="text-4xl font-bold text-gray-900">{userCoins.balance.toFixed(0)}</p>
                <p className="text-gray-600 text-sm mt-1">Megacoins</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-sm mb-1">Nivel</p>
                <p className="text-2xl font-bold text-gray-900">{levelName}</p>
                <p className="text-gray-600 text-xs mt-1">{levelDiscount * 100}% descuento en canje</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Estadísticas</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Ganado</span>
                <span className="font-semibold text-gray-900">{userCoins.total_earned.toFixed(0)} MGC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Gastado</span>
                <span className="font-semibold text-gray-900">{userCoins.total_spent.toFixed(0)} MGC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Referidos</span>
                <span className="font-semibold text-gray-900">{referrals.length}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Código de Referido */}
        <Card className="bg-gradient-to-r from-primary-50 to-purple-50 border-primary-200">
          <h3 className="font-semibold text-gray-900 mb-4">Tu Código de Referido</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-white rounded-lg p-4 border-2 border-primary-300">
              <p className="text-xs text-gray-500 mb-1">Comparte este código y gana 50 MGC por cada amigo</p>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-bold text-primary-600">{userCoins.referral_code}</code>
                <button
                  onClick={copyReferralCode}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
                >
                  {copiedCode ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => shareReferralCode('facebook')}
                className="flex-1"
              >
                Facebook
              </Button>
              <Button
                variant="outline"
                onClick={() => shareReferralCode('twitter')}
                className="flex-1"
              >
                Twitter
              </Button>
              <Button
                variant="outline"
                onClick={() => shareReferralCode('whatsapp')}
                className="flex-1"
              >
                WhatsApp
              </Button>
            </div>
          </div>
        </Card>

        {/* Misiones */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Misiones Disponibles</h3>
          {allQuests.length > 0 ? (
            <div className="space-y-4">
              {allQuests.map((quest) => {
                // Buscar el progreso de esta misión
                const progress = questProgress.find(qp => qp.quest_id === quest.id)
                const currentProgress = progress?.progress || 0
                const target = quest.target_value || 1
                const percentage = Math.min((currentProgress / target) * 100, 100)
                
                // Validaciones estrictas
                // Solo está completada si el progreso alcanza o supera el objetivo Y tiene fecha de completado
                const isCompleted = currentProgress >= target && progress?.completed_at !== null && progress?.completed_at !== undefined
                // Solo está reclamada si está completada Y tiene fecha de reclamado válida
                // Verificar explícitamente que no sea null, undefined o string vacío
                const hasValidClaimedAt = progress?.claimed_at !== null && 
                                         progress?.claimed_at !== undefined && 
                                         progress?.claimed_at !== ''
                const isClaimed = isCompleted && hasValidClaimedAt
                const hasStarted = progress !== undefined && currentProgress > 0

                return (
                  <div
                    key={quest.id}
                    className={`border rounded-lg p-4 ${
                      isCompleted ? 'border-green-300 bg-green-50' : 
                      hasStarted ? 'border-primary-200 bg-primary-50/30' : 
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{quest.name}</h4>
                          {/* Solo mostrar "Nueva" si no ha comenzado */}
                          {!hasStarted && !isCompleted && (
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                              Nueva
                            </span>
                          )}
                          {/* Solo mostrar "Completada" si realmente está completada */}
                          {isCompleted && (
                            <span className="px-2 py-0.5 text-xs bg-green-200 text-green-700 rounded-full">
                              ✓ Completada
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{quest.description}</p>
                        {quest.quest_type && (
                          <p className="text-xs text-gray-500 mt-1">
                            Tipo: {
                              quest.quest_type === 'referral' ? 'Referidos' :
                              quest.quest_type === 'purchase' ? 'Compras' :
                              quest.quest_type === 'social' ? 'Redes Sociales' :
                              quest.quest_type === 'content' ? 'Contenido' :
                              'Engagement'
                            }
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-primary-600">+{quest.reward_amount} MGC</p>
                        {/* Solo mostrar "Reclamado" si realmente está reclamado */}
                        {isClaimed && (
                          <span className="text-xs text-green-600 font-medium">✓ Reclamado</span>
                        )}
                      </div>
                    </div>
                    {/* Mostrar barra de progreso si ha comenzado o está completada */}
                    {(hasStarted || isCompleted) && (
                      <div className="mt-3">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>
                            {currentProgress} / {target}
                          </span>
                          <span>{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isCompleted ? 'bg-green-500' : 'bg-primary-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {/* Mostrar mensaje de inicio solo si no ha comenzado */}
                    {!hasStarted && !isCompleted && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Progreso: 0 / {target} - ¡Comienza esta misión ahora!
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay misiones disponibles</p>
          )}
        </Card>

        {/* Referidos */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Tus Referidos</h3>
          {referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {referral.status === 'registered' && '✓ Registrado'}
                      {referral.status === 'first_purchase' && '✓ Primera compra realizada'}
                      {referral.status === 'rewarded' && '✓ Recompensa otorgada'}
                      {referral.status === 'pending' && '⏳ Pendiente'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(referral.created_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <div className="text-right">
                    {referral.status === 'first_purchase' && (
                      <span className="text-sm font-semibold text-green-600">+100 MGC</span>
                    )}
                    {referral.status === 'registered' && (
                      <span className="text-sm font-semibold text-primary-600">+50 MGC</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Aún no has referido a nadie. ¡Comparte tu código y comienza a ganar!
            </p>
          )}
        </Card>

        {/* Historial de Transacciones */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Historial Reciente</h3>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description || transaction.source}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className={`text-right font-semibold ${
                    transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'earned' ? '+' : '-'}
                    {transaction.amount.toFixed(0)} MGC
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay transacciones aún</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}

