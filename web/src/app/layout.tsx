import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const SITE_URL = 'https://hotbill.app'
const DESCRIPTION =
  'HotBill is the all-in-one billing platform for WiFi hotspot operators and ISPs in Africa. Accept MTN MoMo & Airtel Money, auto-activate packages, manage MikroTik routers, sell vouchers, and get paid automatically.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'HotBill — Smart WiFi Hotspot Billing for ISPs in Africa',
    template: '%s | HotBill',
  },
  description: DESCRIPTION,
  applicationName: 'HotBill',
  keywords: [
    'WiFi billing', 'hotspot billing', 'MikroTik billing software', 'ISP billing',
    'captive portal', 'MTN MoMo payments', 'Airtel Money', 'mobile money WiFi',
    'hotspot management', 'RADIUS billing', 'WiFi voucher system', 'internet billing Africa',
    'Uganda ISP software', 'WiFi business', 'hotspot payment system',
  ],
  authors: [{ name: 'HotBill' }],
  creator: 'HotBill',
  publisher: 'HotBill',
  category: 'technology',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'HotBill',
    title: 'HotBill — Smart WiFi Hotspot Billing for ISPs in Africa',
    description: DESCRIPTION,
    images: [{ url: '/global-network.jpg', width: 728, height: 408, alt: 'HotBill — WiFi billing for Africa' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HotBill — Smart WiFi Hotspot Billing',
    description: DESCRIPTION,
    images: ['/global-network.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'HotBill',
      url: SITE_URL,
      logo: `${SITE_URL}/hotbill-logo.png`,
      description: DESCRIPTION,
      email: 'info@hotbill.app',
      areaServed: 'Africa',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'HotBill',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'HotBill',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description: DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
