'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { db } from '@/lib/db'

type Props = {
  audience: 'gestor' | 'morador'
  portalToken?: string
  compact?: boolean
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

function isIosWithoutStandalone() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return ios && !standalone
}

export default function PushNotificationButton({ audience, portalToken, compact = true }: Props) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  const authorization = async () => audience === 'morador' ? portalToken || '' : await db.getAccessToken() || ''

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    let active = true
    setSupported(true)

    const restoreSubscription = async () => {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription || Notification.permission !== 'granted') {
        if (active) setSubscribed(false)
        return
      }

      // Reassocia a assinatura já existente ao perfil/ambiente atual. Isso
      // cobre troca de navegador, login de gestor e acesso de morador no mesmo aparelho.
      const token = audience === 'morador' ? portalToken || '' : await db.getAccessToken() || ''
      if (!token) {
        if (active) setSubscribed(false)
        return
      }
      const response = await fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ audience, subscription: subscription.toJSON() }),
      })
      if (active) setSubscribed(response.ok)
    }

    restoreSubscription().catch(error => console.error('[PUSH REGISTER]', error))
    return () => { active = false }
  }, [audience, portalToken])

  const toggle = async () => {
    if (!supported || loading) return
    if (audience === 'morador' && isIosWithoutStandalone()) {
      alert('No iPhone, toque em Compartilhar, escolha “Adicionar à Tela de Início”, abra o Zelcon pelo ícone e tente novamente.')
      return
    }

    setLoading(true)
    try {
      const token = await authorization()
      if (!token) throw new Error('Sessão expirada. Entre novamente.')
      const registration = await navigator.serviceWorker.ready
      const current = await registration.pushManager.getSubscription()

      if (subscribed && current) {
        const response = await fetch('/api/push/subscriptions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ audience, endpoint: current.endpoint }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Não foi possível desativar.')
        if (!data.remainingTargets) await current.unsubscribe()
        setSubscribed(false)
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Permissão de notificações não concedida.')
      const keyResponse = await fetch('/api/push/public-key')
      const keyData = await keyResponse.json()
      if (!keyResponse.ok || !keyData.publicKey) throw new Error(keyData.error || 'Notificações indisponíveis.')
      const subscription = current || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(keyData.publicKey),
      })
      const response = await fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ audience, subscription: subscription.toJSON() }),
      })
      if (!response.ok) throw new Error((await response.json()).error || 'Não foi possível ativar.')
      setSubscribed(true)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível configurar as notificações.')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null
  const label = subscribed ? 'Desativar notificações' : 'Ativar notificações'

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border transition-colors disabled:opacity-50 ${
        subscribed
          ? 'border-brand/25 bg-brand/10 text-brand'
          : 'border-zinc-200 bg-zinc-100 text-zinc-500 hover:text-brand dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-zinc-400'
      } ${compact ? 'h-8 w-8' : 'h-9 px-3 text-xs font-medium'}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      {!compact && <span>{subscribed ? 'Notificações ativas' : 'Ativar notificações'}</span>}
    </button>
  )
}
