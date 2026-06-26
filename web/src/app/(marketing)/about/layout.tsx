import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description:
    'HotBill is built by engineers and operators to make running a WiFi hotspot business in Africa simple, affordable and profitable.',
  alternates: { canonical: '/about' },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
