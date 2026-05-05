import ContactForm from '@/components/ContactForm';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'Contact | PortfolioDB',
  description: 'Get in touch with the PortfolioDB team — questions, corrections, or membership support.',
  alternates: { canonical: `${siteUrl}/contact` },
  openGraph: {
    title: 'Contact | PortfolioDB',
    description: 'Get in touch with the PortfolioDB team.',
    url: `${siteUrl}/contact`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact | PortfolioDB',
    description: 'Get in touch with the PortfolioDB team.',
  },
};

export default function ContactPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12 font-inter">

      <h1 className="font-manrope text-3xl font-bold text-on-surface mb-2">Contact</h1>
      <p className="font-inter text-sm text-on-surface-variant mb-10">
        Questions, data corrections, or membership support — we&rsquo;re happy to help.
      </p>

      <ContactForm />

    </main>
  );
}
