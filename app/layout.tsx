import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LADDERBATA - Apparition Timer',
  description: 'Progressive workout timer with escalating work periods',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
