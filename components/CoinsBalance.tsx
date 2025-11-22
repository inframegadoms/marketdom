'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getUserCoins, getLevelName, getLevelColor } from '@/lib/gamification'
import { UserCoins } from '@/types/database.types'
import { useAuth } from '@/app/providers'

export default function CoinsBalance() {
  const { user } = useAuth()
  const [userCoins, setUserCoins] = useState<UserCoins | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Solo cargar si hay usuario y es cliente
    if (!user || user.role !== 'cliente') {
      setLoading(false)
      setUserCoins(null)
      return
    }

    loadCoins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]) // Solo re-cargar si el ID o rol cambian

  const loadCoins = async () => {
    if (!user) return

    try {
      const coins = await getUserCoins(user.id)
      
      // Si no tiene coins, inicializar automáticamente
      if (!coins) {
        try {
          const baseUrl = window.location.origin
          const response = await fetch(`${baseUrl}/api/gamification/initialize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
          })
          
          if (response.ok) {
            // Recargar coins después de inicializar
            const newCoins = await getUserCoins(user.id)
            setUserCoins(newCoins)
          }
        } catch (initError) {
          console.error('Error initializing coins:', initError)
        }
      } else {
        setUserCoins(coins)
      }
    } catch (error) {
      console.error('Error loading coins:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'cliente') {
    return null
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-16 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (!userCoins) {
    return null
  }

  const levelName = getLevelName(userCoins.level)
  const levelColor = getLevelColor(userCoins.level)

  return (
    <Link
      href="/dashboard/cliente/gamification"
      className="block bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg p-4 text-white hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary-100 mb-1">Tus Megacoins</p>
          <p className="text-2xl font-bold">{userCoins.balance.toFixed(0)} MGC</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-primary-200 mb-1">Nivel</p>
          <div className={`px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm ${levelColor.includes('from-') ? 'bg-gradient-to-r ' + levelColor : ''}`}>
            <p className="text-sm font-semibold">{levelName}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

