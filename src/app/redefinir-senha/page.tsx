'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { db } from '@/lib/db'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('A nova senha precisa ter pelo menos 8 caracteres.')
    if (password !== confirmation) return setError('As senhas não coincidem.')

    setLoading(true)
    try {
      await db.updatePassword(password)
      await db.logoutGestor()
      router.replace('/login')
    } catch (updateError) {
      console.error(updateError)
      setError('O link expirou ou é inválido. Solicite um novo link na tela de login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page min-h-dvh bg-[#070709] flex items-center justify-center px-4 py-6 text-zinc-300 overflow-x-hidden overflow-y-auto">
      <section className="auth-card auth-shell auth-shell--compact rounded-2xl border border-zinc-800 bg-[#0f0f13] p-6 shadow-2xl my-auto">
        <div className="mb-6 text-center">
          <div className="auth-logo text-2xl font-black text-white">Zelcon<span className="text-brand">.</span></div>
          <h1 className="auth-title mt-4 text-xl font-bold text-white">Crie uma nova senha</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <label className="block text-xs font-bold uppercase tracking-wider">
            Nova senha
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-brand" />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider">
            Confirmar nova senha
            <input type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required minLength={8}
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-brand" />
          </label>
          <button disabled={loading} className="flex w-full items-center justify-center rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-50">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Atualizar senha
          </button>
        </form>
      </section>
    </main>
  )
}
