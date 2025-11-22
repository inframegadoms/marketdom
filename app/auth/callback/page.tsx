'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Esta página solo muestra un loading mientras la ruta de API procesa el callback
    // La ruta de API (/auth/callback/route.ts) maneja todo el procesamiento
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      router.push(`/auth/login?error=${encodeURIComponent(error)}`)
    } else if (!code) {
      // Si no hay código después de un momento, redirigir al login
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    }
    // Si hay código, la ruta de API lo procesará automáticamente
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 p-4">
      <Card className="glass backdrop-blur-xl border-white/20 max-w-md w-full">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Completando autenticación...
          </h2>
          <p className="text-gray-600">
            Por favor, espera mientras configuramos tu cuenta
          </p>
        </div>
      </Card>
    </div>
  )
}

