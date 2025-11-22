import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function createPaymentPreference(data: {
  title: string
  description: string
  quantity: number
  unit_price: number
  payer_email: string
  external_reference: string
  back_urls?: {
    success?: string
    failure?: string
    pending?: string
  }
}) {
  const preference = new Preference(client)

  const preferenceData = {
    items: [
      {
        id: data.external_reference,
        title: data.title,
        description: data.description,
        quantity: data.quantity,
        unit_price: data.unit_price,
      },
    ],
    payer: {
      email: data.payer_email,
    },
    external_reference: data.external_reference,
    back_urls: data.back_urls || {
      success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
      failure: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failure`,
      pending: `${process.env.NEXT_PUBLIC_APP_URL}/payment/pending`,
    },
    auto_return: 'approved' as const,
  }

  const response = await preference.create({ body: preferenceData })
  return response
}

export async function getPayment(paymentId: string) {
  // This would require the Mercado Pago SDK payment methods
  // For now, we'll return a placeholder
  return { id: paymentId, status: 'pending' }
}

