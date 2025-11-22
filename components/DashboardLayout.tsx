'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { UserRole } from '@/types/database.types'
import Link from 'next/link'
import MobileNav from './ui/MobileNav'
import { useState, useEffect } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: UserRole
  title: string
  navItems: { href: string; label: string; icon?: string }[]
}

export default function DashboardLayout({ children, role, title, navItems }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createSupabaseClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Modern Navigation */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl md:text-2xl font-bold gradient-text hidden sm:block">
                  MarketDom
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-1">
              {navItems.map((item) => {
                // Usar pathname directamente sin isClient para evitar problemas de hidratación
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'text-primary-700 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Cerrar Sesión
              </button>
            </div>

            {/* Mobile Menu */}
            <MobileNav items={navItems} onLogout={handleLogout} />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 md:mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{title}</h1>
          <div className="h-1 w-20 bg-gradient-to-r from-primary-600 to-primary-800 rounded-full" />
        </div>
        <div className="animate-slide-up">
          {children}
        </div>
      </main>
    </div>
  )
}

