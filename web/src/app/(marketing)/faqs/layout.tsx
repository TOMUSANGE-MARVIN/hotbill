import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQs',
  description:
    'Answers to common questions about HotBill: setup time, MikroTik support, MTN MoMo & Airtel Money payments, withdrawals, vouchers and pricing.',
  alternates: { canonical: '/faqs' },
}

export default function FaqsLayout({ children }: { children: React.ReactNode }) {
  return children
}
