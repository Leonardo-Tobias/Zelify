import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireUser } from '@/lib/serverAuth'
import { cancelAsaasSubscription } from '@/lib/asaas'

export async function DELETE(req: NextRequest) {
  try {
    const { admin: supabase, user } = await requireUser(req)

    // Transfere condomínios compartilhados e remove os que pertencem só ao usuário.
    const { data: ownedCondos, error: ownedError } = await supabase
      .from('condominios')
      .select('id, parent_condominio_id, asaas_subscription_id')
      .eq('created_by', user.id)
    if (ownedError) throw ownedError

    const ownedIds = (ownedCondos || []).map(condo => condo.id)
    const { data: otherManagers, error: managersError } = ownedIds.length
      ? await supabase
          .from('usuarios_gestores')
          .select('condominio_id, user_id, papel')
          .in('condominio_id', ownedIds)
          .in('papel', ['sindico', 'admin'])
          .neq('user_id', user.id)
      : { data: [], error: null }
    if (managersError) throw managersError

    const sharedIds = new Set<string>()
    for (const manager of otherManagers || []) {
      if (sharedIds.has(manager.condominio_id)) continue
      const { error } = await supabase
        .from('condominios')
        .update({ created_by: manager.user_id })
        .eq('id', manager.condominio_id)
      if (error) throw error
      sharedIds.add(manager.condominio_id)
    }

    const exclusiveIds = ownedIds.filter(id => !sharedIds.has(id))
    if (exclusiveIds.length) {
      const subscriptionIds = new Set(
        (ownedCondos || [])
          .filter(condo => exclusiveIds.includes(condo.id) && condo.asaas_subscription_id)
          .map(condo => condo.asaas_subscription_id as string),
      )
      for (const subscriptionId of subscriptionIds) {
        try {
          await cancelAsaasSubscription(subscriptionId)
        } catch (error) {
          console.warn('[DELETE USER] Falha ao cancelar assinatura no Asaas', error)
        }
      }

      // Evita referências órfãs quando um container é removido, mas uma instância foi transferida.
      const { error: detachError } = await supabase
        .from('condominios')
        .update({ parent_condominio_id: null, plan_type: 'free' })
        .in('parent_condominio_id', exclusiveIds)
        .not('id', 'in', `(${exclusiveIds.join(',')})`)
      if (detachError) throw detachError

      const childIds = (ownedCondos || [])
        .filter(condo => exclusiveIds.includes(condo.id) && condo.parent_condominio_id)
        .map(condo => condo.id)
      if (childIds.length) {
        const { error } = await supabase.from('condominios').delete().in('id', childIds)
        if (error) throw error
      }

      const rootIds = exclusiveIds.filter(id => !childIds.includes(id))
      if (rootIds.length) {
        const { error } = await supabase.from('condominios').delete().in('id', rootIds)
        if (error) throw error
      }
    }

    const { error: linksError } = await supabase
      .from('usuarios_gestores')
      .delete()
      .eq('user_id', user.id)
    if (linksError) throw linksError

    // Deletar usuário do auth
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteUserError) {
      console.error('[DELETE USER] Erro ao deletar auth user:', deleteUserError)
      return NextResponse.json({ error: 'Erro ao deletar usuário.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Conta excluída. Condomínios compartilhados foram preservados.' })
  } catch (err) {
    const authResponse = authErrorResponse(err)
    if (authResponse) return authResponse
    console.error('[DELETE USER ERROR]', err)
    return NextResponse.json({ error: 'Erro ao excluir conta.' }, { status: 500 })
  }
}
