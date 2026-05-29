import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OC Agents — Marketplace',
  description: 'Marketplace de ressources agentiques',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  )
}
