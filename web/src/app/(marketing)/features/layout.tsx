import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Features — MikroTik Hotspot Billing, MoMo Payments & Vouchers | HotBill' },
  description:
    'Everything to run a WiFi hotspot business: MikroTik auto-provisioning, MTN MoMo & Airtel Money payments, instant package activation, voucher batches, RADIUS, analytics and automatic payouts.',
  alternates: { canonical: '/features' },
}

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children
}
