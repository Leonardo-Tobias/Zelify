import { NextResponse } from 'next/server'

type Context = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
    return NextResponse.json({ error: 'Portal inválido.' }, { status: 404 })
  }

  const portalPath = `/${slug}`
  return NextResponse.json({
    id: portalPath,
    name: 'Zelcon — Portal do Morador',
    short_name: 'Zelcon',
    description: 'Portal de ocorrências do seu condomínio.',
    start_url: portalPath,
    scope: '/',
    display: 'standalone',
    background_color: '#111316',
    theme_color: '#111316',
    icons: [
      { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': 'application/manifest+json; charset=utf-8',
    },
  })
}
