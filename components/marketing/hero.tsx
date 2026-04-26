import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="overflow-hidden px-6 pb-16 pt-10 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e8faf1] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#1aab52]">
            <WhatsAppIcon className="h-3 w-3" />
            WhatsApp-native workflow
          </div>

          <h1 className="mb-4 text-[36px] font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl sm:leading-[1.08] sm:mb-5 lg:text-[64px]">
            Stop chasing workers
            <br />
            through <span className="text-[#25D366]">scattered chats</span>
          </h1>

          <p className="mb-7 max-w-lg text-base leading-relaxed text-muted-foreground sm:mb-9 sm:text-lg">
            Broadcast jobs, collect YES/NO replies, and auto-assign your casual
            workers — all through the WhatsApp they already use.
          </p>

          <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 gap-2 bg-[#25D366] hover:bg-[#1aab52] text-white border-transparent text-base sm:h-9 sm:text-sm",
              )}
            >
              Get early access <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#contact"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 text-base sm:h-9 sm:text-sm",
              )}
            >
              See how it works
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Onboarding pilot teams now ·{" "}
            <span className="font-medium text-[#1aab52]">
              No credit card required
            </span>
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative h-[440px] w-[230px] rounded-[32px] bg-zinc-900 p-2.5 shadow-2xl ring-1 ring-white/10 sm:h-[480px] sm:w-[252px] lg:h-[540px] lg:w-[272px] lg:rounded-[36px] lg:p-3">
            <div className="mx-auto mb-2 h-6 w-24 rounded-full bg-black" />
            <div className="flex h-[calc(100%-40px)] flex-col overflow-hidden rounded-[26px] bg-[#e5ddd5]">
              <div className="flex items-center gap-2.5 bg-[#075e54] px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-lg">
                  👷
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Job Broadcast
                  </p>
                  <p className="text-[10px] text-white/70">
                    Manage Staff · Business
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-hidden p-2.5">
                <div className="self-start rounded-b-xl rounded-tr-xl bg-white p-2.5 text-[11.5px] leading-relaxed text-zinc-900 shadow-sm">
                  <span className="mb-1 inline-block rounded-full bg-[#25D366] px-2 py-0.5 text-[9px] font-bold text-white">
                    New Job
                  </span>
                  <p className="font-semibold">General Helper needed</p>
                  <p className="mt-1 text-zinc-600 text-[10.5px]">
                    Brampton, Ontario
                    <br />
                    Sat 26 Apr, 9 AM–6 PM
                    <br />
                    $180/day
                  </p>
                  <p className="mt-2">
                    Reply <strong className="text-[#25D366]">YES</strong> to
                    confirm or <strong className="text-red-500">NO</strong> to
                    skip.
                  </p>
                  <p className="mt-1 text-right text-[9px] text-zinc-400">
                    10:14 AM
                  </p>
                </div>
                <div className="self-end rounded-b-xl rounded-tl-xl bg-[#dcf8c6] p-2.5 text-[11.5px] text-zinc-900 shadow-sm">
                  <span className="font-bold text-[#25D366]">YES</span>
                  <p className="text-right text-[9px] text-zinc-400">
                    10:16 AM
                  </p>
                </div>
                <div className="self-start rounded-b-xl rounded-tr-xl bg-white p-2.5 text-[11px] leading-relaxed text-zinc-900 shadow-sm">
                  <strong>Confirmed!</strong> You&apos;re assigned to{" "}
                  <strong>Brampton job on Sat 26 Apr</strong>. Details coming
                  soon.
                  <p className="mt-1 text-right text-[9px] text-zinc-400">
                    10:16 AM
                  </p>
                </div>
                <div className="self-end rounded-b-xl rounded-tl-xl bg-[#dcf8c6] p-2.5 text-[11px] text-zinc-900 shadow-sm">
                  Great, thanks!
                  <p className="text-right text-[9px] text-zinc-400">
                    10:17 AM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.128.558 4.122 1.529 5.852L.057 23.98l6.305-1.655C8.08 23.429 10 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}
