import LegalPage from '@/components/landing/LegalPage'

export const metadata = {
  title: 'Privacy Policy | HotBill',
  description: 'How HotBill collects, uses, and protects your data.',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      badge="Legal"
      title="Privacy Policy"
      intro="This policy explains what information HotBill collects when you use our platform, how we use it, and the choices you have. We keep it plain so you always know where you stand."
      lastUpdated="22 June 2026"
      sections={[
        {
          heading: 'Who we are',
          paragraphs: [
            'HotBill is a hotspot billing and management platform for internet service providers. When we say "HotBill", "we", "us" or "our", we mean the HotBill platform and the team that operates it. When we say "you", we mean the operator using our dashboard, and where relevant the subscribers who connect through an operator’s hotspot.',
          ],
        },
        {
          heading: 'Information we collect',
          paragraphs: ['We collect only what we need to run the service:'],
          bullets: [
            'Account details: your name, email address, phone number, business name and login credentials.',
            'Business data: the routers, packages, vouchers, subscribers and transactions you create inside your account.',
            'Payment information: mobile money and card payments are processed by our payment partner (PesaPal). We receive confirmation and reference details, but we do not store full card numbers or mobile money PINs.',
            'Subscriber data: phone numbers, MAC and IP addresses, and session usage collected through the captive portal so that billing and access control work.',
            'Technical data: device, browser, IP address and log information generated when you use the dashboard.',
          ],
        },
        {
          heading: 'How we use your information',
          bullets: [
            'To provide, operate and maintain the HotBill platform and your account.',
            'To process payments and reconcile operator wallets and withdrawals.',
            'To authenticate hotspot sessions and enforce package limits and expiry.',
            'To provide support, send service notices, and respond to your requests.',
            'To monitor performance, prevent fraud and abuse, and improve the product.',
          ],
        },
        {
          heading: 'How we share information',
          paragraphs: [
            'We do not sell your data. We share information only with the payment providers needed to complete transactions, with infrastructure providers that host the platform, and where we are required to by law or to protect our rights and users. Each operator’s business data is isolated and is not shared with other operators.',
          ],
        },
        {
          heading: 'Data retention',
          paragraphs: [
            'We keep your account and business data for as long as your account is active and for as long afterwards as needed to meet legal, accounting and reporting obligations. You may request deletion of your account, after which we remove or anonymise data we are not required to keep.',
          ],
        },
        {
          heading: 'Security',
          paragraphs: [
            'We protect your data with encryption in transit, access controls, and isolated per-business data scoping. No system is perfectly secure, but we work continuously to safeguard your information and will notify you of any breach that affects you as required by law.',
          ],
        },
        {
          heading: 'Your rights',
          bullets: [
            'Access the personal data we hold about you.',
            'Ask us to correct inaccurate or incomplete information.',
            'Request deletion of your account and associated data.',
            'Object to or restrict certain processing of your data.',
          ],
        },
        {
          heading: 'Changes to this policy',
          paragraphs: [
            'We may update this policy from time to time. When we make material changes, we will update the date above and, where appropriate, notify you through the dashboard or by email.',
          ],
        },
        {
          heading: 'Contact us',
          paragraphs: [
            'If you have questions about this policy or how we handle your data, contact us at info@hotbill.app.',
          ],
        },
      ]}
    />
  )
}
