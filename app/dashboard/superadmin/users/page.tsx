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
import { UserProfile } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import Modal from '@/components/ui/Modal'

export default function SuperAdminUsersPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { user: authUser, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()

  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    role: 'cliente' as 'cliente' | 'vendedor' | 'superadmin',
  })

  useEffect(() => {
    if (authLoading) return

    if (!authUser || authUser.role !== 'superadmin') {
      router.push('/')
      return
    }

    loadUsers()
  }, [authUser, authLoading, router])

  const loadUsers = async () => {
    try {
      setLoading(true)

      // Intentar usar API route que tiene permisos de admin
      try {
        const response = await fetch('/api/admin/users')
        if (response.ok) {
          const data = await response.json()
          console.log('Users loaded from API:', data.users?.length || 0)
          setUsers(data.users || [])
          setLoading(false)
          return
        } else {
          console.warn('API route failed, falling back to direct query')
        }
      } catch (apiError) {
        console.warn('API route error, falling back to direct query:', apiError)
      }

      // Fallback: obtener usuarios directamente desde user_profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        throw profilesError
      }

      console.log('Profiles loaded:', profiles?.length || 0)

      if (!profiles || profiles.length === 0) {
        setUsers([])
        setLoading(false)
        return
      }

      // Obtener información de auth.users usando método alternativo
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      const usersWithProfiles = profiles.map((profile) => {
        let email = 'N/A'
        let role = 'cliente'

        // Si es el usuario actual, usar sus datos
        if (currentUser?.id === profile.user_id) {
          email = currentUser.email || 'N/A'
          role = currentUser.user_metadata?.role || 'cliente'
        }

        return {
          ...profile,
          email,
          role,
        }
      })

      console.log('Users with profiles:', usersWithProfiles.length)
      setUsers(usersWithProfiles)
    } catch (error: any) {
      console.error('Error loading users:', error)
      showError(`Error al cargar usuarios: ${error.message || 'Error desconocido'}`)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setFormData({
      full_name: user.full_name || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role || 'cliente',
    })
    setShowModal(true)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      // Eliminar perfil
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId)

      if (profileError) throw profileError

      // Nota: Eliminar usuario de auth requiere permisos de administrador
      // Esto debe hacerse desde el servidor o usando la API de Supabase Admin
      console.warn('Nota: Para eliminar completamente el usuario de auth, se requiere usar la API de administrador')

      showSuccess('Usuario eliminado correctamente')
      loadUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      showError('Error al eliminar usuario')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingUser) return

    try {
      // Actualizar perfil
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
        })
        .eq('user_id', editingUser.user_id)

      if (profileError) throw profileError

      // Nota: Actualizar rol en metadata requiere permisos de administrador
      // Esto debe hacerse desde el servidor o usando la API de Supabase Admin
      console.warn('Nota: Para actualizar el rol del usuario en auth, se requiere usar la API de administrador')

      showSuccess('Usuario actualizado correctamente')
      setShowModal(false)
      setEditingUser(null)
      loadUsers()
    } catch (error: any) {
      console.error('Error updating user:', error)
      showError('Error al actualizar usuario')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      showError('Email y contraseña son requeridos')
      return
    }

    try {
      // Crear usuario en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: formData.role,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario')
      }

      // Esperar un momento para que el trigger cree el perfil
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Actualizar perfil si existe
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
        })
        .eq('user_id', authData.user.id)

      if (profileError && profileError.code !== 'PGRST116') {
        // Si el perfil no existe, crearlo manualmente
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            full_name: formData.full_name,
            phone: formData.phone || null,
          })

        if (insertError) throw insertError
      }

      showSuccess('Usuario creado correctamente')
      setShowCreateModal(false)
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        password: '',
        role: 'cliente',
      })
      loadUsers()
    } catch (error: any) {
      console.error('Error creating user:', error)
      showError(error.message || 'Error al crear usuario')
    }
  }

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <DashboardLayout role="superadmin" title="Gestión de Usuarios" navItems={navItems}>
        <Card className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando usuarios...</p>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="superadmin" title="Gestión de Usuarios" navItems={navItems}>
      <div className="space-y-6">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + Crear Nuevo Usuario
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Rol</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Teléfono</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha Registro</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {user.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{user.full_name || 'Sin nombre'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                          user.role === 'vendedor' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role === 'superadmin' ? 'SuperAdmin' :
                           user.role === 'vendedor' ? 'Vendedor' :
                           'Cliente'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{user.phone || '-'}</td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(user.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user.user_id)}
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
                      {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
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
            setEditingUser(null)
          }}
          title="Editar Usuario"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre Completo"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled
            />
            <Input
              label="Teléfono"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              >
                <option value="cliente">Cliente</option>
                <option value="vendedor">Vendedor</option>
                <option value="superadmin">SuperAdmin</option>
              </select>
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
                  setEditingUser(null)
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
              full_name: '',
              phone: '',
              email: '',
              password: '',
              role: 'cliente',
            })
          }}
          title="Crear Nuevo Usuario"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Nombre Completo"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
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
              label="Teléfono"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              >
                <option value="cliente">Cliente</option>
                <option value="vendedor">Vendedor</option>
                <option value="superadmin">SuperAdmin</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Crear Usuario
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({
                    full_name: '',
                    phone: '',
                    email: '',
                    password: '',
                    role: 'cliente',
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

