import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'HotBill — Smart Hotspot. Seamless Billing.',
  description: 'Manage Your Network For Tomorrow\'s Revenue Today. HotBill is the all-in-one platform to manage MikroTik hotspots and automate billing.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-lightgray text-navy">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
