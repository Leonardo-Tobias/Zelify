'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { db, Condominio } from '@/lib/db'

interface CondominioContextType {
  condominio: Condominio | null
  condominios: Condominio[]
  isCorporate: boolean
  loading: boolean
  switchCondo: (target: Condominio) => void
  refreshCondo: () => Promise<void>
  setCondominio: React.Dispatch<React.SetStateAction<Condominio | null>>
}

const CondominioContext = createContext<CondominioContextType | null>(null)

export function CondominioProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [condominio, setCondominio] = useState<Condominio | null>(null)
  const [condominios, setCondominios] = useState<Condominio[]>([])
  const [isCorporate, setIsCorporate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Inicializar sessão do localStorage
  useEffect(() => {
    const savedGestor = localStorage.getItem('zelcore_gestor')
    const savedCondo = localStorage.getItem('zelcore_condominio_gestao')

    if (!savedGestor || !savedCondo) {
      router.push('/login')
      return
    }

    try {
      const gestorData = JSON.parse(savedGestor)
      setUserId(gestorData.user_id)
      setCondominio(JSON.parse(savedCondo))
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Carregar lista de condomínios e corporate status
  useEffect(() => {
    if (!userId) return

    db.getCondominiosByGestorUser(userId)
      .then((list) => {
        const containerId = list.find(
          (c) => c.plan_type === 'corporate' && !c.parent_condominio_id && !c.slug
        )?.id
        const instances = list.filter((c) => c.id !== containerId)
        setCondominios(instances)

        const hasCorporate = list.some((c) => c.plan_type === 'corporate')
        setIsCorporate(hasCorporate || list.length > 1)

        // Auto-select se o atual não está na lista
        setCondominio((prev) => {
          if (prev && instances.some((c) => c.id === prev.id)) return prev
          if (instances.length > 0) {
            localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(instances[0]))
            return instances[0]
          }
          return prev
        })
      })
      .catch((err) => console.error('Erro ao carregar condominios:', err))
  }, [userId])

  // Sincronizar subscription_status a cada navegação (pathname)
  useEffect(() => {
    if (!userId || !condominio) return
    db.getCondominiosByGestorUser(userId)
      .then((list) => {
        const fresh = list.find((c) => c.id === condominio.id)
        if (
          fresh &&
          (fresh.subscription_status !== condominio.subscription_status ||
            fresh.plan_type !== condominio.plan_type)
        ) {
          setCondominio(fresh)
          localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(fresh))
        }
      })
      .catch(() => {})
  }, [typeof window !== 'undefined' ? window.location.pathname : '']) // eslint-disable-line

  const switchCondo = useCallback(
    (target: Condominio) => {
      localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(target))
      setCondominio(target)
      window.dispatchEvent(new Event('storage'))
      router.push('/dashboard')
    },
    [router]
  )

  const refreshCondo = useCallback(async () => {
    if (!userId || !condominio) return
    try {
      const list = await db.getCondominiosByGestorUser(userId)
      const fresh = list.find((c) => c.id === condominio.id)
      if (fresh) {
        setCondominio(fresh)
        localStorage.setItem('zelcore_condominio_gestao', JSON.stringify(fresh))
      }
    } catch {}
  }, [userId, condominio])

  return (
    <CondominioContext.Provider
      value={{ condominio, condominios, isCorporate, loading, switchCondo, refreshCondo, setCondominio }}
    >
      {children}
    </CondominioContext.Provider>
  )
}

export function useCondominio() {
  const ctx = useContext(CondominioContext)
  if (!ctx) throw new Error('useCondominio deve ser usado dentro de CondominioProvider')
  return ctx
}
