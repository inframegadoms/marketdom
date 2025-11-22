'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/DashboardLayout'
import { useToast } from '@/contexts/ToastContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function EditProductPage() {
  const params = useParams()
  const productId = params.id as string
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showSuccess, showError, showInfo, showWarning } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    status: 'draft' as 'draft' | 'active' | 'inactive',
  })
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    try {
      setLoading(true)
      
      // Get user and vendedor profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: vendedorProfile } = await supabase
        .from('vendedor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!vendedorProfile) {
        showError('No tienes permisos para editar productos')
        router.push('/dashboard/vendedor/products')
        return
      }

      // Load product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('vendedor_id', vendedorProfile.id)
        .single()

      if (productError || !product) {
        showError('Producto no encontrado o no tienes permisos')
        router.push('/dashboard/vendedor/products')
        return
      }

      // Set form data
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        stock: product.stock.toString(),
        category: product.category,
        status: product.status,
      })

      setExistingImages(product.images || [])
    } catch (err: any) {
      console.error('Error loading product:', err)
      showError('Error al cargar el producto')
      router.push('/dashboard/vendedor/products')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewImages(Array.from(e.target.files))
    }
  }

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index))
  }

  const uploadNewImages = async (vendedorId: string): Promise<string[]> => {
    if (newImages.length === 0) return []
    
    const uploadedUrls: string[] = []
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    
    console.log(`Iniciando subida de ${newImages.length} nueva(s) imagen(es)...`)
    
    for (let i = 0; i < newImages.length; i++) {
      const image = newImages[i]
      console.log(`Procesando imagen ${i + 1}/${newImages.length}: ${image.name}`)
      
      try {
        // Validar tamaño del archivo
        if (image.size > MAX_FILE_SIZE) {
          console.warn(`Imagen ${image.name} es muy grande (${(image.size / 1024 / 1024).toFixed(2)}MB). Máximo: 5MB`)
          continue
        }

        const fileExt = image.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${vendedorId}/${fileName}`

        console.log(`Subiendo a: ${filePath}`)

        // Intentar subir con timeout más corto (10 segundos)
        const uploadPromise = supabase.storage
          .from('products')
          .upload(filePath, image, {
            cacheControl: '3600',
            upsert: false
          })

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: La subida tardó más de 10 segundos')), 10000)
        )

        const result = await Promise.race([uploadPromise, timeoutPromise]) as any
        
        if (result.error) {
          console.error(`Error subiendo ${image.name}:`, result.error)
          continue
        }

        console.log(`Imagen ${image.name} subida exitosamente`)

        const { data: urlData } = supabase.storage
          .from('products')
          .getPublicUrl(filePath)

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl)
          console.log(`URL obtenida: ${urlData.publicUrl}`)
        }
      } catch (error: any) {
        console.error(`Error procesando imagen ${image.name}:`, error)
        continue
      }
    }

    console.log(`Subida completada. ${uploadedUrls.length} de ${newImages.length} imágenes subidas.`)
    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Get vendedor profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data: vendedorProfile } = await supabase
        .from('vendedor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!vendedorProfile) throw new Error('Perfil de vendedor no encontrado')

      // Upload new images - Con timeout total de 30 segundos
      let newImageUrls: string[] = []
      if (newImages.length > 0) {
        showInfo('Subiendo nuevas imágenes...')
        
        try {
          // Timeout total para toda la operación de subida
          const uploadWithTimeout = Promise.race([
            uploadNewImages(vendedorProfile.id),
            new Promise<string[]>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout: La subida de imágenes tardó demasiado')), 30000)
            )
          ])

          newImageUrls = await uploadWithTimeout
          
          if (newImageUrls.length > 0) {
            if (newImageUrls.length < newImages.length) {
              showWarning(`Se subieron ${newImageUrls.length} de ${newImages.length} imagen(es). Algunas pueden haber fallado.`)
            } else {
              showSuccess(`${newImageUrls.length} imagen(es) subida(s) correctamente`)
            }
          } else {
            showWarning('No se pudieron subir las nuevas imágenes. Continuando con la actualización...')
          }
        } catch (imageError: any) {
          console.warn('Error al subir imágenes:', imageError)
          showWarning('No se pudieron subir las nuevas imágenes. Continuando con la actualización...')
          // Continuar sin nuevas imágenes
          newImageUrls = []
        }
      }

      // Combine existing and new images
      const allImages = [...existingImages, ...newImageUrls]

      console.log('Actualizando producto en la base de datos...')
      console.log('Datos del producto:', {
        name: formData.name,
        price: formData.price,
        stock: formData.stock,
        imagesCount: allImages.length
      })

      // Update product
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          category: formData.category,
          status: formData.status,
          images: allImages,
        })
        .eq('id', productId)
        .eq('vendedor_id', vendedorProfile.id)

      if (updateError) {
        console.error('Error al actualizar producto:', updateError)
        console.error('Detalles del error:', JSON.stringify(updateError, null, 2))
        throw new Error(`Error al actualizar producto: ${updateError.message}`)
      }

      console.log('Producto actualizado exitosamente')
      showSuccess('Producto actualizado exitosamente')
      setSaving(false)
      
      // Redirect immediately without delay
      router.push('/dashboard/vendedor/products')
      router.refresh()
    } catch (err: any) {
      console.error('Error updating product:', err)
      const errorMessage = err.message || 'Error al actualizar producto'
      setError(errorMessage)
      showError(errorMessage)
      setSaving(false)
    }
  }

  const navItems = [
    { href: '/dashboard/vendedor', label: 'Dashboard' },
    { href: '/dashboard/vendedor/products', label: 'Productos' },
    { href: '/dashboard/vendedor/shipping', label: 'Envíos' },
    { href: '/dashboard/vendedor/coupons', label: 'Cupones' },
    { href: '/dashboard/vendedor/orders', label: 'Órdenes' },
    { href: '/dashboard/vendedor/plan', label: 'Mi Plan' },
    { href: '/dashboard/vendedor/profile', label: 'Mi Perfil' },
  ]

  if (loading) {
    return (
      <DashboardLayout role="vendedor" title="Editar Producto" navItems={navItems}>
        <Card className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando producto...</p>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="vendedor" title="Editar Producto" navItems={navItems}>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <Card className="bg-red-50 border-red-200">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        <Card>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Producto
              </label>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Laptop HP 15.6 pulgadas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                placeholder="Describe tu producto en detalle..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio (MXN)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock
                </label>
                <Input
                  type="number"
                  required
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <Input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ej: Electrónica, Ropa, Hogar..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
              >
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Imágenes Actuales</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {existingImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Imagen ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    aria-label="Eliminar imagen"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* New Images */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Nuevas Imágenes</h3>
          <div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
            />
            {newImages.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                {newImages.length} nueva(s) imagen(es) seleccionada(s)
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Puedes agregar múltiples imágenes. Las nuevas se agregarán a las existentes.
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={saving}
            loading={saving}
            size="lg"
            className="flex-1"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </DashboardLayout>
  )
}

