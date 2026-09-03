import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export class ApiAuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 500,
  ) {
    super(message)
  }
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new ApiAuthError('Servidor não configurado.', 500)
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function getBearerToken(req: NextRequest): string {
  const authorization = req.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) throw new ApiAuthError('Não autorizado.', 401)
  return match[1]
}

export async function requireUser(req: NextRequest): Promise<{
  admin: SupabaseClient
  user: User
}> {
  const admin = getSupabaseAdmin()
  const token = getBearerToken(req)
  const { data, error } = await admin.auth.getUser(token)

  if (error || !data.user) {
    throw new ApiAuthError('Sessão inválida ou expirada.', 401)
  }

  return { admin, user: data.user }
}

export async function requireCondominioRole(
  req: NextRequest,
  condominioId: string,
  allowedRoles: Array<'sindico' | 'zelador' | 'admin'> = ['sindico', 'admin'],
) {
  const { admin, user } = await requireUser(req)
  const { data: gestor, error } = await admin
    .from('usuarios_gestores')
    .select('papel')
    .eq('user_id', user.id)
    .eq('condominio_id', condominioId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!gestor || !allowedRoles.includes(gestor.papel)) {
    throw new ApiAuthError('Você não tem permissão para este condomínio.', 403)
  }

  return { admin, user, papel: gestor.papel as 'sindico' | 'zelador' | 'admin' }
}

export function authErrorResponse(error: unknown): Response | null {
  if (!(error instanceof ApiAuthError)) return null
  return Response.json({ error: error.message }, { status: error.status })
}
