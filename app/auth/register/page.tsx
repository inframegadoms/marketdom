'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { useToast } from '@/contexts/ToastContext'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'cliente' as 'cliente' | 'vendedor',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()
  const { showSuccess, showError, showInfo } = useToast()

  useEffect(() => {
    // Detectar código de referido de la URL
    const ref = searchParams.get('ref')
    if (ref) {
      setReferralCode(ref)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: formData.role,
            full_name: formData.fullName,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        showInfo('Creando tu cuenta...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: authData.user.id,
            full_name: formData.fullName,
          }, {
            onConflict: 'user_id'
          })

        if (profileError) {
          console.warn('Error actualizando perfil:', profileError)
        }

        if (formData.role === 'vendedor') {
          showInfo('Configurando tu perfil de vendedor...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const { data: existingVendedor } = await supabase
            .from('vendedor_profiles')
            .select('id')
            .eq('user_id', authData.user.id)
            .maybeSingle()

          if (!existingVendedor) {
            const { error: vendedorError } = await supabase
              .from('vendedor_profiles')
              .insert({
                user_id: authData.user.id,
                store_name: `${formData.fullName}'s Store`,
                plan: 'gratuito',
              })

            if (vendedorError) {
              console.error('Error creando perfil de vendedor:', vendedorError)
              const errorMessage = `Usuario creado, pero hubo un problema creando el perfil de vendedor: ${vendedorError.message}. Por favor, contacta al administrador.`
              setError(errorMessage)
              showError(errorMessage)
              setLoading(false)
              return
            }
          }
        }

        // Inicializar sistema de gamificación (solo para clientes)
        if (formData.role === 'cliente') {
          showInfo('Configurando tu cuenta de Megacoins...')
          
          // Llamar a API para inicializar coins
          try {
            const baseUrl = window.location.origin
            await fetch(`${baseUrl}/api/gamification/initialize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: authData.user.id })
            })

            // Procesar referido si existe
            if (referralCode) {
              await fetch(`${baseUrl}/api/gamification/referral`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  referrerCode: referralCode,
                  referredId: authData.user.id
                })
              })
              showSuccess('¡Has sido referido! Tu amigo recibirá 50 Megacoins 🎉')
            }
          } catch (gamificationError) {
            console.error('Error inicializando gamificación:', gamificationError)
            // No bloquear el registro si falla
          }
        }

        showSuccess('¡Cuenta creada exitosamente! Redirigiendo...')
        setTimeout(() => {
          router.push('/auth/login?registered=true')
        }, 1500)
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al registrarse'
      setError(errorMessage)
      showError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <Card className="glass backdrop-blur-xl border-white/20">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-glow">
                <span className="text-white font-bold text-2xl">M</span>
              </div>
            </Link>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Crea tu cuenta
            </h2>
            <p className="text-gray-300">Únete a nuestra plataforma</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg backdrop-blur-sm animate-slide-down">
                {error}
              </div>
            )}

            <Input
              label="Nombre Completo"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="bg-white/10 border-white/20 text-gray-900 placeholder:text-gray-500 focus:bg-white/20"
              placeholder="Juan Pérez"
            />

            <Input
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-white/10 border-white/20 text-gray-900 placeholder:text-gray-500 focus:bg-white/20"
              placeholder="tu@email.com"
            />

            <Input
              label="Contraseña"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="bg-white/10 border-white/20 text-gray-900 placeholder:text-gray-500 focus:bg-white/20"
              placeholder="••••••••"
              helperText="Mínimo 6 caracteres"
            />

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Tipo de Cuenta
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'cliente' | 'vendedor' })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              >
                <option value="cliente" className="bg-gray-100 text-gray-900">Cliente</option>
                <option value="vendedor" className="bg-gray-100 text-gray-900">Vendedor</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              size="lg"
              className="w-full shadow-glow hover:shadow-glow-lg"
            >
              Crear Cuenta
            </Button>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="text-primary-300 hover:text-primary-200 transition-colors text-sm font-medium"
              >
                ¿Ya tienes cuenta?{' '}
                <span className="underline">Inicia sesión</span>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
