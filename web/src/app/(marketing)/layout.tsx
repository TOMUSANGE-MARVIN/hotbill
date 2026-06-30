import { Karla } from 'next/font/google'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import WhatsAppButton from '@/components/landing/WhatsAppButton'

const karla = Karla({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${karla.className} bg-lightgray text-navy min-h-screen`}>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
