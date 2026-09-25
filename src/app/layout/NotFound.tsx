import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'

export function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-muted-foreground">Page not found.</p>
      <Button asChild variant="outline">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  )
}
