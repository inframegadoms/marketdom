'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/app/providers'

export default function VendedorProfilePage() {
  const [formData, setFormData] = useState({
    store_name: '',
    store_description: '',
    store_slug: '',
    contact_email: '',
    contact_phone: '',
    mercado_pago_access_token: '',
    mercado_pago_public_key: '',
    facebook: '',
    instagram: '',
    twitter: '',
  })
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [storeUrl, setStoreUrl] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { showSuccess, showError } = useToast()
  const { user: authUser, loading: authLoading } = useAuth()

  useEffect(() => {
    // Esperar a que el contexto de autenticación termine de cargar
    if (authLoading) {
      console.log('Esperando autenticación...')
      return
    }

    const loadProfile = async () => {
      try {
        setLoadingProfile(true)
        console.log('Cargando perfil de vendedor...')
        
        if (!authUser) {
          console.log('No hay usuario autenticado, redirigiendo a login...')
          router.push('/auth/login')
          return
        }

        const userId = authUser.id
        console.log('Usuario obtenido del contexto:', userId)

        const { data: vendedorProfile, error: profileError } = await supabase
          .from('vendedor_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (profileError) {
          console.error('Error obteniendo perfil:', profileError)
          console.error('Detalles del error:', {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code,
          })
          setError(`Error al cargar perfil: ${profileError.message}`)
          setLoadingProfile(false)
          return
        }

        if (vendedorProfile) {
          console.log('Perfil cargado:', vendedorProfile)
          
          setFormData({
            store_name: vendedorProfile.store_name || '',
            store_description: vendedorProfile.store_description || '',
            store_slug: vendedorProfile.store_slug || '',
            contact_email: vendedorProfile.contact_email || '',
            contact_phone: vendedorProfile.contact_phone || '',
            mercado_pago_access_token: vendedorProfile.mercado_pago_access_token || '',
            mercado_pago_public_key: vendedorProfile.mercado_pago_public_key || '',
            facebook: vendedorProfile.social_media?.facebook || '',
            instagram: vendedorProfile.social_media?.instagram || '',
            twitter: vendedorProfile.social_media?.twitter || '',
          })

          if (vendedorProfile.store_slug) {
            const url = typeof window !== 'undefined' 
              ? `${window.location.origin}/tienda/${vendedorProfile.store_slug}`
              : ''
            setStoreUrl(url)
            console.log('URL de tienda:', url)
          }
        } else {
          console.warn('No se encontró perfil de vendedor')
          setError('No se encontró tu perfil de vendedor. Por favor, contacta al administrador.')
        }
      } catch (err: any) {
        console.error('Error completo al cargar perfil:', err)
        setError(`Error inesperado: ${err.message || 'Error al cargar el perfil'}`)
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [authUser, authLoading, supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const socialMedia = {
        facebook: formData.facebook || undefined,
        instagram: formData.instagram || undefined,
        twitter: formData.twitter || undefined,
      }

      const { error: updateError } = await supabase
        .from('vendedor_profiles')
        .update({
          store_name: formData.store_name,
          store_description: formData.store_description || null,
          store_slug: formData.store_slug || null,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          mercado_pago_access_token: formData.mercado_pago_access_token || null,
          mercado_pago_public_key: formData.mercado_pago_public_key || null,
          social_media: socialMedia,
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      const successMessage = 'Perfil actualizado correctamente'
      setSuccess(successMessage)
      showSuccess(successMessage)
      
      if (formData.store_slug) {
        const url = typeof window !== 'undefined'
          ? `${window.location.origin}/tienda/${formData.store_slug}`
          : ''
        setStoreUrl(url)
      }
      
      // Recargar el perfil para asegurar que los datos estén actualizados
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al actualizar perfil'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
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

  if (loadingProfile) {
    return (
      <DashboardLayout role="vendedor" title="Mi Perfil" navItems={navItems}>
        <Card className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información de tu tienda...</p>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="vendedor" title="Mi Perfil" navItems={navItems}>
      <div className="max-w-4xl space-y-6">
        {error && !loadingProfile && (
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-red-800 font-medium">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Recargar página
                </button>
              </div>
            </div>
          </Card>
        )}

        {storeUrl && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">URL de tu tienda:</p>
            <Link
              href={storeUrl}
              target="_blank"
              className="text-blue-600 hover:text-blue-800 underline break-all font-mono"
            >
              {storeUrl}
            </Link>
          </Card>
        )}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <Card className="bg-green-50 border-green-200">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-green-800 font-medium">{success}</p>
                </div>
              </Card>
            )}

            <div>
              <h2 className="text-xl font-semibold mb-4">Información de la Tienda</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Tienda *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.store_name}
                    onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción de la Tienda
                  </label>
                  <textarea
                    rows={4}
                    value={formData.store_description}
                    onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe tu tienda, productos, valores..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug de la Tienda (URL)
                  </label>
                  <input
                    type="text"
                    value={formData.store_slug}
                    onChange={(e) => setFormData({ ...formData, store_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="mi-tienda"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Solo letras, números y guiones. Se usará para la URL pública de tu tienda.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email de Contacto
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Configuración de Mercado Pago</h2>
              <p className="text-sm text-gray-600 mb-4">
                Configura tus credenciales de Mercado Pago para recibir pagos directamente en tu cuenta.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token de Mercado Pago
                  </label>
                  <input
                    type="password"
                    value={formData.mercado_pago_access_token}
                    onChange={(e) => setFormData({ ...formData, mercado_pago_access_token: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="APP_USR-..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Obtén tu Access Token desde el panel de desarrolladores de Mercado Pago
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Public Key de Mercado Pago
                  </label>
                  <input
                    type="text"
                    value={formData.mercado_pago_public_key}
                    onChange={(e) => setFormData({ ...formData, mercado_pago_public_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="APP_USR-..."
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Redes Sociales</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://facebook.com/tu-pagina"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://instagram.com/tu-cuenta"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Twitter/X
                  </label>
                  <input
                    type="url"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://twitter.com/tu-cuenta"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  )
}
