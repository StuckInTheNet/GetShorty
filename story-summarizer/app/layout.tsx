import type { Metadata } from "next"
import { JetBrains_Mono } from 'next/font/google'
import "./globals.css"

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "shorty",
  description: "paste a url. get the gist.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${mono.variable} font-mono`}>
        {children}
      </body>
    </html>
  )
}
