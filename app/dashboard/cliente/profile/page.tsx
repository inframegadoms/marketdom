'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/DashboardLayout'
import Card from '@/components/ui/Card'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/app/providers'

export default function ClienteProfilePage() {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { showSuccess, showError, showInfo } = useToast()
  const { user: authUser, loading: authLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Esperar a que el contexto de autenticación termine de cargar
    if (authLoading) {
      console.log('Esperando autenticación...')
      return
    }

    let mounted = true
    let timeoutId: NodeJS.Timeout

    const loadProfile = async () => {
      try {
        console.log('Cargando perfil de cliente...')
        setLoadingProfile(true)
        
        if (!authUser) {
          console.log('No hay usuario autenticado, redirigiendo a login...')
          router.push('/auth/login')
          return
        }
        
        const userId = authUser.id
        console.log('1. Usuario obtenido del contexto:', userId)
        
        if (!mounted) return

        console.log('2. Consultando perfil en base de datos...')
        // Use maybeSingle() instead of single() to handle cases where profile doesn't exist
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (!mounted) return

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

        console.log('3. Perfil obtenido:', profile ? 'Sí' : 'No')

        if (profile) {
          console.log('4. Configurando datos del perfil...')
          setFormData({
            full_name: profile.full_name || '',
            phone: profile.phone || '',
            avatar_url: profile.avatar_url || '',
          })
          if (profile.avatar_url) {
            setAvatarPreview(profile.avatar_url)
          }

          // Verificar si el perfil está completo para la misión
          const isProfileComplete = profile.full_name && profile.phone && profile.avatar_url
          if (isProfileComplete) {
            // Actualizar progreso de misión de completar perfil
            const { updateQuestProgress } = await import('@/lib/gamification')
            await updateQuestProgress(authUser.id, 'complete_profile')
          }
        } else {
          console.warn('4. No se encontró perfil, usando valores por defecto')
          // Si no hay perfil, usar valores por defecto
          setFormData({
            full_name: authUser.profile?.full_name || authUser.email?.split('@')[0] || '',
            phone: authUser.profile?.phone || '',
            avatar_url: authUser.profile?.avatar_url || '',
          })
        }

        console.log('5. Perfil cargado exitosamente')
      } catch (err: any) {
        console.error('Error completo al cargar perfil:', err)
        if (mounted) {
          setError(`Error inesperado: ${err.message || 'Error al cargar el perfil'}`)
        }
      } finally {
        if (mounted) {
          setLoadingProfile(false)
          console.log('8. Loading completado')
        }
      }
    }

    // Timeout de seguridad
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Timeout: La carga del perfil está tardando demasiado')
        setLoadingProfile(false)
        setError('La carga del perfil está tardando demasiado. Por favor, recarga la página.')
      }
    }, 10000) // 10 segundos

    loadProfile()

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [authUser, authLoading, supabase, router])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('La imagen es muy grande. Máximo 5MB')
        return
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        showError('Por favor selecciona una imagen válida')
        return
      }

      setAvatarFile(file)
      
      // Crear preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null

    try {
      setUploadingAvatar(true)
      showInfo('Subiendo imagen de perfil...')

      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `avatars/${userId}/${fileName}`

      // Subir imagen
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError)
        throw new Error(`Error al subir imagen: ${uploadError.message}`)
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (err: any) {
      console.error('Error uploading avatar:', err)
      throw err
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      let avatarUrl = formData.avatar_url

      // Subir nueva imagen si hay una seleccionada
      if (avatarFile) {
        avatarUrl = await uploadAvatar(user.id) || formData.avatar_url
      }

      // Use update instead of upsert since the profile should already exist
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          avatar_url: avatarUrl || null,
        })
        .eq('user_id', user.id)

      if (updateError) {
        // If update fails (profile doesn't exist), try insert
        if (updateError.code === 'PGRST116' || updateError.message.includes('0 rows')) {
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              full_name: formData.full_name,
              phone: formData.phone || null,
              avatar_url: avatarUrl || null,
            })
          if (insertError) throw insertError
        } else {
          throw updateError
        }
      }

      // Verificar si el perfil ahora está completo para la misión
      const isProfileComplete = formData.full_name && formData.phone && avatarUrl
      if (isProfileComplete) {
        const { updateQuestProgress } = await import('@/lib/gamification')
        await updateQuestProgress(user.id, 'complete_profile')
      }

      const successMessage = 'Perfil actualizado correctamente'
      setSuccess(successMessage)
      showSuccess(successMessage)
      
      // Limpiar archivo seleccionado
      setAvatarFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al actualizar perfil'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Eliminar avatar de la base de datos
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id)

      if (error) throw error

      setFormData({ ...formData, avatar_url: '' })
      setAvatarPreview('')
      setAvatarFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      showSuccess('Imagen de perfil eliminada')
    } catch (err: any) {
      showError('Error al eliminar imagen de perfil')
    }
  }

  const navItems = [
    { href: '/dashboard/cliente', label: 'Dashboard' },
    { href: '/dashboard/cliente/orders', label: 'Mis Órdenes' },
    { href: '/dashboard/cliente/profile', label: 'Mi Perfil' },
    { href: '/marketplace', label: 'Marketplace' },
  ]

  if (loadingProfile) {
    return (
      <DashboardLayout role="cliente" title="Mi Perfil" navItems={navItems}>
        <Card className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="cliente" title="Mi Perfil" navItems={navItems}>
      <div className="max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Card className="bg-red-50 border-red-200">
                <p className="text-red-800 font-medium">{error}</p>
              </Card>
            )}
            {success && (
              <Card className="bg-green-50 border-green-200">
                <p className="text-green-800 font-medium">{success}</p>
              </Card>
            )}

            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-200 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="cursor-pointer px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-center text-sm font-medium">
                  {avatarPreview ? 'Cambiar Imagen' : 'Subir Imagen'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Eliminar Imagen
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center">
                Máximo 5MB. Formatos: JPG, PNG, GIF
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="+52 123 456 7890"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || uploadingAvatar}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading || uploadingAvatar}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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


