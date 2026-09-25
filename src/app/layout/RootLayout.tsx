import { Outlet } from 'react-router-dom'
import { Toaster } from '@/shared/components/ui/sonner'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Product Management</h1>
      </header>
      <main className="flex flex-col gap-4 p-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
