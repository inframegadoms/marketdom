'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import Button from './ui/Button'
import { useToast } from '@/contexts/ToastContext'

interface UpdateOrderStatusProps {
  orderId: string
  currentStatus: string
}

export default function UpdateOrderStatus({ orderId, currentStatus }: UpdateOrderStatusProps) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createSupabaseClient()
  const { showSuccess, showError } = useToast()

  const handleUpdate = async (newStatus: string) => {
    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (updateError) throw updateError

      setStatus(newStatus)
      const statusText = getNextStatusText() || 'Estado actualizado'
      showSuccess(statusText)
      
      // Pequeño delay antes de recargar para que el usuario vea el toast
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al actualizar estado'
      setError(errorMessage)
      showError(errorMessage)
      console.error('Error updating order status:', err)
    } finally {
      setLoading(false)
    }
  }

  const getNextStatus = () => {
    switch (status) {
      case 'pending':
        return 'paid'
      case 'paid':
        return 'shipped'
      case 'shipped':
        return 'delivered'
      default:
        return null
    }
  }

  const getNextStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Marcar como Pagado'
      case 'paid':
        return 'Marcar como Enviado'
      case 'shipped':
        return 'Marcar como Entregado'
      default:
        return null
    }
  }

  const nextStatus = getNextStatus()
  const nextStatusText = getNextStatusText()

  if (status === 'delivered' || status === 'cancelled') {
    return (
      <span className="text-sm text-gray-500 italic">
        {status === 'delivered' ? 'Orden completada' : 'Orden cancelada'}
      </span>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {nextStatus && (
        <Button
          onClick={() => handleUpdate(nextStatus)}
          disabled={loading}
          loading={loading}
          size="sm"
          variant="outline"
          className="w-full lg:w-auto"
        >
          {nextStatusText}
        </Button>
      )}
    </div>
  )
}

