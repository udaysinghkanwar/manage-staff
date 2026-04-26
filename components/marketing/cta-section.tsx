"use client";

import { useState, useTransition } from "react";
import { Check, ArrowRight } from "lucide-react";
import { joinWaitlist } from "@/app/actions/waitlist";

export function CTASection() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || pending) return;
    setError(null);

    const value = email.trim();
    startTransition(async () => {
      const result = await joinWaitlist(value);
      if (result.ok) {
        setSubmittedEmail(value);
        setSent(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section id="contact" className="bg-foreground py-14 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="mb-3 text-[26px] font-extrabold tracking-tight text-background sm:text-4xl lg:text-5xl">
          Ready to stop chasing workers
          <br />
          on WhatsApp?
        </h2>
        <p className="mx-auto mb-7 max-w-md text-sm text-background/60 sm:mb-9 sm:text-base lg:text-lg">
          Replace group-chat chaos with one clean dashboard. We&apos;re
          onboarding pilot teams now.
        </p>

        {sent ? (
          <div
            role="status"
            aria-live="polite"
            className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-3.5 text-left sm:px-5 sm:py-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
              <Check className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-background sm:text-base">
                You&apos;re on the waitlist
              </p>
              <p className="text-xs text-background/60 sm:text-sm">
                We&apos;ll reach out soon at{" "}
                <span className="break-all font-medium text-background/80">
                  {submittedEmail}
                </span>
                .
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-md flex-col gap-2.5 sm:flex-row"
            noValidate
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              aria-label="Work email"
              aria-invalid={error ? true : undefined}
              disabled={pending}
              className="h-12 w-full flex-1 rounded-xl border border-background/20 bg-background/10 px-4 text-base text-background outline-none transition placeholder:text-background/40 hover:border-background/35 focus:border-[#25D366] focus:bg-background/15 focus:ring-2 focus:ring-[#25D366]/30 disabled:opacity-60 sm:text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#25D366] px-5 text-base font-semibold text-white transition-colors hover:bg-[#1aab52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
            >
              {pending ? (
                "Submitting…"
              ) : (
                <>
                  Contact us <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {!sent && error && (
          <p
            role="alert"
            className="mx-auto mt-3 max-w-md text-sm text-red-400"
          >
            {error}
          </p>
        )}

        {!sent && !error && (
          <p className="mt-4 text-sm text-background/35">
            No credit card · Pilot pricing available · Cancel any time
          </p>
        )}
      </div>
    </section>
  );
}
