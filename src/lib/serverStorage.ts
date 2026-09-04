import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'chamados'

export function getChamadoStoragePath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const markerIndex = url.indexOf(marker)
  if (markerIndex < 0) return null

  const path = decodeURIComponent(url.slice(markerIndex + marker.length).split('?')[0])
  return path && !path.includes('..') ? path : null
}

export function isChamadoUrlForCondominio(url: string, condominioId: string): boolean {
  const path = getChamadoStoragePath(url)
  return path?.startsWith(`${condominioId}/`) === true
}

export async function removeChamadoFile(admin: SupabaseClient, url: string | null | undefined) {
  const path = getChamadoStoragePath(url)
  if (!path) return
  const { error } = await admin.storage.from(BUCKET).remove([path])
  if (error) throw error
}

export async function removeCondominioFiles(admin: SupabaseClient, condominioIds: string[]) {
  for (const condominioId of condominioIds) {
    while (true) {
      const { data, error } = await admin.storage.from(BUCKET).list(condominioId, { limit: 100, offset: 0 })
      if (error) throw error
      if (!data?.length) break

      const paths = data.filter(item => item.id).map(item => `${condominioId}/${item.name}`)
      if (paths.length) {
        const { error: removeError } = await admin.storage.from(BUCKET).remove(paths)
        if (removeError) throw removeError
      }
      if (data.length < 100) break
    }
  }
}
