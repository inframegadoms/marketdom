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
import Link from 'next/link'

export default function SuperAdminVendedoresPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { user: authUser, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()

  const [vendedores, setVendedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingVendedor, setEditingVendedor] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    store_name: '',
    store_description: '',
    plan: 'gratuito' as 'gratuito' | 'basico' | 'medio' | 'ilimitado',
    contact_email: '',
    contact_phone: '',
    email: '',
    password: '',
    full_name: '',
  })

  useEffect(() => {
    if (authLoading) return

    if (!authUser || authUser.role !== 'superadmin') {
      router.push('/')
      return
    }

    loadVendedores()
  }, [authUser, authLoading, router])

  const loadVendedores = async () => {
    try {
      setLoading(true)

      // Intentar usar API route que tiene permisos de admin
      try {
        const response = await fetch('/api/admin/vendedores')
        if (response.ok) {
          const data = await response.json()
          console.log('Vendedores loaded from API:', data.vendedores?.length || 0)
          setVendedores(data.vendedores || [])
          setLoading(false)
          return
        } else {
          console.warn('API route failed, falling back to direct query')
        }
      } catch (apiError) {
        console.warn('API route error, falling back to direct query:', apiError)
      }

      // Fallback: obtener vendedores directamente
      const { data, error } = await supabase
        .from('vendedor_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('Vendedores loaded:', data?.length || 0)

      if (!data || data.length === 0) {
        setVendedores([])
        setLoading(false)
        return
      }

      // Obtener email del usuario usando método alternativo
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      const vendedoresWithEmail = data.map((vendedor: any) => {
        let email = 'N/A'

        // Si es el usuario actual, usar sus datos
        if (currentUser && currentUser.id === vendedor.user_id) {
          email = currentUser.email || 'N/A'
        }

        return {
          ...vendedor,
          email,
        }
      })

      console.log('Vendedores with email:', vendedoresWithEmail.length)
      setVendedores(vendedoresWithEmail)
    } catch (error: any) {
      console.error('Error loading vendedores:', error)
      showError(`Error al cargar vendedores: ${error.message || 'Error desconocido'}`)
      setVendedores([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (vendedor: any) => {
    setEditingVendedor(vendedor)
    setFormData({
      store_name: vendedor.store_name || '',
      store_description: vendedor.store_description || '',
      plan: vendedor.plan || 'gratuito',
      contact_email: vendedor.contact_email || '',
      contact_phone: vendedor.contact_phone || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (vendedorId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este vendedor? Esta acción eliminará también todos sus productos y órdenes.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('vendedor_profiles')
        .delete()
        .eq('id', vendedorId)

      if (error) throw error

      showSuccess('Vendedor eliminado correctamente')
      loadVendedores()
    } catch (error: any) {
      console.error('Error deleting vendedor:', error)
      showError('Error al eliminar vendedor')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingVendedor) return

    try {
      const { error } = await supabase
        .from('vendedor_profiles')
        .update({
          store_name: formData.store_name,
          store_description: formData.store_description || null,
          plan: formData.plan,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
        })
        .eq('id', editingVendedor.id)

      if (error) throw error

      showSuccess('Vendedor actualizado correctamente')
      setShowModal(false)
      setEditingVendedor(null)
      loadVendedores()
    } catch (error: any) {
      console.error('Error updating vendedor:', error)
      showError('Error al actualizar vendedor')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password || !formData.store_name) {
      showError('Email, contraseña y nombre de tienda son requeridos')
      return
    }

    try {
      // Crear usuario en auth con rol de vendedor
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'vendedor',
            full_name: formData.full_name || formData.store_name,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario')
      }

      // Esperar un momento para que el trigger cree el perfil de usuario
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Crear perfil de vendedor
      const { error: vendedorError } = await supabase
        .from('vendedor_profiles')
        .insert({
          user_id: authData.user.id,
          store_name: formData.store_name,
          store_description: formData.store_description || null,
          plan: formData.plan,
          contact_email: formData.contact_email || formData.email,
          contact_phone: formData.contact_phone || null,
        })

      if (vendedorError) {
        // Si falla, intentar eliminar el usuario creado
        console.error('Error creating vendedor profile:', vendedorError)
        throw vendedorError
      }

      showSuccess('Vendedor creado correctamente')
      setShowCreateModal(false)
      setFormData({
        store_name: '',
        store_description: '',
        plan: 'gratuito',
        contact_email: '',
        contact_phone: '',
        email: '',
        password: '',
        full_name: '',
      })
      loadVendedores()
    } catch (error: any) {
      console.error('Error creating vendedor:', error)
      showError(error.message || 'Error al crear vendedor')
    }
  }

  const filteredVendedores = vendedores.filter((v) =>
    v.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      gratuito: 'Gratuito',
      basico: 'Básico',
      medio: 'Medio',
      ilimitado: 'Ilimitado',
    }
    return names[plan] || plan
  }

  const navItems = [
    { href: '/dashboard/superadmin', label: 'Dashboard' },
    { href: '/dashboard/superadmin/users', label: 'Usuarios' },
    { href: '/dashboard/superadmin/vendedores', label: 'Vendedores' },
    { href: '/dashboard/superadmin/products', label: 'Productos' },
    { href: '/dashboard/superadmin/orders', label: 'Órdenes' },
    { href: '/dashboard/superadmin/gamification', label: 'Gamificación' },
  ]

  if (loading || authLoading) {
    return (
      <DashboardLayout role="superadmin" title="Gestión de Vendedores" navItems={navItems}>
        <Card className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando vendedores...</p>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="superadmin" title="Gestión de Vendedores" navItems={navItems}>
      <div className="space-y-6">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar por nombre de tienda o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + Crear Nuevo Vendedor
          </Button>
        </div>

        {/* Vendedores Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Tienda</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Plan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Contacto</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha Registro</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendedores.length > 0 ? (
                  filteredVendedores.map((vendedor) => (
                    <tr key={vendedor.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {vendedor.store_logo ? (
                            <img
                              src={vendedor.store_logo}
                              alt={vendedor.store_name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                              {vendedor.store_name?.charAt(0).toUpperCase() || 'T'}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-900 block">{vendedor.store_name}</span>
                            {vendedor.store_slug && (
                              <Link
                                href={`/tienda/${vendedor.store_slug}`}
                                target="_blank"
                                className="text-xs text-primary-600 hover:underline"
                              >
                                Ver tienda
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{vendedor.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          vendedor.plan === 'ilimitado' ? 'bg-green-100 text-green-700' :
                          vendedor.plan === 'medio' ? 'bg-blue-100 text-blue-700' :
                          vendedor.plan === 'basico' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {getPlanName(vendedor.plan)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <div className="text-sm">
                          {vendedor.contact_email && <div>{vendedor.contact_email}</div>}
                          {vendedor.contact_phone && <div className="text-gray-500">{vendedor.contact_phone}</div>}
                          {!vendedor.contact_email && !vendedor.contact_phone && '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(vendedor.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(vendedor)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(vendedor.id)}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      {searchTerm ? 'No se encontraron vendedores' : 'No hay vendedores registrados'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setEditingVendedor(null)
          }}
          title="Editar Vendedor"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre de la Tienda"
              value={formData.store_name}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.store_description}
                onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan
              </label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              >
                <option value="gratuito">Gratuito</option>
                <option value="basico">Básico</option>
                <option value="medio">Medio</option>
                <option value="ilimitado">Ilimitado</option>
              </select>
            </div>
            <Input
              label="Email de Contacto"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            />
            <Input
              label="Teléfono de Contacto"
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            />
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Guardar Cambios
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  setEditingVendedor(null)
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>

        {/* Create Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setFormData({
              store_name: '',
              store_description: '',
              plan: 'gratuito',
              contact_email: '',
              contact_phone: '',
              email: '',
              password: '',
              full_name: '',
            })
          }}
          title="Crear Nuevo Vendedor"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Nombre Completo"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
            <Input
              label="Nombre de la Tienda"
              value={formData.store_name}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.store_description}
                onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan
              </label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              >
                <option value="gratuito">Gratuito</option>
                <option value="basico">Básico</option>
                <option value="medio">Medio</option>
                <option value="ilimitado">Ilimitado</option>
              </select>
            </div>
            <Input
              label="Email de Contacto"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="Opcional (se usará el email principal si está vacío)"
            />
            <Input
              label="Teléfono de Contacto"
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            />
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Crear Vendedor
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({
                    store_name: '',
                    store_description: '',
                    plan: 'gratuito',
                    contact_email: '',
                    contact_phone: '',
                    email: '',
                    password: '',
                    full_name: '',
                  })
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

