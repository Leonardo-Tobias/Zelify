import type { Metadata } from 'next'

type Props = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    manifest: `/${encodeURIComponent(slug)}/manifest.webmanifest`,
  }
}

export default function PortalLayout({ children }: Props) {
  return children
}
