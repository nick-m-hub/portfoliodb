const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: "Privacy Policy | PortfolioDB",
  description:
    "How PortfolioDB collects, uses, and protects your data. A plain-English explanation of our privacy practices.",
  alternates: {
    canonical: `${siteUrl}/privacy-policy`,
  },
  openGraph: {
    title: "Privacy Policy | PortfolioDB",
    description: "How PortfolioDB collects, uses, and protects your data.",
    url: `${siteUrl}/privacy-policy`,
    siteName: "PortfolioDB",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | PortfolioDB",
    description: "How PortfolioDB collects, uses, and protects your data.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12 text-on-surface font-inter">

      {/* Page header */}
      <h1 className="font-manrope text-3xl font-bold text-on-surface mb-2">Privacy Policy</h1>
      <p className="font-inter text-sm text-on-surface-variant mb-10">
        Effective date: May 1, 2026 &nbsp;·&nbsp; Last updated: June 2026
      </p>

      {/* Plain-English summary */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl px-6 py-5 mb-10">
        <p className="font-inter text-sm font-semibold text-primary mb-1">Plain-English Summary</p>
        <p className="font-inter text-sm text-on-surface-variant leading-relaxed">
          If you just browse the site, we only collect anonymized analytics
          through Google Analytics — nothing personally identifiable. If you
          submit your email address, we add it to our mailing list via MailerLite.
          If you create an account or become a paid member, we store your email,
          account data, and subscription status in our database. Billing is handled
          by Memberful. We don&rsquo;t sell your data. Ever. You can unsubscribe
          or cancel at any time.
        </p>
      </div>

      {/* 1. Who We Are */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">1. Who We Are</h2>
        <p className="text-base leading-relaxed">
          PortfolioDB.com is an independently operated website based in the
          United States. This Privacy Policy explains how we collect, use, and
          protect information when you visit the Site or become a paid member.
          If you have questions, please use the contact page.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 2. Information We Collect */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">2. Information We Collect</h2>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-5 mb-2">From all visitors — anonymized analytics</h3>
        <p className="text-base leading-relaxed mb-3">
          When you visit PortfolioDB.com, Google Analytics (GA4) automatically
          collects anonymized data about your visit. This includes:
        </p>
        <ul className="list-disc list-outside pl-6 space-y-1 text-base leading-relaxed mb-3">
          <li>Pages viewed and time spent on each page</li>
          <li>General geographic location (country or region — not your address)</li>
          <li>The device type, browser, and operating system you used</li>
          <li>How you arrived at the Site (e.g., a search engine, a direct link)</li>
        </ul>
        <p className="text-base leading-relaxed">
          This data is aggregated and does not identify you personally. It is
          used solely to understand how the Site is used and improve the
          experience for visitors. GA4 is governed by{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#27624a] hover:text-primary hover:underline transition-colors"
          >
            Google&rsquo;s Privacy Policy
          </a>
          .
        </p>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-6 mb-2">From email subscribers</h3>
        <p className="text-base leading-relaxed mb-4">
          If you submit your email address via the signup form on the Site, your
          address is stored in MailerLite, the email platform we use to send our
          newsletter and free PDF report. You can unsubscribe at any time using
          the link in any email.
        </p>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-2 mb-2">From account holders and paid members</h3>
        <p className="text-base leading-relaxed">
          If you create a free account or subscribe to a paid membership, we
          collect your email address and store your account data — including saved
          portfolio mixes and subscription status — in our database (Supabase).
          Membership subscriptions are processed through Memberful, a third-party
          platform. We receive your email address and subscription status from
          Memberful. Memberful&rsquo;s handling of your payment information is
          governed by{" "}
          <a
            href="https://memberful.com/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#27624a] hover:text-primary hover:underline transition-colors"
          >
            Memberful&rsquo;s Privacy Policy
          </a>
          .
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 3. How We Use Your Information */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">3. How We Use Your Information</h2>
        <p className="text-base leading-relaxed mb-3">
          We use the information we collect only for the following purposes:
        </p>
        <ul className="list-disc list-outside pl-6 space-y-2 text-base leading-relaxed">
          <li>
            <strong>Analytics data</strong> — to understand Site traffic,
            identify popular content, and improve the user experience
          </li>
          <li>
            <strong>Your email address (mailing list)</strong> — to deliver the
            free PDF report and occasional portfolio insights you signed up for
          </li>
          <li>
            <strong>Your account and subscription data</strong> — to authenticate
            your account, store your saved portfolio mixes, and verify your
            membership tier; occasional administrative messages related to your
            membership (e.g., billing changes or policy updates)
          </li>
        </ul>
        <p className="text-base leading-relaxed mt-4">
          We do not use your email address for any purpose other than delivering
          the membership you signed up for.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 4. What We Don't Do */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">4. What We Don&rsquo;t Do</h2>
        <ul className="list-disc list-outside pl-6 space-y-2 text-base leading-relaxed">
          <li>We do not sell your personal data to anyone, for any reason.</li>
          <li>
            We do not share your email address with third-party advertisers or
            marketing platforms.
          </li>
          <li>
            We do not build advertising profiles or track you across other
            websites.
          </li>
          <li>
            We do not require registration or an account to access the portfolio
            database, screener, or any of the analysis tools. An account is
            required only to save portfolio mixes or access paid features.
          </li>
        </ul>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 5. Cookies */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">5. Cookies</h2>
        <p className="text-base leading-relaxed mb-3">
          PortfolioDB.com uses cookies for two purposes: analytics (via Google
          Analytics) and authentication. Analytics cookies help us understand how
          visitors use the Site and do not store personally identifiable
          information. Authentication cookies are set by Supabase when you sign in
          to your account and are required to keep you logged in across page visits.
        </p>
        <p className="text-base leading-relaxed mb-3">
          We do not use advertising cookies, tracking pixels, or third-party
          marketing cookies of any kind.
        </p>
        <p className="text-base leading-relaxed">
          You can disable or block cookies in your browser settings at any time.
          Doing so will not prevent you from accessing any content on the Site,
          though it will limit our ability to collect analytics data.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 6. Third-Party Services */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">6. Third-Party Services</h2>
        <p className="text-base leading-relaxed mb-4">
          We use a small number of third-party services to operate this Site.
          Each has its own privacy policy governing the data they handle:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-outline-variant rounded-lg overflow-hidden">
            <thead className="bg-surface-container-low text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-on-surface">Service</th>
                <th className="px-4 py-3 font-semibold text-on-surface">Purpose</th>
                <th className="px-4 py-3 font-semibold text-on-surface">Their Privacy Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              <tr>
                <td className="px-4 py-3 font-medium">Google Analytics (GA4)</td>
                <td className="px-4 py-3">Anonymized site analytics</td>
                <td className="px-4 py-3">
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#27624a] hover:text-primary hover:underline transition-colors">policies.google.com/privacy</a>
                </td>
              </tr>
              <tr className="bg-surface-container-low">
                <td className="px-4 py-3 font-medium">Memberful</td>
                <td className="px-4 py-3">Membership subscriptions and payment processing</td>
                <td className="px-4 py-3">
                  <a href="https://memberful.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-[#27624a] hover:text-primary hover:underline transition-colors">memberful.com/privacy</a>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">MailerLite</td>
                <td className="px-4 py-3">Email list management and newsletter delivery</td>
                <td className="px-4 py-3">
                  <a href="https://www.mailerlite.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#27624a] hover:text-primary hover:underline transition-colors">mailerlite.com/legal/privacy-policy</a>
                </td>
              </tr>
              <tr className="bg-surface-container-low">
                <td className="px-4 py-3 font-medium">Supabase</td>
                <td className="px-4 py-3">Database — stores portfolio data, user accounts, saved mixes, and subscription status</td>
                <td className="px-4 py-3">
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#27624a] hover:text-primary hover:underline transition-colors">supabase.com/privacy</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 7. Data Retention */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">7. Data Retention</h2>
        <p className="text-base leading-relaxed">
          Analytics data is retained according to Google Analytics&rsquo; default
          settings (26 months). Email addresses on our mailing list are retained
          until you unsubscribe. Account and subscription data is retained for as
          long as your account is active. If you close your account and request
          deletion of your data, we will do so within a reasonable time. We do not
          retain any payment information — that is handled entirely by Memberful.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 8. Your Rights and Choices */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">8. Your Rights and Choices</h2>
        <p className="text-base leading-relaxed mb-3">
          You have the following options at any time:
        </p>
        <ul className="list-disc list-outside pl-6 space-y-2 text-base leading-relaxed">
          <li>
            <strong>Unsubscribe from emails</strong> — every membership email
            includes an unsubscribe link. Click it and you will no longer receive
            emails from us.
          </li>
          <li>
            <strong>Cancel your membership</strong> — through your Memberful
            account at{" "}
            <a href="https://portfoliodb.memberful.com/account" target="_blank" rel="noopener noreferrer" className="text-[#27624a] hover:underline">portfoliodb.memberful.com/account</a>
            {" "}at any time. Cancellation ends future billing; you retain access until the end of your billing period.
          </li>
          <li>
            <strong>Request deletion of your email address</strong> — contact us
            via the contact page and we will remove it from our records.
          </li>
          <li>
            <strong>Opt out of Google Analytics</strong> — use the{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#27624a] hover:text-primary hover:underline transition-colors"
            >
              Google Analytics Opt-out Browser Add-on
            </a>{" "}
            or disable cookies in your browser settings.
          </li>
        </ul>
        <p className="text-base leading-relaxed mt-4">
          If you are located in the European Union or another jurisdiction with
          specific data rights (such as the right to access, rectify, or port
          your data), please contact us and we will do our best to accommodate
          your request, though PortfolioDB is a small independent operation and
          is not formally subject to GDPR.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 9. Children */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">9. Children&rsquo;s Privacy</h2>
        <p className="text-base leading-relaxed">
          PortfolioDB is not directed at children under the age of 13, and we do
          not knowingly collect personal information from anyone under 13. If you
          believe a child has provided personal information through this Site,
          please contact us and we will delete it promptly.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 10. Changes */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">10. Changes to This Policy</h2>
        <p className="text-base leading-relaxed">
          We may update this Privacy Policy from time to time. When we do, we
          will update the &ldquo;Last updated&rdquo; date at the top of this
          page. If we make a material change — such as collecting a new type of
          data or sharing data in a new way — we will notify paid members by
          email before the change takes effect.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 11. Contact */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">11. Contact</h2>
        <p className="text-base leading-relaxed">
          If you have questions or concerns about this Privacy Policy, or would
          like to exercise any of your rights described above, please reach out
          via the contact page on this Site. We will respond as promptly as we
          can.
        </p>
      </section>

      {/* Closing note */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl px-6 py-5 mt-4">
        <p className="font-inter text-sm text-on-surface-variant leading-relaxed">
          <strong>Our commitment:</strong> PortfolioDB is a small, independent
          site. We collect only what we need to operate it, and we will never
          monetize your personal data. If you ever feel that&rsquo;s not the
          case, please tell us.
        </p>
      </div>

    </main>
  );
}
