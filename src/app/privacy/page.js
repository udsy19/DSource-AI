import Link from "next/link";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: "Privacy policy — DSource.AI",
  description: "DSource.AI privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pt-36 md:pb-24">
        {/* Folio masthead */}
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">Privacy</p>
            <p className="viz-label hidden sm:block">DSource.AI · Legal</p>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <h1 className="viz-serif text-4xl leading-none sm:text-5xl">
              Privacy policy
            </h1>
            <p className="viz-serif mt-4 max-w-2xl text-lg italic text-[var(--viz-muted)] sm:text-xl">
              This page will host the full DSource.AI privacy policy.
            </p>
          </div>
        </Reveal>

        {/* Hand-off */}
        <Reveal className="mt-14 sm:mt-20">
          <div className="border-t border-[var(--viz-line)] pt-6">
            <p className="viz-serif max-w-2xl text-xl italic leading-relaxed text-[var(--viz-muted)]">
              For questions about how we handle your data, please use Contact on
              the Help Center.
            </p>
            <Link
              href="/help-center#contact"
              className="viz-mono mt-3 inline-block text-xs tracking-[0.08em] uppercase underline decoration-[var(--viz-line)] underline-offset-4 transition-colors hover:text-[var(--viz-blue)] hover:decoration-[var(--viz-blue)]"
            >
              Contact us →
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
