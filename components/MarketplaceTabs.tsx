'use client'

import { useState } from 'react'

interface MarketplaceTabsProps {
  activeTab: 'tiendas' | 'productos' | 'categorias'
  onTabChange: (tab: 'tiendas' | 'productos' | 'categorias') => void
}

export default function MarketplaceTabs({ activeTab, onTabChange }: MarketplaceTabsProps) {
  const tabs = [
    { id: 'tiendas' as const, label: 'Tiendas', icon: '🏪' },
    { id: 'productos' as const, label: 'Productos', icon: '🛍️' },
    { id: 'categorias' as const, label: 'Categorías', icon: '📂' },
  ]

  return (
    <div className="border-b border-gray-200 mb-8">
      <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
              transition-colors duration-200
              ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

