import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'

export default async function HomePage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const role = user.user_metadata?.role || 'cliente'
    
    if (role === 'superadmin') {
      redirect('/dashboard/superadmin')
    } else if (role === 'vendedor') {
      redirect('/dashboard/vendedor')
    } else {
      redirect('/dashboard/cliente')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-glow">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-2xl font-bold text-white">MarketDom</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/marketplace" className="text-white/80 hover:text-white transition-colors">
                Marketplace
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
              El futuro del
              <span className="block gradient-text bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                e-commerce
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed">
              Plataforma marketplace completa, moderna y profesional.
              <br className="hidden md:block" />
              Conecta vendedores y compradores en un solo lugar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth/register">
                <Button size="lg" className="w-full sm:w-auto min-w-[200px] shadow-glow hover:shadow-glow-lg">
                  Comenzar Ahora
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-[200px] border-white/30 text-white hover:bg-white/10">
                  Iniciar Sesión
                </Button>
              </Link>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10">
                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Fácil de Usar</h3>
                <p className="text-gray-400 text-sm">Interfaz intuitiva y moderna</p>
              </div>
              <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Seguro</h3>
                <p className="text-gray-400 text-sm">Pagos seguros con Mercado Pago</p>
              </div>
              <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10">
                <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Rápido</h3>
                <p className="text-gray-400 text-sm">Optimizado para móviles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

