import Link from "next/link";

// Shared layout for the legal documents (/terms, /privacy).
export function LegalLayout({ title, lastUpdated, version, children }) {
  return (
    <div className="w-full min-h-screen mt-24 sm:mt-32 px-4 sm:px-8 md:px-16 lg:px-24 pb-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-8">
          Version {version} · Last updated: {lastUpdated}
        </p>
        {children}
      </div>
    </div>
  );
}

export function Section({ number, title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg sm:text-xl font-bold mb-3">
        {number ? `${number}. ` : ""}
        {title}
      </h2>
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm sm:text-base">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }) {
  return (
    <ul className="list-disc pl-6 space-y-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

// Conspicuous notice block — Indian courts scrutinize buried disclaimers in
// standard-form contracts, so load-bearing disclaimers must stand out visually.
export function Conspicuous({ children }) {
  return (
    <div className="border-2 border-gray-900 rounded-lg p-4 font-semibold uppercase text-xs sm:text-sm tracking-wide">
      {children}
    </div>
  );
}

// Point-of-use disclosure for AI upload/prompt surfaces. DPDP-consent hook:
// these endpoints are reachable without an account, so signup-time acceptance
// alone doesn't cover them.
export function AiProcessingNotice() {
  return (
    <p className="text-xs text-gray-500 leading-relaxed">
      Images and prompts you submit are processed by Google&apos;s Gemini API
      to provide this feature. Only upload photos you have the right to use,
      and avoid including people or sensitive information. Results are
      AI-generated visualizations — verify before relying on them. See our{" "}
      <Link href="/privacy" className="underline underline-offset-2">
        Privacy Policy
      </Link>{" "}
      and{" "}
      <Link href="/terms" className="underline underline-offset-2">
        Terms
      </Link>
      .
    </p>
  );
}

export function LegalLink({ href, children }) {
  return (
    <Link
      href={href}
      className="text-gray-900 underline underline-offset-2"
    >
      {children}
    </Link>
  );
}
