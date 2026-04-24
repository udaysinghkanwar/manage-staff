import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/marketing/navbar'
import { Hero } from '@/components/marketing/hero'
import { TrustBar } from '@/components/marketing/trust-bar'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { Features } from '@/components/marketing/features'
import { Pricing } from '@/components/marketing/pricing'
import { FAQ } from '@/components/marketing/faq'
import { CTASection } from '@/components/marketing/cta-section'
import { Footer } from '@/components/marketing/footer'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
