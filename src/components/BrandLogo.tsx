import Image from 'next/image'

type BrandLogoProps = {
  className?: string
  priority?: boolean
  variant?: 'auto' | 'light' | 'dark'
}

export default function BrandLogo({
  className = 'h-7 w-auto',
  priority = false,
  variant = 'auto',
}: BrandLogoProps) {
  const lightLogo = (
    <Image
      src="/logo-claro.svg"
      alt=""
      width={634}
      height={150}
      priority={priority}
      draggable={false}
      className={className}
    />
  )

  const darkLogo = (
    <Image
      src="/logo-escuro.svg"
      alt=""
      width={634}
      height={150}
      priority={priority}
      draggable={false}
      className={className}
    />
  )

  return (
    <span role="img" aria-label="Zelcon" className="inline-flex shrink-0 items-center">
      {variant === 'light' && lightLogo}
      {variant === 'dark' && darkLogo}
      {variant === 'auto' && (
        <>
          <span className="inline-flex dark:hidden">{darkLogo}</span>
          <span className="hidden dark:inline-flex">{lightLogo}</span>
        </>
      )}
    </span>
  )
}
