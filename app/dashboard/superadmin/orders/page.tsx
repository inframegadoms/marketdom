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
import { formatCurrency, formatDate } from '@/lib/utils'
import Modal from '@/components/ui/Modal'

export default function SuperAdminOrdersPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { user: authUser, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    status: 'pending' as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  })

  useEffect(() => {
    if (authLoading) return

    if (!authUser || authUser.role !== 'superadmin') {
      router.push('/')
      return
    }

    loadOrders()
  }, [authUser, authLoading, router])

  const loadOrders = async () => {
    try {
      setLoading(true)

      // Intentar usar API route que tiene permisos de admin
      try {
        const response = await fetch('/api/admin/orders')
        if (response.ok) {
          const data = await response.json()
          console.log('Orders loaded from API:', data.orders?.length || 0)
          setOrders(data.orders || [])
          setLoading(false)
          return
        } else {
          console.warn('API route failed, falling back to direct query')
        }
      } catch (apiError) {
        console.warn('API route error, falling back to direct query:', apiError)
      }

      // Fallback: obtener órdenes directamente sin joins
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('Orders loaded:', data?.length || 0)

      if (!data || data.length === 0) {
        setOrders([])
        setLoading(false)
        return
      }

      // Obtener datos de clientes y vendedores por separado
      const clienteIds = Array.from(new Set(data.map((o: any) => o.cliente_id).filter(Boolean)))
      const vendedorIds = Array.from(new Set(data.map((o: any) => o.vendedor_id).filter(Boolean)))

      // Obtener perfiles de clientes
      const { data: clientes } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', clienteIds)

      // Obtener perfiles de vendedores
      const { data: vendedores } = await supabase
        .from('vendedor_profiles')
        .select('id, store_name')
        .in('id', vendedorIds)

      // Obtener order_items
      const orderIds = data.map((o: any) => o.id)
      const { data: orderItems } = orderIds.length > 0
        ? await supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds)
        : { data: [] }

      // Combinar datos
      const ordersWithDetails = data.map((order: any) => {
        const cliente = clientes?.find((c: any) => c.user_id === order.cliente_id)
        const vendedor = vendedores?.find((v: any) => v.id === order.vendedor_id)
        const items = orderItems?.filter((item: any) => item.order_id === order.id) || []

        return {
          ...order,
          cliente: cliente ? {
            full_name: cliente.full_name,
            email: 'N/A', // No podemos obtener email sin permisos admin
          } : null,
          vendedor: vendedor ? {
            store_name: vendedor.store_name,
          } : null,
          order_items: items,
        }
      })

      console.log('Orders with details:', ordersWithDetails.length)
      setOrders(ordersWithDetails)
    } catch (error: any) {
      console.error('Error loading orders:', error)
      showError(`Error al cargar órdenes: ${error.message || 'Error desconocido'}`)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (order: any) => {
    setEditingOrder(order)
    setFormData({
      status: order.status || 'pending',
    })
    setShowModal(true)
  }

  const handleDelete = async (orderId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta orden? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      // Primero eliminar items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      if (itemsError) throw itemsError

      // Luego eliminar orden
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (error) throw error

      showSuccess('Orden eliminada correctamente')
      loadOrders()
    } catch (error: any) {
      console.error('Error deleting order:', error)
      showError('Error al eliminar orden')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingOrder) return

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: formData.status,
        })
        .eq('id', editingOrder.id)

      if (error) throw error

      showSuccess('Orden actualizada correctamente')
      setShowModal(false)
      setEditingOrder(null)
      loadOrders()
    } catch (error: any) {
      console.error('Error updating order:', error)
      showError('Error al actualizar orden')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusName = (status: string) => {
    const names: Record<string, string> = {
      pending: 'Pendiente',
      processing: 'En Proceso',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    }
    return names[status] || status
  }

  const filteredOrders = orders.filter((order) =>
    order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.cliente?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.cliente?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.vendedor?.store_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <DashboardLayout role="superadmin" title="Gestión de Órdenes" navItems={navItems}>
        <Card className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando órdenes...</p>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="superadmin" title="Gestión de Órdenes" navItems={navItems}>
      <div className="space-y-6">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar por ID, cliente o vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Vendedor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-gray-600">
                          {order.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-medium text-gray-900 block">
                            {order.cliente?.full_name || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-500">{order.cliente?.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {order.vendedor?.store_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-semibold">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusName(order.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(order.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(order)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(order.id)}
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
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      {searchTerm ? 'No se encontraron órdenes' : 'No hay órdenes registradas'}
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
            setEditingOrder(null)
          }}
          title="Editar Orden"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              >
                <option value="pending">Pendiente</option>
                <option value="processing">En Proceso</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            {editingOrder && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Información de la orden:</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">ID:</span> {editingOrder.id}</p>
                  <p><span className="font-medium">Total:</span> {formatCurrency(editingOrder.total)}</p>
                  <p><span className="font-medium">Items:</span> {editingOrder.order_items?.length || 0}</p>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Guardar Cambios
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  setEditingOrder(null)
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

