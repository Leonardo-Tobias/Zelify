import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const results: string[] = []

  // Verificar se colunas existem
  const { error: checkError } = await supabase
    .from('condominios')
    .select('parent_condominio_id, max_instances')
    .limit(1)

  if (!checkError) {
    return NextResponse.json({ message: 'Colunas já existem. Nada a migrar.' })
  }

  // Tenta via raw SQL usando a função nativa do Supabase
  const queries = [
    `ALTER TABLE public.condominios ADD COLUMN IF NOT EXISTS parent_condominio_id UUID REFERENCES public.condominios(id);`,
    `ALTER TABLE public.condominios ADD COLUMN IF NOT EXISTS max_instances INTEGER;`,
    `ALTER TABLE public.condominios ALTER COLUMN slug DROP NOT NULL;`,
    `ALTER TABLE public.condominios ALTER COLUMN codigo_acesso DROP NOT NULL;`,
  ]

  for (const sql of queries) {
    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) {
      results.push(`ERRO em "${sql.slice(0, 60)}...": ${error.message}`)
    } else {
      results.push(`OK: ${sql.slice(0, 60)}...`)
    }
  }

  return NextResponse.json({ results })
}
