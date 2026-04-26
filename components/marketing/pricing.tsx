import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Starter",
    price: "20",
    period: "/month",
    desc: "For small teams just getting started with structured scheduling.",
    features: [
      "Up to 30 workers",
      "50 job broadcasts/month",
      "WhatsApp inbox",
      "Basic availability tracking",
      "Email support",
    ],
    cta: "Get started",
    href: "/login",
    popular: false,
  },
  {
    name: "Growth",
    price: "40",
    period: "/month",
    desc: "For growing operations managing multiple job types and locations.",
    features: [
      "Up to 100 workers",
      "Unlimited job broadcasts",
      "Worker groups & filtering",
      "Auto-assignment rules",
      "Message history & search",
      "Priority support",
    ],
    cta: "Get started",
    href: "/login",
    popular: true,
  },
  {
    name: "Scale",
    price: "80",
    period: "/month",
    desc: "For large staffing operations that need custom control and reporting.",
    features: [
      "Up to 500 workers",
      "Everything in Growth",
      "Custom WhatsApp number",
      "Analytics & reports",
      "API access",
      "Dedicated account manager",
    ],
    cta: "Contact us",
    href: "#contact",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-14 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center sm:mb-16">
          <span className="inline-block rounded-full bg-[#e8faf1] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#1aab52]">
            Pricing
          </span>
          <h2 className="mt-3 text-[26px] font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Simple, honest pricing
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base lg:text-lg">
            No per-message fees. No hidden charges. Cancel any time.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative p-6 sm:p-8",
                plan.popular &&
                  "order-first border-[#25D366] shadow-[0_0_0_1px_#25D366,0_20px_48px_rgba(37,211,102,0.12)] md:order-0",
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#25D366] px-4 py-1 text-xs font-bold text-white whitespace-nowrap">
                  Most popular
                </div>
              )}

              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {plan.name}
              </p>
              <p className="mb-1 text-4xl font-extrabold tracking-tight text-foreground">
                <sup className="text-xl font-bold">$</sup>
                {plan.price}
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                {plan.period}
              </p>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                {plan.desc}
              </p>

              <div className="mb-6 h-px bg-border" />

              <ul className="mb-7 flex flex-col gap-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm text-foreground"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={cn(
                  buttonVariants({ size: "default" }),
                  "w-full justify-center",
                  plan.popular
                    ? "bg-[#25D366] hover:bg-[#1aab52] text-white border-transparent"
                    : "bg-muted text-foreground hover:bg-muted/80 border-transparent",
                )}
              >
                {plan.cta}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
