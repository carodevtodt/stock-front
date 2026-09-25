import { useState } from 'react'

export function useProductListView() {
  const [isFormOpen, setFormOpen] = useState(false)

  return {
    isFormOpen,
    openForm: () => setFormOpen(true),
    setFormOpen,
  }
}
