import Link from "next/link";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: "Privacy policy — DSource.AI",
  description:
    "How DSource.AI collects, uses, shares, and protects your personal data, including room photos processed by AI.",
};

/* Local document primitives. Fork reason: the shared legal-page components
   live only on the anti-mock branch; this conversion owns only this file. */

/** One mono cell of the document's plate label. */
const MetaCell = ({ label, children }) => (
  <div className="min-w-28 flex-1 bg-[var(--viz-paper)] px-3 py-2">
    <div className="viz-label">{label}</div>
    <div className="viz-mono mt-0.5 text-xs uppercase">{children}</div>
  </div>
);

/** Ruled legal section: indigo mono number, serif heading, measured body. */
const Section = ({ number, title, children }) => (
  <section className="mt-10 border-t border-[var(--viz-line)] pt-4 sm:mt-12">
    <div className="flex items-baseline gap-4">
      {number && (
        <span className="viz-mono text-xs font-bold text-[var(--viz-blue)]">
          {String(number).padStart(2, "0")}
        </span>
      )}
      <h2 className="viz-serif text-xl sm:text-2xl">{title}</h2>
    </div>
    <div className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--viz-ink)]/85 sm:text-base">
      {children}
    </div>
  </section>
);

/** Legal list set as a typeset run with en-dash markers, not bullets. */
const LegalList = ({ items }) => (
  <ul className="space-y-2.5">
    {items.map((item) => (
      <li key={item} className="flex gap-3">
        <span aria-hidden="true" className="viz-mono text-[var(--viz-muted)]">
          –
        </span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

/** Conspicuous legal text: the amber notice box, mono NOTICE eyebrow. */
const Conspicuous = ({ children }) => (
  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
    <p className="viz-mono text-[11px] uppercase tracking-widest text-amber-700">
      Notice
    </p>
    <p className="mt-1 leading-relaxed text-amber-900">{children}</p>
  </div>
);

const linkClasses =
  "underline decoration-[var(--viz-line)] underline-offset-4 transition-colors hover:text-[var(--viz-blue)] hover:decoration-[var(--viz-blue)]";

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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <h1 className="viz-serif text-4xl leading-none sm:text-5xl">
                Privacy policy
              </h1>
              <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
                How we collect, use, share, and protect your data — including
                the room photos you bring.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Document plate label */}
        <div className="mt-8 flex flex-wrap gap-px overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-line)]">
          <MetaCell label="Document">Privacy policy</MetaCell>
          <MetaCell label="Version">1.0</MetaCell>
          <MetaCell label="Last updated">July 15, 2026</MetaCell>
        </div>

        {/* The policy, word for word, at reading measure */}
        <article className="max-w-3xl">
          <Section title="Who we are">
            <p>
              This Privacy Policy describes how DSource.AI (&quot;we&quot;,
              &quot;us&quot;) collects, uses, shares, and protects personal data
              when you use dsource.ai and its related services (the
              &quot;Platform&quot;). We are the &quot;Data Fiduciary&quot; under
              India&apos;s Digital Personal Data Protection Act, 2023
              (&quot;DPDP Act&quot;) and the &quot;data controller&quot; under
              the EU/UK General Data Protection Regulation (&quot;GDPR&quot;),
              where applicable, for the data described here.
            </p>
            <p>
              This Policy applies to <strong>all visitors</strong>, whether or
              not you create an account. Some features — including the AI
              analysis and image-generation tools and the contact form — can
              process your data even if you are not signed in.
            </p>
            <p>
              For privacy questions, requests, or grievances, contact our
              Grievance Officer (Section 13) at{" "}
              <a className={linkClasses} href="mailto:hello@dsource.ai">
                hello@dsource.ai
              </a>
              .
            </p>
          </Section>

          <Section number="1" title="Personal data we collect">
            <p>
              We collect only the data listed below. We do not collect your name
              at account signup, your phone number, precise location, or payment
              information (we currently process no payments).
            </p>
            <p>
              <strong>a. Account data (you provide it).</strong>
            </p>
            <LegalList
              items={[
                "Email address and password. Passwords are hashed and managed by our authentication provider (Supabase); we never store or see your plaintext password.",
                "An account-type flag (user or vendor) stored with your account.",
              ]}
            />
            <p>
              <strong>b. Contact form data (you provide it).</strong> First
              name, last name, email address, country, and your message, when
              you submit the Help Center contact form.
            </p>
            <p>
              <strong>
                c. Images and prompts you submit to AI features (you provide
                them).
              </strong>
            </p>
            <LegalList
              items={[
                "Photos you upload to the AI Material Finder or AI Visualizer — typically photos of room interiors. These may incidentally reveal personal information: the inside of a home, belongings, documents, or people in frame.",
                "Image files may contain embedded metadata (EXIF), which can include the time the photo was taken, the device used, and GPS location. We do not currently strip this metadata before processing, so it may be transmitted to our AI provider along with the image. We recommend removing location metadata from photos before uploading.",
                "The text prompts and design parameters (space type, room, style, lighting, color palette) you enter for AI generation.",
                "AI outputs associated with your session, and — where render-history features are enabled — uploads and generated designs stored in private storage linked to your account.",
              ]}
            />
            <p>
              <strong>d. Vendor catalog data (vendors provide it).</strong>{" "}
              Product listings, descriptions, image URLs, and CSV uploads
              submitted through the vendor portal. Each record is linked to the
              vendor&apos;s account identifier. Vendors should not include
              personal data in listings; any personal data embedded in listings
              remains covered by this Policy.
            </p>
            <p>
              <strong>e. Technical data (collected automatically).</strong>
            </p>
            <LegalList
              items={[
                "Authentication cookies (see Section 6) that keep you signed in.",
                "Server and hosting logs generated when you use the Platform, which can include your IP address, browser user agent, request paths, and — for AI features — logged prompt text and AI analysis output.",
                "Usage event records for AI features and platform activity, which may include your account identifier, IP address, user agent, model used, prompt text, generation parameters, token counts, and success/error status.",
              ]}
            />
            <p>
              <strong>What we do not collect:</strong> we run no analytics or
              advertising trackers, no tracking pixels, and no marketing
              identifiers. We do not use localStorage or fingerprinting. We do
              not sell or share personal information for advertising, and we do
              not use your data for targeted advertising of any kind.
            </p>
          </Section>

          <Section
            number="2"
            title="Why we process your data (purposes and lawful bases)"
          >
            <LegalList
              items={[
                "Creating and operating your account, signing you in, and gating vendor features — performance of our contract with you (GDPR) / your consent (DPDP Act).",
                "Analyzing photos you upload and generating design visualizations — performed only when you affirmatively upload an image or submit a prompt; your action is your specific consent to that processing (DPDP Act) / contract and consent (GDPR).",
                "Responding to contact-form inquiries — legitimate interest in responding to you / consent.",
                "Hosting and displaying vendor product listings — performance of the vendor relationship.",
                "Security, abuse prevention, debugging, and service integrity (including IP and user-agent logging) — legitimate interest / permitted uses under the DPDP Act.",
                "Complying with law, legal process, and enforceable government requests — legal obligation.",
              ]}
            />
            <p>
              We do not use your photos, prompts, or generated outputs to train
              our own AI models. If we ever propose to, we will ask for
              separate, specific, opt-in consent first, which you may refuse or
              withdraw without losing access to the Platform.
            </p>
          </Section>

          <Section
            number="3"
            title="AI processing — what happens to your photos and prompts"
          >
            <Conspicuous>
              Photos and prompts you submit to the AI Material Finder or AI
              Visualizer are transmitted to Google LLC and processed by
              Google&apos;s Gemini API to perform the analysis or generation you
              requested.
            </Conspicuous>
            <p>
              Specifically: your uploaded image (including any embedded
              metadata) and/or your text prompt are sent to Google&apos;s Gemini
              models to validate the content, detect materials and objects, or
              generate design imagery. Google processes this data under the{" "}
              <a
                className={linkClasses}
                href="https://ai.google.dev/gemini-api/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                Gemini API Terms of Service
              </a>{" "}
              and its data-handling commitments, which include limited-duration
              logging of prompts and outputs for abuse monitoring and legal
              compliance. Google&apos;s handling of this data — including
              whether content may be used to improve Google&apos;s services on
              certain service tiers — is governed by Google&apos;s terms, not
              ours, and we encourage you to review them.
            </p>
            <LegalList
              items={[
                "Do not include faces, identity documents, or other sensitive personal information in photos or prompts. Any such data is processed incidentally and at your initiative.",
                "Only upload photos you own or have the right to use, with the permission of any identifiable person shown.",
                "AI features are used solely to analyze images and generate visualizations. We make no decisions about you using automated processing that produce legal or similarly significant effects.",
              ]}
            />
          </Section>

          <Section number="4" title="Who receives your data">
            <p>We share personal data only with the following recipients:</p>
            <LegalList
              items={[
                "Supabase Inc. — database hosting, authentication, and file storage for account data, contact messages, vendor catalog records, usage events, and (where enabled) stored uploads and renders.",
                "Google LLC — Gemini API processing of images and prompts you submit to AI features (Section 3).",
                "Our web hosting provider — operates the servers that run the Platform and retains standard server logs.",
                "Third-party content hosts — some product images in listings are served from external retailer and CDN domains; when your browser loads or opens them, those hosts receive your IP address and user agent as part of the ordinary content request.",
                "YouTube (Google) — the About page contains a click-to-load embedded video; if you play it, YouTube receives your IP address and may set its own cookies under Google's privacy policy.",
                "Law enforcement or government authorities — where disclosure is required by applicable law or valid legal process; where legally permitted, we will tell you before disclosing.",
              ]}
            />
            <p>
              We do <strong>not</strong> sell personal data, share it for
              cross-context behavioral advertising, or provide it to data
              brokers.
            </p>
          </Section>

          <Section number="5" title="International data transfers">
            <p>
              Our service providers process data on infrastructure that may be
              located outside your country, including outside India. Transfers
              of personal data outside India are made in accordance with the
              DPDP Act and any restrictions notified by the Central Government.
              For EEA/UK users, transfers to our processors rely on safeguards
              such as Standard Contractual Clauses included in those
              processors&apos; data-processing agreements. Wherever your data is
              processed, it receives the protections described in this Policy.
            </p>
          </Section>

          <Section number="6" title="Cookies">
            <p>
              We set only <strong>strictly necessary</strong> first-party
              cookies: Supabase authentication cookies (names beginning with{" "}
              <code className="viz-mono text-[0.85em]">sb-</code>) that hold
              your session so you stay signed in. They are essential to
              providing the service and are not used for tracking or
              advertising. We set no analytics, preference, or marketing
              cookies. The only third-party cookies that can occur are set by
              YouTube if you choose to play the embedded video on our About
              page.
            </p>
          </Section>

          <Section number="7" title="How long we keep data">
            <LegalList
              items={[
                "Account data: for the life of your account, then deleted within 30 days of a verified deletion request.",
                "Contact-form messages: up to 24 months from submission, then deleted.",
                "Photos and prompts submitted to AI features: processed transiently to serve your request; where render-history storage is enabled, stored uploads and generated designs are kept until you request deletion.",
                "Vendor catalog records: for the duration of the vendor relationship, then removed or anonymized on request, subject to records we must keep by law.",
                "Usage events and server logs (including IP addresses): up to 12 months for usage events and up to 90 days for raw server logs, unless needed longer for security investigations or legal claims.",
                "Data we must retain to comply with Indian tax, accounting, or other statutory obligations, or to establish or defend legal claims, is kept for the legally required period.",
              ]}
            />
            <p>
              Google retains Gemini abuse-monitoring logs for a limited period
              under its own terms; that retention is outside our control.
            </p>
          </Section>

          <Section number="8" title="Your rights">
            <p>
              Under the DPDP Act, you have the right to: access a summary of
              your personal data and how it has been processed; correct,
              complete, and update it; request erasure; have grievances
              redressed (Section 13); nominate another individual to exercise
              your rights in the event of death or incapacity; and withdraw
              consent at any time, as easily as you gave it. Withdrawing consent
              stops future processing but does not affect processing already
              carried out, and may make consent-dependent features (such as AI
              analysis) unavailable.
            </p>
            <p>
              If the GDPR applies to you, you additionally have rights of
              access, rectification, erasure, restriction, portability, and
              objection, and the right to complain to your supervisory
              authority. If you are a California resident and the CCPA applies,
              you have the rights to know, delete, correct, and opt out of
              sale/sharing (we do not sell or share), without discrimination.
            </p>
            <p>
              <strong>How to exercise your rights:</strong> email{" "}
              <a className={linkClasses} href="mailto:hello@dsource.ai">
                hello@dsource.ai
              </a>{" "}
              from the address associated with your account, or include enough
              information for us to verify your identity. There is currently no
              in-app self-service deletion; all requests are handled through
              this channel. We respond within 30 days for most requests and
              never later than the timelines required by applicable law. We may
              decline requests that are manifestly unfounded, excessive, or that
              we cannot verify.
            </p>
          </Section>

          <Section number="9" title="Children">
            <p>
              The Platform is intended for users aged 18 and over. We do not
              knowingly collect personal data from anyone under 18, and accounts
              may not be created for them. If you believe a person under 18 has
              provided us personal data, contact us and we will delete it.
            </p>
          </Section>

          <Section number="10" title="Security">
            <p>
              We use reasonable security safeguards appropriate to the data we
              handle, including encryption in transit (TLS), encryption at rest
              by our storage providers, database row-level security, role-based
              access controls, and audit logging of administrative actions. No
              system is perfectly secure; you are responsible for keeping your
              password confidential.
            </p>
          </Section>

          <Section number="11" title="Personal data breaches">
            <p>
              If a personal data breach affects you, we will notify you without
              undue delay in plain language, describing the nature of the
              breach, its likely consequences, the measures we are taking, and
              the steps you can take to protect yourself, along with a contact
              for questions. We will also notify the Data Protection Board of
              India and any other authorities as required by applicable law,
              including the DPDP Act&apos;s reporting timelines and, where the
              GDPR applies, its 72-hour authority notification requirement.
            </p>
          </Section>

          <Section number="12" title="Changes to this Policy">
            <p>
              We will post any changes on this page with an updated version
              number and date, and for material changes we will give you advance
              notice by email or an in-Platform notice. Where a change requires
              fresh consent under applicable law, we will ask for it rather than
              assume it. Prior versions are available on request.
            </p>
          </Section>

          <Section number="13" title="Grievance Officer and contact">
            <p>
              In accordance with the DPDP Act and Rules, the Information
              Technology Act, 2000 and the Information Technology (Intermediary
              Guidelines and Digital Media Ethics Code) Rules, 2021, the contact
              details of our Grievance Officer are:
            </p>
            <LegalList
              items={["Email: hello@dsource.ai (attention: Grievance Officer)"]}
            />
            <p>
              We acknowledge grievances within 24 hours and resolve them within
              15 days (and in any event within the timelines required by
              applicable law). If you are not satisfied with our response, you
              may escalate to the Data Protection Board of India after
              exhausting this process.
            </p>
            <p>
              This Policy should be read together with our{" "}
              <Link className={linkClasses} href="/terms">
                Terms of Service
              </Link>
              .
            </p>
          </Section>
        </article>

        {/* Hand-off */}
        <div className="mt-14 max-w-3xl border-t border-[var(--viz-line)] pt-6 sm:mt-20">
          <p className="viz-serif max-w-2xl text-xl italic leading-relaxed text-[var(--viz-muted)]">
            For questions about how we handle your data, write to us any time.
          </p>
          <a
            href="mailto:hello@dsource.ai"
            className="viz-mono mt-3 inline-block text-xs tracking-[0.08em] uppercase underline decoration-[var(--viz-line)] underline-offset-4 transition-colors hover:text-[var(--viz-blue)] hover:decoration-[var(--viz-blue)]"
          >
            hello@dsource.ai →
          </a>
        </div>
      </div>
    </div>
  );
}
