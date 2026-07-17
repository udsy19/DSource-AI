import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";

import contactImage from "../../../public/spacejoy.jpg";

export const metadata = {
  title: "Help center — DSource.AI",
  description:
    "Support for designers, architects, brands, and suppliers using DSource.AI — and how to reach the studio directly.",
};

const helpCategories = [
  {
    title: "Designers & architects information",
    description:
      "Questions and support related to dsource.ai for interior designers and architects.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
      </svg>
    ),
  },
  {
    title: "Brands & suppliers inquiries",
    description:
      "Questions and support for brands, suppliers, and distributors.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875z" />
        <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 001.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 001.897 1.384C6.809 12.164 9.315 12.75 12 12.75z" />
        <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 15.914 9.315 16.5 12 16.5z" />
        <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 19.664 9.315 20.25 12 20.25z" />
      </svg>
    ),
  },
  {
    title: "AI tools help & support",
    description:
      "Learn how to use dsource.ai's AI features, get tips for best results, and find troubleshooting help.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export default function HelpCenterPage() {
  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pt-36 md:pb-24">
        {/* Folio masthead */}
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">Help center</p>
            <a
              href="#contact"
              className="viz-label hidden transition-colors hover:text-[var(--viz-ink)] sm:block"
            >
              Contact us →
            </a>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <h1 className="viz-serif text-4xl leading-none sm:text-5xl">
                Help center
              </h1>
              <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
                Any questions you have can be resolved here.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Contact — an honest channel: mail goes straight to the studio.
            (The old form only pretended to send; it was removed, not wired.) */}
        <section id="contact" className="mt-12 sm:mt-16">
          <div className="border-t border-[var(--viz-line)] pt-2">
            <p className="viz-label">Contact</p>
          </div>
          <h2 className="viz-serif mt-4 text-2xl sm:text-3xl">Contact us</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--viz-line)] lg:aspect-auto">
              <Image
                src={contactImage}
                alt="An interior styled with materials sourced through DSource.AI"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="viz-panel flex flex-col p-6 sm:p-8">
              <p className="viz-serif text-xl italic text-[var(--viz-muted)] sm:text-2xl">
                Write to the studio.
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--viz-ink)]/85 sm:text-base">
                Questions, feedback, requests for a brand you&rsquo;d like to
                see on the platform — send them straight to our inbox. Include
                your name and country if it helps us route your message.
              </p>
              <div className="mt-6 border-t border-[var(--viz-line)] pt-4">
                <p className="viz-label">Email</p>
                <a
                  href="mailto:hello@dsource.ai"
                  className="viz-mono mt-1 inline-block text-sm underline decoration-[var(--viz-line)] underline-offset-4 transition-colors hover:text-[var(--viz-blue)] hover:decoration-[var(--viz-blue)]"
                >
                  hello@dsource.ai
                </a>
              </div>
              <a
                href="mailto:hello@dsource.ai"
                className="mt-6 inline-block self-start rounded-full bg-[var(--viz-ink)] px-7 py-3 text-sm text-[var(--viz-paper)] transition-colors duration-200 hover:bg-[var(--viz-well)]"
              >
                Open your email app
              </a>
            </div>
          </div>
        </section>

        {/* Can we help? */}
        <section className="mt-14 sm:mt-20">
          <div className="border-t border-[var(--viz-line)] pt-2">
            <p className="viz-label">Topics</p>
          </div>
          <h2 className="viz-serif mt-4 text-2xl sm:text-3xl">Can we help?</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {helpCategories.map((category) => (
              <div key={category.title} className="viz-panel flex flex-col p-6">
                <h3 className="viz-serif text-lg leading-snug">
                  {category.title}
                </h3>
                <p className="mt-2 flex-grow text-sm leading-relaxed text-[var(--viz-muted)]">
                  {category.description}
                </p>
                <div className="mt-6 text-[var(--viz-muted)]">
                  {category.icon}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hand-off */}
        <div className="mt-16 border-t border-[var(--viz-line)] pt-6 sm:mt-24">
          <p className="viz-serif text-xl italic text-[var(--viz-muted)]">
            New to the studio? Start with how it works.
          </p>
          <Link
            href="/material-finder/tutorial"
            className="viz-mono mt-3 inline-block text-xs tracking-[0.08em] uppercase underline decoration-[var(--viz-line)] underline-offset-4 transition-colors hover:text-[var(--viz-blue)] hover:decoration-[var(--viz-blue)]"
          >
            How the studio works →
          </Link>
        </div>
      </div>
    </div>
  );
}
