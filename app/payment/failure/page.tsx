import Link from 'next/link'

export default function PaymentFailurePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Pago Fallido
        </h1>
        <p className="text-gray-600 mb-6">
          No se pudo procesar tu pago. Por favor, inténtalo de nuevo.
        </p>
        <div className="space-y-2">
          <Link
            href="/marketplace"
            className="block w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Volver al Marketplace
          </Link>
        </div>
      </div>
    </div>
  )
}

