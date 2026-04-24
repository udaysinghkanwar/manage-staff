import Link from 'next/link'
import { Navbar } from '@/components/marketing/navbar'
import { Footer } from '@/components/marketing/footer'

export const metadata = {
  title: 'Terms of Service · Manage Staff',
  description: 'The terms under which you use Manage Staff.',
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed text-foreground">
          <section>
            <h2 className="mb-2 text-xl font-bold">1. Agreement</h2>
            <p className="text-muted-foreground">
              By creating an account or using Manage Staff (&quot;the Service&quot;), you
              agree to these terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">2. The service</h2>
            <p className="text-muted-foreground">
              Manage Staff is a workforce coordination tool that uses the official
              WhatsApp Business Platform to broadcast job offers, collect worker
              responses, and manage assignments. The Service is provided as-is, and we
              do not guarantee uninterrupted availability.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">3. Your account</h2>
            <p className="text-muted-foreground">
              You are responsible for the security of your account and for all activity
              that occurs under it. Notify us immediately of any unauthorised use. You
              must provide accurate business and contact information.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">4. Acceptable use</h2>
            <p className="text-muted-foreground mb-2">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>Send spam or unsolicited marketing messages</li>
              <li>Send messages to workers who have not opted in to receive them</li>
              <li>Violate any applicable law or third-party rights</li>
              <li>Violate WhatsApp&apos;s Business Messaging Policy or Commerce Policy</li>
              <li>Impersonate another person or business</li>
              <li>Attempt to disrupt, reverse-engineer, or interfere with the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">5. Worker consent</h2>
            <p className="text-muted-foreground">
              You are solely responsible for obtaining and maintaining consent from
              workers to receive messages from your business through WhatsApp. You must
              honour opt-out requests promptly.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">6. Fees and billing</h2>
            <p className="text-muted-foreground">
              Paid plans are billed monthly. Fees are non-refundable except where
              required by law. We may change pricing with reasonable notice. You can
              cancel at any time from your dashboard; cancellation takes effect at the
              end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">7. Data and privacy</h2>
            <p className="text-muted-foreground">
              Our handling of your data is described in our{' '}
              <Link href="/privacy" className="font-medium text-[#1aab52] hover:underline">
                Privacy Policy
              </Link>
              . You retain ownership of all worker data you upload; we process it on
              your behalf to operate the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">8. Termination</h2>
            <p className="text-muted-foreground">
              We may suspend or terminate your account if you breach these terms, abuse
              the Service, or violate WhatsApp&apos;s policies. You may close your
              account at any time.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">9. Limitation of liability</h2>
            <p className="text-muted-foreground">
              To the fullest extent permitted by law, Manage Staff is not liable for any
              indirect, incidental, or consequential damages arising from your use of
              the Service. Our total liability is limited to the fees you paid us in
              the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">10. Changes</h2>
            <p className="text-muted-foreground">
              We may update these terms from time to time. Material changes will be
              announced on this page; continued use after changes means you accept the
              updated terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">11. Contact</h2>
            <p className="text-muted-foreground">
              Questions about these terms? Email{' '}
              <a
                href="mailto:hello@managestaff.app"
                className="font-medium text-[#1aab52] hover:underline"
              >
                hello@managestaff.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
