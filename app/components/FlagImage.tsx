import { getFlagUrl } from '@/lib/flags'

type Props = {
  code: string
  size?: number
  className?: string
}

export default function FlagImage({ code, size = 20, className = '' }: Props) {
  const url = getFlagUrl(code)
  if (!url) return null

  return (
    <img
      src={url}
      alt={code}
      width={size}
      height={size * 0.75} // flags are 4:3 ratio
      className={`inline-block rounded-sm ${className}`}
      style={{ objectFit: 'cover' }}
    />
  )
}
