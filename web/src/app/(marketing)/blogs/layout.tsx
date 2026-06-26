import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Guides and insights for WiFi hotspot operators and ISPs — MikroTik setup, mobile money billing, and growing a connectivity business in Africa.',
  alternates: { canonical: '/blogs' },
}

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return children
}
