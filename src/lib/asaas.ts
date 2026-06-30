const ASAAS_API_KEY = process.env.ASAAS_API_KEY || ''
const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3'

interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj?: string
}

interface AsaasSubscription {
  id: string
  customer: string
  billingType: 'PIX' | 'CREDIT_CARD'
  value: number
  nextDueDate: string
  cycle: 'MONTHLY' | 'YEARLY'
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'CANCELLED'
}

interface CreditCardData {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

const api = {
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${ASAAS_API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.errors?.[0]?.description || `Asaas error: ${res.status}`)
    }
    return data
  },

  async createCustomer(name: string, email: string, cpfCnpj?: string): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>('POST', '/customers', { name, email, cpfCnpj })
  },

  async getCustomer(id: string): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>('GET', `/customers/${id}`)
  },

  async createSubscription(params: {
    customer: string
    billingType: 'PIX' | 'CREDIT_CARD'
    value: number
    cycle: 'MONTHLY' | 'YEARLY'
    nextDueDate: string
    description?: string
    creditCard?: CreditCardData
    creditCardHolderInfo?: {
      name: string
      email: string
      cpfCnpj: string
    }
  }): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>('POST', '/subscriptions', params)
  },

  async getSubscription(id: string): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>('GET', `/subscriptions/${id}`)
  },

  async cancelSubscription(id: string): Promise<void> {
    await this.request('DELETE', `/subscriptions/${id}`)
  },

  async listPaymentsBySubscription(subscriptionId: string): Promise<{ data: Array<{
    id: string
    status: string
    pixQrCode?: string | null
    pixCopyPaste?: string | null
    invoiceUrl?: string
  }> }> {
    return this.request('GET', `/payments?subscription=${subscriptionId}`)
  },

  async tokenizeCreditCard(cardData: CreditCardData, customer: string): Promise<{ creditCardId: string }> {
    return this.request<{ creditCardId: string }>('POST', '/creditCard/tokenize', {
      customer,
      creditCard: cardData,
    })
  },

  async createPaymentWithPix(params: {
    customer: string
    billingType: 'PIX'
    value: number
    dueDate: string
    description?: string
    externalReference?: string
  }): Promise<{
    id: string
    status: string
    pixQrCode: string | null
    pixCopyPaste: string | null
    invoiceUrl: string
  }> {
    return this.request('POST', '/payments', params)
  },
}

export async function createAsaasCustomer(name: string, email: string, cpfCnpj?: string) {
  return api.createCustomer(name, email, cpfCnpj)
}

export async function createAsaasSubscription(
  customerId: string,
  planType: 'pro' | 'corporate',
  billingType: 'PIX' | 'CREDIT_CARD',
  cycle: 'MONTHLY' | 'YEARLY',
  value: number,
  creditCardData?: CreditCardData,
  holderInfo?: { name: string; email: string; cpfCnpj: string }
) {
  const nextDueDate = cycle === 'YEARLY'
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const params: Record<string, unknown> = {
    customer: customerId,
    billingType,
    value,
    cycle,
    nextDueDate,
    description: planType === 'pro' ? 'Zelcore Pro' : 'Zelcore Corporate',
  }

  if (billingType === 'CREDIT_CARD' && creditCardData) {
    params.creditCard = creditCardData
    if (holderInfo) {
      params.creditCardHolderInfo = holderInfo
    }
  }

  return api.createSubscription(params as any)
}

export async function getPixPaymentData(subscriptionId: string) {
  // Aguarda o pagamento ser gerado (pode levar alguns segundos)
  for (let i = 0; i < 10; i++) {
    const result = await api.listPaymentsBySubscription(subscriptionId)
    const payment = result.data?.[0]
    if (payment && (payment.pixQrCode || payment.pixCopyPaste || payment.invoiceUrl)) {
      return {
        qrCode: payment.pixQrCode,
        copyPaste: payment.pixCopyPaste,
        invoiceUrl: payment.invoiceUrl,
        status: payment.status,
      }
    }
    // Espera 1 segundo antes de tentar de novo
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  // Última tentativa, retorna o que tiver
  const result = await api.listPaymentsBySubscription(subscriptionId)
  const payment = result.data?.[0]
  if (!payment) return null
  return {
    qrCode: payment.pixQrCode,
    copyPaste: payment.pixCopyPaste,
    invoiceUrl: payment.invoiceUrl,
    status: payment.status,
  }
}

export async function cancelAsaasSubscription(subscriptionId: string) {
  await api.cancelSubscription(subscriptionId)
}

export async function getSubscriptionStatus(subscriptionId: string) {
  const sub = await api.getSubscription(subscriptionId)
  return sub.status
}

export async function createAsaasPixPayment(params: {
  customer: string
  value: number
  dueDate: string
  description?: string
}) {
  const payment = await api.createPaymentWithPix({
    customer: params.customer,
    billingType: 'PIX',
    value: params.value,
    dueDate: params.dueDate,
    description: params.description,
  })
  return payment
}

export { api }
