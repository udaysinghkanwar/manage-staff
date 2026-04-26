import Link from 'next/link'
import { Navbar } from '@/components/marketing/navbar'
import { Footer } from '@/components/marketing/footer'

export const metadata = {
  title: 'Privacy Policy · Manage Staff',
  description: 'How Manage Staff collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed text-foreground">
          <section>
            <h2 className="mb-2 text-xl font-bold">1. Overview</h2>
            <p className="text-muted-foreground">
              Manage Staff (&quot;we&quot;, &quot;us&quot;) provides a WhatsApp-based workforce
              coordination tool for small businesses. This policy explains what data we
              collect, why we collect it, and how we use and protect it.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">2. Information we collect</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Account information</strong> —
                business name, contact email, and login credentials.
              </li>
              <li>
                <strong className="text-foreground">Worker data</strong> — names, phone
                numbers, availability, and assignment history that you enter or that
                workers provide via WhatsApp.
              </li>
              <li>
                <strong className="text-foreground">Messaging data</strong> — WhatsApp
                messages exchanged through the platform, including broadcasts, replies,
                and delivery status.
              </li>
              <li>
                <strong className="text-foreground">Usage data</strong> — basic analytics
                about how you use the dashboard (pages visited, actions taken) to
                improve the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">3. How we use your data</h2>
            <p className="text-muted-foreground">
              We use the data you provide to operate the service: to send WhatsApp
              messages on your behalf, match workers to jobs, show your dashboard, and
              provide customer support. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">4. WhatsApp and Meta</h2>
            <p className="text-muted-foreground">
              Manage Staff uses the official WhatsApp Business Platform provided by
              Meta. Messages sent and received through the platform are processed by
              Meta under their own terms and privacy policy. See{' '}
              <a
                href="https://www.whatsapp.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                WhatsApp&apos;s Privacy Policy
              </a>{' '}
              for details.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">5. Data storage and security</h2>
            <p className="text-muted-foreground">
              Data is stored in secure, encrypted databases hosted with our
              infrastructure providers. We use industry-standard access controls and
              encryption in transit (TLS) and at rest.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">6. Data retention</h2>
            <p className="text-muted-foreground">
              We retain your account data for as long as your account is active. Worker
              records and message history are retained until you delete them or close
              your account. You may request export or deletion at any time by emailing us.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">7. Your rights</h2>
            <p className="text-muted-foreground">
              You may access, correct, export, or delete your data at any time through
              the dashboard or by contacting us. If you believe your data has been
              mishandled, you may also contact your local data protection authority.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">8. Contact</h2>
            <p className="text-muted-foreground">
              For any privacy questions or requests, email{' '}
              <a
                href="mailto:hello@managestaff.ca"
                className="font-medium text-[#1aab52] hover:underline"
              >
                hello@managestaff.ca
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">9. Changes to this policy</h2>
            <p className="text-muted-foreground">
              We may update this policy from time to time. Material changes will be
              announced on this page; continued use of the service after changes means
              you accept the updated policy.
            </p>
          </section>

          <p className="pt-4 text-sm text-muted-foreground">
            See also our{' '}
            <Link href="/terms" className="font-medium text-[#1aab52] hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
