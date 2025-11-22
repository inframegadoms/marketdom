'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/DashboardLayout'
import { useToast } from '@/contexts/ToastContext'

export default function NewProductPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    status: 'draft' as 'draft' | 'active' | 'inactive',
  })
  const [images, setImages] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showSuccess, showError, showInfo, showWarning } = useToast()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files))
    }
  }

  const uploadImages = async (vendedorId: string): Promise<string[]> => {
    if (images.length === 0) return []
    
    const uploadedUrls: string[] = []
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    
    console.log(`Iniciando subida de ${images.length} imagen(es)...`)
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      console.log(`Procesando imagen ${i + 1}/${images.length}: ${image.name}`)
      
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
        // Continuar con la siguiente imagen
        continue
      }
    }

    console.log(`Subida completada. ${uploadedUrls.length} de ${images.length} imágenes subidas.`)
    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUploading(true)

    try {
      console.log('Iniciando creación de producto...')
      
      // Get vendedor profile
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw new Error(`Error de autenticación: ${userError.message}`)
      if (!user) throw new Error('No autenticado')

      console.log('Usuario obtenido:', user.id)

      const { data: vendedorProfile, error: vendedorError } = await supabase
        .from('vendedor_profiles')
        .select('id, plan')
        .eq('user_id', user.id)
        .single()

      if (vendedorError) throw new Error(`Error al obtener perfil: ${vendedorError.message}`)
      if (!vendedorProfile) throw new Error('Perfil de vendedor no encontrado')

      console.log('Perfil de vendedor obtenido:', vendedorProfile.id)

      // Verificar límite de productos según el plan
      const { count: productCount, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_id', vendedorProfile.id)

      if (countError) {
        console.warn('Error al contar productos:', countError)
      }

      // Verificar límite (esto se puede hacer más robusto con una función)
      const planLimits: Record<string, number> = {
        gratuito: 3,
        basico: 10,
        medio: 25,
        ilimitado: Infinity
      }
      
      const limit = planLimits[vendedorProfile.plan] || 3
      if (limit !== Infinity && (productCount || 0) >= limit) {
        throw new Error(`Has alcanzado el límite de productos para tu plan (${limit} productos). Actualiza tu plan para publicar más productos.`)
      }

      console.log('Límite verificado. Productos actuales:', productCount, 'Límite:', limit)

      // Upload images (opcional) - Con timeout total de 30 segundos
      let imageUrls: string[] = []
      if (images.length > 0) {
        console.log('Subiendo imágenes...')
        showInfo('Subiendo imágenes...')
        
        try {
          // Timeout total para toda la operación de subida
          const uploadWithTimeout = Promise.race([
            uploadImages(vendedorProfile.id),
            new Promise<string[]>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout: La subida de imágenes tardó demasiado')), 30000)
            )
          ])

          imageUrls = await uploadWithTimeout
          console.log('Imágenes subidas:', imageUrls.length)
          
          if (imageUrls.length > 0) {
            if (imageUrls.length < images.length) {
              showWarning(`Se subieron ${imageUrls.length} de ${images.length} imagen(es). Algunas pueden haber fallado.`)
            } else {
              showSuccess(`${imageUrls.length} imagen(es) subida(s) correctamente`)
            }
          } else {
            showWarning('No se pudieron subir las imágenes. El producto se creará sin imágenes.')
          }
        } catch (imageError: any) {
          console.warn('Error al subir imágenes, continuando sin imágenes:', imageError)
          showWarning('No se pudieron subir las imágenes. El producto se creará sin imágenes.')
          // Continuar sin imágenes
          imageUrls = []
        }
      }

      // Create product (siempre crear, incluso sin imágenes)
      console.log('Creando producto en la base de datos...')
      console.log('Datos del producto:', {
        name: formData.name,
        price: formData.price,
        stock: formData.stock,
        imagesCount: imageUrls.length
      })
      
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          vendedor_id: vendedorProfile.id,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          category: formData.category,
          status: formData.status,
          images: imageUrls,
        })
        .select()
        .single()

      if (productError) {
        console.error('Error al crear producto:', productError)
        console.error('Detalles del error:', JSON.stringify(productError, null, 2))
        throw new Error(`Error al crear producto: ${productError.message}`)
      }

      console.log('Producto creado exitosamente:', newProduct?.id)

      showSuccess('Producto creado exitosamente')
      setUploading(false)
      
      // Redirigir inmediatamente sin delay
      router.push('/dashboard/vendedor/products')
      router.refresh()
    } catch (err: any) {
      console.error('Error completo:', err)
      const errorMessage = err.message || 'Error al crear producto'
      setError(errorMessage)
      showError(errorMessage)
      setUploading(false)
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

  return (
    <DashboardLayout role="vendedor" title="Nuevo Producto" navItems={navItems}>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Producto
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio (MXN)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <input
            type="text"
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Imágenes (Opcional)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          {images.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {images.length} imagen(es) seleccionada(s)
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Nota: Si el bucket de Storage no está configurado, puedes crear el producto sin imágenes y agregarlas después.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {uploading ? (images.length > 0 ? 'Subiendo imágenes y guardando...' : 'Guardando producto...') : 'Guardar Producto'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </DashboardLayout>
  )
}

