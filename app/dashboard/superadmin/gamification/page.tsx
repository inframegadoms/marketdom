'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/DashboardLayout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAuth } from '@/app/providers'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/lib/utils'
import Modal from '@/components/ui/Modal'

type TabType = 'quests' | 'user_coins' | 'referrals' | 'transactions' | 'badges' | 'redemptions'

export default function SuperAdminGamificationPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { user: authUser, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('quests')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [formData, setFormData] = useState<any>({})

  // Data states
  const [quests, setQuests] = useState<any[]>([])
  const [userCoins, setUserCoins] = useState<any[]>([])
  const [referrals, setReferrals] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [redemptions, setRedemptions] = useState<any[]>([])

  useEffect(() => {
    if (authLoading) return

    if (!authUser || authUser.role !== 'superadmin') {
      router.push('/')
      return
    }

    loadData()
  }, [authUser, authLoading, router, activeTab])

  const loadData = async () => {
    try {
      setLoading(true)

      switch (activeTab) {
        case 'quests':
          await loadQuests()
          break
        case 'user_coins':
          await loadUserCoins()
          break
        case 'referrals':
          await loadReferrals()
          break
        case 'transactions':
          await loadTransactions()
          break
        case 'badges':
          await loadBadges()
          break
        case 'redemptions':
          await loadRedemptions()
          break
      }
    } catch (error: any) {
      console.error('Error loading data:', error)
      showError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const loadQuests = async () => {
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    setQuests(data || [])
  }

  const loadUserCoins = async () => {
    try {
      console.log('Loading user_coins...')
      
      // Intentar primero con API route (tiene permisos admin)
      try {
        const response = await fetch('/api/admin/user-coins')
        if (response.ok) {
          const result = await response.json()
          console.log('User coins loaded from API:', result.userCoins?.length || 0)
          if (result.userCoins && result.userCoins.length > 0) {
            setUserCoins(result.userCoins)
            return
          }
        } else {
          const errorText = await response.text()
          console.warn('API route failed:', response.status, errorText)
        }
      } catch (apiError) {
        console.warn('API route error:', apiError)
      }

      // Fallback: intentar carga directa
      console.log('Trying direct query...')
      const { data, error } = await supabase
        .from('user_coins')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading user_coins directly:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        // No lanzar error, solo mostrar mensaje
        showError(`Error al cargar monedas: ${error.message}`)
        setUserCoins([])
        return
      }
      
      console.log('User coins loaded directly:', data?.length || 0)
      if (data) {
        console.log('Sample data:', data[0])
      }
      setUserCoins(data || [])
    } catch (error: any) {
      console.error('Error in loadUserCoins:', error)
      showError(`Error al cargar monedas: ${error.message || 'Error desconocido'}`)
      setUserCoins([])
    }
  }

  const loadReferrals = async () => {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    setReferrals(data || [])
  }

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('coin_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    setTransactions(data || [])
  }

  const loadBadges = async () => {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .order('earned_at', { ascending: false })
    if (error) throw error
    setBadges(data || [])
  }

  const loadRedemptions = async () => {
    const { data, error } = await supabase
      .from('coin_redemptions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    setRedemptions(data || [])
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    if (activeTab === 'quests') {
      setFormData({
        code: item.code || '',
        name: item.name || '',
        description: item.description || '',
        reward_amount: item.reward_amount?.toString() || '',
        quest_type: item.quest_type || 'engagement',
        is_active: item.is_active ?? true,
        max_completions: item.max_completions?.toString() || '',
        target_value: item.target_value?.toString() || '1',
      })
    }
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      let error
      switch (activeTab) {
        case 'quests':
          ({ error } = await supabase.from('quests').delete().eq('id', id))
          break
        case 'user_coins':
          ({ error } = await supabase.from('user_coins').delete().eq('id', id))
          break
        case 'referrals':
          ({ error } = await supabase.from('referrals').delete().eq('id', id))
          break
        case 'transactions':
          ({ error } = await supabase.from('coin_transactions').delete().eq('id', id))
          break
        case 'badges':
          ({ error } = await supabase.from('user_badges').delete().eq('id', id))
          break
        case 'redemptions':
          ({ error } = await supabase.from('coin_redemptions').delete().eq('id', id))
          break
      }

      if (error) throw error
      showSuccess('Elemento eliminado correctamente')
      loadData()
    } catch (error: any) {
      console.error('Error deleting item:', error)
      showError('Error al eliminar elemento')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingItem) return

    try {
      let error
      if (activeTab === 'quests') {
        ({ error } = await supabase
          .from('quests')
          .update({
            code: formData.code,
            name: formData.name,
            description: formData.description,
            reward_amount: parseFloat(formData.reward_amount),
            quest_type: formData.quest_type,
            is_active: formData.is_active,
            max_completions: formData.max_completions ? parseInt(formData.max_completions) : null,
            target_value: parseInt(formData.target_value) || 1,
          })
          .eq('id', editingItem.id))
      }

      if (error) throw error
      showSuccess('Elemento actualizado correctamente')
      setShowModal(false)
      setEditingItem(null)
      loadData()
    } catch (error: any) {
      console.error('Error updating item:', error)
      showError('Error al actualizar elemento')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (activeTab !== 'quests') return

    if (!formData.code || !formData.name || !formData.description || !formData.reward_amount) {
      showError('Código, nombre, descripción y recompensa son requeridos')
      return
    }

    try {
      const { error } = await supabase
        .from('quests')
        .insert({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          reward_amount: parseFloat(formData.reward_amount),
          quest_type: formData.quest_type || 'engagement',
          is_active: formData.is_active ?? true,
          max_completions: formData.max_completions ? parseInt(formData.max_completions) : null,
          target_value: parseInt(formData.target_value) || 1,
        })

      if (error) throw error

      showSuccess('Misión creada correctamente')
      setShowCreateModal(false)
      setFormData({})
      loadData()
    } catch (error: any) {
      console.error('Error creating quest:', error)
      showError(error.message || 'Error al crear misión')
    }
  }

  const tabs = [
    { id: 'quests' as TabType, label: 'Misiones' },
    { id: 'user_coins' as TabType, label: 'Monedas de Usuarios' },
    { id: 'referrals' as TabType, label: 'Referidos' },
    { id: 'transactions' as TabType, label: 'Transacciones' },
    { id: 'badges' as TabType, label: 'Insignias' },
    { id: 'redemptions' as TabType, label: 'Canjes' },
  ]

  const navItems = [
    { href: '/dashboard/superadmin', label: 'Dashboard' },
    { href: '/dashboard/superadmin/users', label: 'Usuarios' },
    { href: '/dashboard/superadmin/vendedores', label: 'Vendedores' },
    { href: '/dashboard/superadmin/products', label: 'Productos' },
    { href: '/dashboard/superadmin/orders', label: 'Órdenes' },
    { href: '/dashboard/superadmin/gamification', label: 'Gamificación' },
  ]

  const renderTable = () => {
    if (loading) {
      return (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      )
    }

    switch (activeTab) {
      case 'quests':
        return (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Código</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Recompensa</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {quests.map((quest) => (
                <tr key={quest.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{quest.code}</td>
                  <td className="py-3 px-4">
                    <div>
                      <span className="font-medium text-gray-900 block">{quest.name}</span>
                      <span className="text-xs text-gray-500">{quest.description}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{quest.quest_type}</td>
                  <td className="py-3 px-4 text-gray-900 font-semibold">{quest.reward_amount} MGC</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      quest.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {quest.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(quest)}>
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(quest.id)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )

      case 'user_coins':
        if (userCoins.length === 0) {
          return (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay registros de monedas de usuarios</p>
            </div>
          )
        }
        return (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Usuario ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Balance</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Ganado</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Gastado</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Nivel</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Código Referido</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {userCoins.map((coin) => (
                <tr key={coin.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{coin.user_id.substring(0, 8)}...</td>
                  <td className="py-3 px-4 text-gray-900 font-semibold">{coin.balance} MGC</td>
                  <td className="py-3 px-4 text-gray-600">{coin.total_earned} MGC</td>
                  <td className="py-3 px-4 text-gray-600">{coin.total_spent} MGC</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      {coin.level}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-600">{coin.referral_code}</td>
                  <td className="py-3 px-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(coin.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )

      case 'referrals':
        return (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Referidor</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Referido</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Código</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((ref) => (
                <tr key={ref.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{ref.referrer_id.substring(0, 8)}...</td>
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{ref.referred_id.substring(0, 8)}...</td>
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{ref.referral_code}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ref.status === 'rewarded' ? 'bg-green-100 text-green-700' :
                      ref.status === 'first_purchase' ? 'bg-blue-100 text-blue-700' :
                      ref.status === 'registered' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {ref.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(ref.created_at)}</td>
                  <td className="py-3 px-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(ref.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )

      case 'transactions':
        return (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Usuario ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Cantidad</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Fuente</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{tx.user_id.substring(0, 8)}...</td>
                  <td className={`py-3 px-4 font-semibold ${
                    tx.type === 'earned' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'earned' ? '+' : '-'}{tx.amount} MGC
                  </td>
                  <td className="py-3 px-4 text-gray-600">{tx.type}</td>
                  <td className="py-3 px-4 text-gray-600">{tx.source}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(tx.created_at)}</td>
                  <td className="py-3 px-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(tx.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )

      case 'badges':
        return (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Usuario ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Insignia</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Descripción</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {badges.map((badge) => (
                <tr key={badge.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{badge.user_id.substring(0, 8)}...</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{badge.badge_name}</td>
                  <td className="py-3 px-4 text-gray-600">{badge.badge_description}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(badge.earned_at)}</td>
                  <td className="py-3 px-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(badge.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )

      case 'redemptions':
        return (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Usuario ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Coins Gastados</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Valor</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((redemption) => (
                <tr key={redemption.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{redemption.user_id.substring(0, 8)}...</td>
                  <td className="py-3 px-4 text-gray-600">{redemption.redemption_type}</td>
                  <td className="py-3 px-4 text-gray-900 font-semibold">{redemption.coins_spent} MGC</td>
                  <td className="py-3 px-4 text-gray-600">${redemption.value} MXN</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      redemption.status === 'used' ? 'bg-green-100 text-green-700' :
                      redemption.status === 'expired' ? 'bg-red-100 text-red-700' :
                      redemption.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {redemption.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(redemption.created_at)}</td>
                  <td className="py-3 px-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(redemption.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )

      default:
        return null
    }
  }

  return (
    <DashboardLayout role="superadmin" title="Gestión de Gamificación" navItems={navItems}>
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          {activeTab === 'quests' && (
            <Button onClick={() => {
              setFormData({
                code: '',
                name: '',
                description: '',
                reward_amount: '',
                quest_type: 'engagement',
                is_active: true,
                max_completions: '',
                target_value: '1',
              })
              setShowCreateModal(true)
            }}>
              + Crear Nueva Misión
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            {renderTable()}
          </div>
        </Card>

        {/* Edit Modal for Quests */}
        {activeTab === 'quests' && (
          <Modal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false)
              setEditingItem(null)
            }}
            title="Editar Misión"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Código"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              <Input
                label="Nombre"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Recompensa (MGC)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.reward_amount || ''}
                  onChange={(e) => setFormData({ ...formData, reward_amount: e.target.value })}
                  required
                />
                <Input
                  label="Valor Objetivo"
                  type="number"
                  min="1"
                  value={formData.target_value || ''}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={formData.quest_type || 'engagement'}
                  onChange={(e) => setFormData({ ...formData, quest_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                >
                  <option value="referral">Referidos</option>
                  <option value="purchase">Compras</option>
                  <option value="social">Redes Sociales</option>
                  <option value="content">Contenido</option>
                  <option value="engagement">Engagement</option>
                </select>
              </div>
              <Input
                label="Máximo de Completaciones (dejar vacío para ilimitado)"
                type="number"
                min="1"
                value={formData.max_completions || ''}
                onChange={(e) => setFormData({ ...formData, max_completions: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Misión activa
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Guardar Cambios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false)
                    setEditingItem(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Create Modal for Quests */}
        {activeTab === 'quests' && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false)
              setFormData({})
            }}
            title="Crear Nueva Misión"
          >
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Código"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="Ej: first_purchase, share_product, etc."
              />
              <Input
                label="Nombre"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Recompensa (MGC)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.reward_amount || ''}
                  onChange={(e) => setFormData({ ...formData, reward_amount: e.target.value })}
                  required
                />
                <Input
                  label="Valor Objetivo"
                  type="number"
                  min="1"
                  value={formData.target_value || ''}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={formData.quest_type || 'engagement'}
                  onChange={(e) => setFormData({ ...formData, quest_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                >
                  <option value="referral">Referidos</option>
                  <option value="purchase">Compras</option>
                  <option value="social">Redes Sociales</option>
                  <option value="content">Contenido</option>
                  <option value="engagement">Engagement</option>
                </select>
              </div>
              <Input
                label="Máximo de Completaciones (dejar vacío para ilimitado)"
                type="number"
                min="1"
                value={formData.max_completions || ''}
                onChange={(e) => setFormData({ ...formData, max_completions: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active_create"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_active_create" className="text-sm font-medium text-gray-700">
                  Misión activa
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Crear Misión
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormData({})
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  )
}

