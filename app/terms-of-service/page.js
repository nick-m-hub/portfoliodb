const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: "Terms of Service | PortfolioDB",
  description:
    "The terms and conditions governing your use of PortfolioDB.com, including membership subscriptions, data use, and disclaimers.",
  alternates: {
    canonical: `${siteUrl}/terms-of-service`,
  },
  openGraph: {
    title: "Terms of Service | PortfolioDB",
    description: "Terms and conditions for using PortfolioDB.com.",
    url: `${siteUrl}/terms-of-service`,
    siteName: "PortfolioDB",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service | PortfolioDB",
    description: "Terms and conditions for using PortfolioDB.com.",
  },
};

export default function TermsOfServicePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12 text-on-surface font-inter">

      {/* Page header */}
      <h1 className="font-manrope text-3xl font-bold text-on-surface mb-2">Terms of Service</h1>
      <p className="font-inter text-sm text-on-surface-variant mb-10">
        Effective date: May 1, 2026 &nbsp;·&nbsp; Last updated: June 2026
      </p>

      {/* Plain-English summary box */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl px-6 py-5 mb-10">
        <p className="font-inter text-sm font-semibold text-primary mb-1">Plain-English Summary</p>
        <p className="font-inter text-sm text-on-surface-variant leading-relaxed">
          PortfolioDB is a free educational resource about investment portfolios.
          Nothing here is financial advice. Most features are free with no account
          needed, and creating a free account unlocks the Builder (saved mixes,
          Performance Snapshot). The paid Signals membership is billed through
          Memberful and can be cancelled at any time. We won&rsquo;t sell your
          data. Use the site responsibly and don&rsquo;t misuse it. These terms
          are governed by US law. The full legal details are below.
        </p>
      </div>

      {/* 1. Acceptance */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">1. Acceptance of Terms</h2>
        <p className="text-base leading-relaxed">
          By accessing or using PortfolioDB.com (the &ldquo;Site&rdquo;), you
          agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If
          you do not agree to these Terms, please do not use the Site. These
          Terms apply to all visitors and users of the Site, including paid
          subscribers.
        </p>
        <p className="text-base leading-relaxed mt-3">
          We may update these Terms from time to time. When we do, we will
          update the &ldquo;Last updated&rdquo; date at the top of this page.
          Continued use of the Site after any changes constitutes your
          acceptance of the updated Terms.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 2. Who We Are */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">2. About PortfolioDB</h2>
        <p className="text-base leading-relaxed">
          PortfolioDB.com is an independently operated website based in the
          United States. The Site provides educational information about
          investment portfolios, including historical performance data, portfolio
          comparisons, and related analysis. PortfolioDB is not a registered
          investment advisor, broker-dealer, or financial institution.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 3. Not Financial Advice */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">3. Not Financial Advice</h2>
        <p className="text-base leading-relaxed mb-3">
          <strong>
            Nothing on this Site constitutes financial, investment, legal, or
            tax advice.
          </strong>{" "}
          All content — including portfolio data, performance metrics,
          comparisons, and any written analysis — is provided for informational
          and educational purposes only.
        </p>
        <p className="text-base leading-relaxed mb-3">
          Past performance of any portfolio shown on this Site is not indicative
          of future results. All investing involves risk, including the possible
          loss of principal. The portfolios displayed may not be suitable for
          your individual financial situation, goals, or risk tolerance.
        </p>
        <p className="text-base leading-relaxed">
          You should consult a qualified financial advisor before making any
          investment decisions. Reliance on any information provided on this
          Site is solely at your own risk.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 4. Free Access */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">4. Free Site Access</h2>
        <p className="text-base leading-relaxed">
          The core content of PortfolioDB.com — including the portfolio database,
          screener, all performance data, and tools like the Leaderboard, Drawdown
          Analyzer, Compare, Monte Carlo Simulator, and Portfolio Builder — is
          available to all visitors at no charge. No account is required to browse
          or use these features. A free account is required to save portfolio mixes
          and unlock the full Builder analysis (Performance Snapshot, charts, withdrawal
          rates, and PDF export). A paid Signals membership is required only for monthly
          trade signals.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 5. Builder Account and Paid Signals Membership */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">5. Builder Account and Paid Signals Membership</h2>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-5 mb-2">What you get</h3>
        <ul className="list-disc list-outside pl-6 space-y-1 text-base leading-relaxed mb-3">
          <li><strong>Builder (free with an account)</strong> — create a free account to save up to 3 custom portfolio mixes and unlock the full Performance Snapshot, charts, withdrawal rate analysis, and PDF export in the Portfolio Builder.</li>
          <li><strong>Signals (paid)</strong> — all Builder features, unlimited saved mixes, and monthly trade signals showing current holdings for all covered tactical portfolios.</li>
        </ul>
        <p className="text-base leading-relaxed">
          The specific features and content included in each tier may change over time. We will notify active Signals subscribers of any material changes by email.
        </p>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-5 mb-2">Billing and payment</h3>
        <p className="text-base leading-relaxed">
          The Builder tier requires only a free account — no payment is involved. The
          paid Signals membership is processed through Memberful, a third-party
          subscription platform. By subscribing, you also agree to
          Memberful&rsquo;s terms of service and privacy policy. PortfolioDB
          does not directly handle or store your payment information.
        </p>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-5 mb-2">Cancellation</h3>
        <p className="text-base leading-relaxed">
          You may cancel your Signals membership at any time through your Memberful
          account at{" "}
          <a href="https://portfoliodb.memberful.com/account" target="_blank" rel="noopener noreferrer" className="text-[#27624a] hover:underline">
            portfoliodb.memberful.com/account
          </a>
          . Cancellation takes effect at the end of your current billing
          period — you retain access until that date. We do not offer prorated
          refunds for partial periods, but we will honor reasonable refund
          requests made within 7 days of a charge if you contact us.
        </p>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-5 mb-2">Changes to membership pricing or benefits</h3>
        <p className="text-base leading-relaxed">
          We reserve the right to change the features included in the free Builder
          tier, and the pricing or benefits of the paid Signals membership. If we
          change Signals pricing, we will notify existing subscribers by email with
          reasonable advance notice before the change takes effect.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 6. Data and Privacy */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">6. Your Data and Privacy</h2>
        <p className="text-base leading-relaxed mb-3">
          We collect minimal user data. For all visitors, we use Google Analytics
          (GA4) to collect anonymized usage data such as page views and traffic
          sources. This data does not personally identify you.
        </p>
        <p className="text-base leading-relaxed mb-3">
          If you sign up with your email address (via the email capture form), your
          address is added to our mailing list managed through MailerLite. You will
          receive the free PDF report and occasional portfolio insights. You can
          unsubscribe at any time using the link in any email.
        </p>
        <p className="text-base leading-relaxed mb-3">
          If you create an account or become a paid member, we collect your email
          address and store your account data (including saved portfolio mixes and
          subscription status) in our database. Billing is processed through
          Memberful — we do not store your payment information. We do not sell,
          rent, or share your personal data with third parties for marketing
          purposes.
        </p>
        <p className="text-base leading-relaxed">
          Our full privacy practices are described in the{" "}
          <a href="/privacy-policy" className="text-[#27624a] hover:underline">Privacy Policy</a>.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 7. Intellectual Property */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">7. Intellectual Property</h2>
        <p className="text-base leading-relaxed mb-3">
          All original content on this Site — including written analysis, site
          design, and compiled portfolio data — is the property of PortfolioDB
          and is protected by applicable copyright law.
        </p>
        <p className="text-base leading-relaxed mb-3">
          You are welcome to share links to pages on this Site, quote brief
          excerpts with attribution, or reference data for personal,
          non-commercial purposes. You may not reproduce, republish, or
          systematically extract substantial portions of this Site&rsquo;s
          content without prior written permission.
        </p>
        <p className="text-base leading-relaxed">
          Underlying market data (ETF prices, index returns, etc.) is the
          property of its respective data providers and is subject to their
          terms.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 8. Acceptable Use */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">8. Acceptable Use</h2>
        <p className="text-base leading-relaxed mb-3">
          You agree not to use this Site in any way that:
        </p>
        <ul className="list-disc list-outside pl-6 space-y-2 text-base leading-relaxed">
          <li>Violates any applicable law or regulation</li>
          <li>
            Systematically scrapes, crawls, or harvests data from the Site
            without our prior written permission
          </li>
          <li>
            Attempts to interfere with or disrupt the Site&rsquo;s
            infrastructure, servers, or security
          </li>
          <li>
            Misrepresents the source of any content or impersonates PortfolioDB
          </li>
          <li>
            Redistributes our paid membership content to non-subscribers
          </li>
        </ul>
        <p className="text-base leading-relaxed mt-4">
          We reserve the right to terminate access for anyone who violates these
          terms.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 9. Disclaimer of Warranties */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">9. Disclaimer of Warranties</h2>
        <p className="text-base leading-relaxed">
          This Site and all content on it are provided &ldquo;as is&rdquo; and
          &ldquo;as available&rdquo; without warranties of any kind, either
          express or implied. We make no warranty that the Site will be
          uninterrupted, error-free, or free of viruses or other harmful
          components. We make no warranty as to the accuracy, completeness, or
          timeliness of any data or information on the Site. We reserve the
          right to correct errors, update data, or discontinue any feature at
          any time without notice.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 10. Limitation of Liability */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">10. Limitation of Liability</h2>
        <p className="text-base leading-relaxed">
          To the fullest extent permitted by law, PortfolioDB and its operator
          shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages arising from your use of — or
          inability to use — the Site or any content on it. This includes, but
          is not limited to, any investment losses you may experience as a result
          of relying on information found on this Site. In no event shall our
          total liability to you exceed the amount you paid for a membership
          subscription in the 12 months preceding the claim.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 11. Governing Law */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">11. Governing Law</h2>
        <p className="text-base leading-relaxed">
          These Terms are governed by the laws of the United States and the
          state in which PortfolioDB is operated, without regard to conflict of
          law principles. Any disputes arising from these Terms or your use of
          the Site shall be resolved in the applicable courts of that
          jurisdiction.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* 12. Contact */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-3">12. Contact</h2>
        <p className="text-base leading-relaxed">
          If you have questions about these Terms, would like to request
          permission to use our content, or need to reach us about a membership
          issue, please use the contact page on this Site.
        </p>
      </section>

      {/* Note */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl px-6 py-5 mt-4">
        <p className="font-inter text-sm text-on-surface-variant leading-relaxed">
          <strong>A note:</strong> These terms were written to be clear and
          readable, not deliberately impenetrable. If something here is unclear
          or you believe a term is unfair, please reach out — we&rsquo;d rather
          fix it than argue about it.
        </p>
      </div>

    </main>
  );
}
