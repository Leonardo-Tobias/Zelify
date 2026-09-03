import { NextResponse } from 'next/server'

// Migrações devem ser executadas pelo Supabase CLI/painel, nunca por uma rota pública.
export function GET() {
  return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
}
