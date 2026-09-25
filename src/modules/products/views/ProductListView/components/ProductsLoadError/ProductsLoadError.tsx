import { XCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface Props {
  message: string
  onRetry: () => void
}

export function ProductsLoadError({ message, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-md border border-destructive bg-destructive-bg px-4 py-3 text-sm text-destructive"
    >
      <span className="flex items-center gap-2">
        <XCircle aria-hidden className="size-4" />
        {message}
      </span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
