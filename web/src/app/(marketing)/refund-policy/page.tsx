import LegalPage from '@/components/landing/LegalPage'

export const metadata = {
  title: 'Return & Refund Policy | HotBill',
  description: 'How returns and refunds work on the HotBill platform.',
}

export default function RefundPolicyPage() {
  return (
    <LegalPage
      badge="Legal"
      title="Return & Refund Policy"
      intro="HotBill sells digital services, internet access and data bundles. This policy explains when refunds apply, both for operators using the platform and for subscribers buying access through a hotspot."
      lastUpdated="22 June 2026"
      sections={[
        {
          heading: 'Nature of our products',
          paragraphs: [
            'HotBill provides software, internet access packages, vouchers and data bundles. These are digital goods and services that are delivered and consumed electronically. Because access is granted immediately on payment, they are generally non-returnable and non-refundable once activated.',
          ],
        },
        {
          heading: 'Subscriber purchases',
          paragraphs: [
            'When a subscriber buys a package or voucher through an operator’s captive portal, access is provisioned right away. As a rule, completed purchases of data, time-based access or vouchers are not refundable once the session has started or the voucher has been used.',
          ],
        },
        {
          heading: 'When a refund may apply',
          paragraphs: ['We will consider a refund where:'],
          bullets: [
            'You were charged but access was never delivered due to a verified platform fault.',
            'A payment was duplicated and the duplicate did not deliver additional access.',
            'A package was paid for but could not be activated because of a technical failure on our side.',
          ],
        },
        {
          heading: 'When refunds do not apply',
          bullets: [
            'Change of mind after access has been delivered.',
            'Unused time or data on a package that was activated, unless the law requires otherwise.',
            'Network issues caused by the operator’s equipment, the mobile network or local conditions outside our control.',
            'Vouchers that have already been redeemed.',
          ],
        },
        {
          heading: 'Operator wallet and withdrawals',
          paragraphs: [
            'Funds in an operator wallet represent net revenue from subscriber sales after commission and fees. Withdrawals are subject to the minimum withdrawal amount and any verification we require. Commission and payment provider fees already deducted on completed transactions are non-refundable.',
          ],
        },
        {
          heading: 'How to request a refund',
          paragraphs: [
            'To request a refund, contact us at info@hotbill.app with the transaction reference, the date and amount, and a short description of the issue. We aim to review eligible requests within a reasonable time and, where approved, refunds are returned through the original payment method.',
          ],
        },
        {
          heading: 'Contact us',
          paragraphs: [
            'For any questions about returns or refunds, email us at info@hotbill.app.',
          ],
        },
      ]}
    />
  )
}
