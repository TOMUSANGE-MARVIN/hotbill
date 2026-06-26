import LegalPage from '@/components/landing/LegalPage'

export const metadata = {
  title: 'Terms & Conditions | HotBill',
  description: 'The terms that govern your use of the HotBill platform.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <LegalPage
      badge="Legal"
      title="Terms & Conditions"
      intro="These terms govern your access to and use of the HotBill platform. By creating an account or using the service, you agree to them."
      lastUpdated="22 June 2026"
      sections={[
        {
          heading: 'Acceptance of terms',
          paragraphs: [
            'By registering for, accessing or using HotBill, you agree to be bound by these Terms & Conditions and our Privacy Policy. If you are using HotBill on behalf of a business, you confirm that you are authorised to bind that business to these terms.',
          ],
        },
        {
          heading: 'Your account',
          bullets: [
            'You are responsible for the accuracy of the information you provide and for keeping your login credentials secure.',
            'You are responsible for all activity that happens under your account, including activity by any team members or subscribers you manage.',
            'You must notify us promptly if you suspect any unauthorised use of your account.',
          ],
        },
        {
          heading: 'Acceptable use',
          paragraphs: ['You agree not to use HotBill to:'],
          bullets: [
            'Break any applicable law or regulation, or facilitate others in doing so.',
            'Interfere with, disrupt, or attempt to gain unauthorised access to the platform or other operators’ data.',
            'Resell or misrepresent the service in a way that deceives your subscribers.',
            'Upload malicious code or use the service to distribute spam or harmful content.',
          ],
        },
        {
          heading: 'Fees, billing and commission',
          paragraphs: [
            'HotBill charges a per-transaction commission on hotspot sales processed through the platform, as shown in your account. Payment provider fees may also apply. Funds collected from subscribers are credited to your operator wallet, less applicable commission and fees, and may be withdrawn subject to the minimum withdrawal amount and any verification we require.',
          ],
        },
        {
          heading: 'Payments',
          paragraphs: [
            'Payments are processed by our third-party payment partner. By transacting through HotBill you also agree to the terms of that provider. We are not responsible for delays, failures or charges that arise from the payment provider, mobile network operator or bank.',
          ],
        },
        {
          heading: 'Service availability',
          paragraphs: [
            'We work to keep HotBill available and reliable, but we provide the service on an "as is" and "as available" basis. We may perform maintenance, update features, or suspend the service where necessary, and we will give reasonable notice of planned downtime where we can.',
          ],
        },
        {
          heading: 'Intellectual property',
          paragraphs: [
            'HotBill and all related software, branding and content are owned by us or our licensors. These terms do not transfer any of our intellectual property to you. The business data you create in your account remains yours.',
          ],
        },
        {
          heading: 'Limitation of liability',
          paragraphs: [
            'To the maximum extent permitted by law, HotBill is not liable for any indirect, incidental or consequential losses, or for loss of profits, revenue, data or goodwill, arising from your use of the service. Our total liability for any claim is limited to the fees you paid to us in the three months before the claim arose.',
          ],
        },
        {
          heading: 'Termination',
          paragraphs: [
            'You may stop using HotBill and close your account at any time. We may suspend or terminate your access if you breach these terms or use the service in a way that harms other users, our platform or third parties. On termination, your right to use the service ends, but provisions that by their nature should survive will continue to apply.',
          ],
        },
        {
          heading: 'Governing law',
          paragraphs: [
            'These terms are governed by the laws of the Republic of Uganda, and any disputes will be subject to the jurisdiction of its courts.',
          ],
        },
        {
          heading: 'Contact us',
          paragraphs: [
            'Questions about these terms? Reach us at info@hotbill.app.',
          ],
        },
      ]}
    />
  )
}
