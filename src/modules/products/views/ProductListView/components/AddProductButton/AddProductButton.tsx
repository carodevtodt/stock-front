import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ADD_PRODUCT_LABEL } from '../../../../constants'

interface Props {
  onClick: () => void
}

export function AddProductButton({ onClick }: Props) {
  return (
    <Button onClick={onClick}>
      <Plus aria-hidden />
      {ADD_PRODUCT_LABEL}
    </Button>
  )
}
