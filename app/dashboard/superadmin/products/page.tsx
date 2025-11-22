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
import Link from 'next/link'

export default function SuperAdminProductsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { user: authUser, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()

  const [products, setProducts] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    vendedor_id: '',
    is_active: true,
  })

  useEffect(() => {
    if (authLoading) return

    if (!authUser || authUser.role !== 'superadmin') {
      router.push('/')
      return
    }

    loadProducts()
    loadVendedores()
  }, [authUser, authLoading, router])

  const loadVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from('vendedor_profiles')
        .select('id, store_name, user_id')
        .order('store_name', { ascending: true })

      if (error) {
        console.error('Error loading vendedores:', error)
        return
      }

      setVendedores(data || [])
    } catch (error: any) {
      console.error('Error loading vendedores:', error)
    }
  }

  const loadProducts = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          vendedor:vendedor_id (
            store_name,
            store_slug
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProducts(data || [])
    } catch (error: any) {
      console.error('Error loading products:', error)
      showError('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      stock: product.stock?.toString() || '',
      category: product.category || '',
      vendedor_id: product.vendedor_id || '',
      is_active: product.is_active ?? true,
    })
    setShowModal(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.price || !formData.vendedor_id) {
      showError('Nombre, precio y vendedor son requeridos')
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock) || 0,
          category: formData.category || null,
          vendedor_id: formData.vendedor_id,
          is_active: formData.is_active,
        })

      if (error) throw error

      showSuccess('Producto creado correctamente')
      setShowCreateModal(false)
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        vendedor_id: '',
        is_active: true,
      })
      loadProducts()
    } catch (error: any) {
      console.error('Error creating product:', error)
      showError(error.message || 'Error al crear producto')
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      showSuccess('Producto eliminado correctamente')
      loadProducts()
    } catch (error: any) {
      console.error('Error deleting product:', error)
      showError('Error al eliminar producto')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingProduct) return

    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock) || 0,
          category: formData.category || null,
          is_active: formData.is_active,
        })
        .eq('id', editingProduct.id)

      if (error) throw error

      showSuccess('Producto actualizado correctamente')
      setShowModal(false)
      setEditingProduct(null)
      loadProducts()
    } catch (error: any) {
      console.error('Error updating product:', error)
      showError('Error al actualizar producto')
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vendedor?.store_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <DashboardLayout role="superadmin" title="Gestión de Productos" navItems={navItems}>
        <Card className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando productos...</p>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="superadmin" title="Gestión de Productos" navItems={navItems}>
      <div className="space-y-6">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar por nombre, descripción o vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + Crear Nuevo Producto
          </Button>
        </div>

        {/* Products Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Producto</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Vendedor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Precio</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Stock</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white font-semibold">
                              {product.name?.charAt(0).toUpperCase() || 'P'}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-900 block">{product.name}</span>
                            {product.category && (
                              <span className="text-xs text-gray-500">{product.category}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {product.vendedor ? (
                          <Link
                            href={`/tienda/${product.vendedor.store_slug}`}
                            target="_blank"
                            className="text-primary-600 hover:underline"
                          >
                            {product.vendedor.store_name}
                          </Link>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-semibold">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{product.stock || 0}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(product.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
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
                      {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
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
            setEditingProduct(null)
          }}
          title="Editar Producto"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre del Producto"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Precio (MXN)"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
              <Input
                label="Stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
            </div>
            <Input
              label="Categoría"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Producto activo
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
                  setEditingProduct(null)
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
              name: '',
              description: '',
              price: '',
              stock: '',
              category: '',
              vendedor_id: '',
              is_active: true,
            })
          }}
          title="Crear Nuevo Producto"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Nombre del Producto"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Precio (MXN)"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
              <Input
                label="Stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
            </div>
            <Input
              label="Categoría"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendedor *
              </label>
              <select
                value={formData.vendedor_id}
                onChange={(e) => setFormData({ ...formData, vendedor_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                required
              >
                <option value="">Seleccionar vendedor...</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.store_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_create"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="is_active_create" className="text-sm font-medium text-gray-700">
                Producto activo
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Crear Producto
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({
                    name: '',
                    description: '',
                    price: '',
                    stock: '',
                    category: '',
                    vendedor_id: '',
                    is_active: true,
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

