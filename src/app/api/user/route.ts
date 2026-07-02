import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 401 })
    }

    // Buscar gestor e condomínios vinculados
    const { data: gestores } = await supabase
      .from('usuarios_gestores')
      .select('condominio_id')
      .eq('user_id', user.id)

    const condoIds = gestores?.map(g => g.condominio_id) || []

    // Deletar chamados dos condomínios
    for (const condoId of condoIds) {
      await supabase.from('chamados').delete().eq('condominio_id', condoId)
    }

    // Deletar gestores
    await supabase.from('usuarios_gestores').delete().eq('user_id', user.id)

    // Deletar condomínios
    for (const condoId of condoIds) {
      await supabase.from('condominios').delete().eq('id', condoId)
    }

    // Deletar usuário do auth
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteUserError) {
      console.error('[DELETE USER] Erro ao deletar auth user:', deleteUserError)
      return NextResponse.json({ error: 'Erro ao deletar usuário.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Conta e todos os dados foram excluídos permanentemente.' })
  } catch (err) {
    console.error('[DELETE USER ERROR]', err)
    return NextResponse.json({ error: 'Erro ao excluir conta.' }, { status: 500 })
  }
}
