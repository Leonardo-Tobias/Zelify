const ASAAS_API_KEY = process.env.ASAAS_API_KEY || ''
const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3'

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

  async createCustomer(name: string, email: string, cpfCnpj?: string, phone?: string): Promise<AsaasCustomer> {
    const params: Record<string, string> = { name, email }
    if (cpfCnpj) params.cpfCnpj = cpfCnpj
    if (phone && phone.length >= 10) {
      params.mobilePhone = phone
    }
    return this.request<AsaasCustomer>('POST', '/customers', params)
  },

  async updateCustomer(id: string, name: string, email: string, cpfCnpj?: string, phone?: string): Promise<AsaasCustomer> {
    const params: Record<string, string> = { name, email }
    if (cpfCnpj) params.cpfCnpj = cpfCnpj
    if (phone && phone.length >= 10) {
      params.mobilePhone = phone
    }
    return this.request<AsaasCustomer>('POST', `/customers/${id}`, params)
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
      postalCode: string
      addressNumber: string
      addressComplement?: string
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
    invoiceUrl?: string
  }> }> {
    return this.request('GET', `/payments?subscription=${subscriptionId}`)
  },

  async getPixQrCode(paymentId: string): Promise<{
    encodedImage: string
    payload: string
    expirationDate: string
  }> {
    return this.request('GET', `/payments/${paymentId}/pixQrCode`)
  },

  async tokenizeCreditCard(cardData: CreditCardData, customer: string): Promise<{ creditCardId: string }> {
    return this.request<{ creditCardId: string }>('POST', '/creditCard/tokenize', {
      customer,
      creditCard: cardData,
    })
  },

}

export async function createAsaasCustomer(name: string, email: string, cpfCnpj?: string, phone?: string) {
  return api.createCustomer(name, email, cpfCnpj, phone)
}

export async function updateAsaasCustomer(id: string, name: string, email: string, cpfCnpj?: string, phone?: string) {
  return api.updateCustomer(id, name, email, cpfCnpj, phone)
}

export async function createAsaasSubscription(
  customerId: string,
  planType: 'pro' | 'corporate',
  billingType: 'PIX' | 'CREDIT_CARD',
  cycle: 'MONTHLY' | 'YEARLY',
  value: number,
  creditCardData?: CreditCardData,
  holderInfo?: { name: string; email: string; cpfCnpj: string; postalCode: string; addressNumber: string; addressComplement?: string }
) {
  // A primeira cobrança vence hoje; o ciclo controla somente as renovações seguintes.
  const nextDueDate = new Date().toISOString().split('T')[0]

  const params: Parameters<typeof api.createSubscription>[0] = {
    customer: customerId,
    billingType,
    value,
    cycle,
    nextDueDate,
    description: planType === 'pro' ? 'Zelcon Pro' : 'Zelcon Corporate',
  }

  if (billingType === 'CREDIT_CARD' && creditCardData) {
    params.creditCard = creditCardData
    if (holderInfo) {
      params.creditCardHolderInfo = holderInfo
    }
  }

  return api.createSubscription(params)
}

export async function getPixPaymentData(subscriptionId: string) {
  const result = await api.listPaymentsBySubscription(subscriptionId)
  const payment = result.data?.[0]
  if (!payment) return null
  const qrCode = await api.getPixQrCode(payment.id)
  return {
    qrCode: qrCode.encodedImage,
    copyPaste: qrCode.payload,
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

export { api }
