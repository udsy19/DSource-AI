import Link from "next/link";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: "FAQ — DSource.AI",
  description:
    "Answers about DSource.AI's tools, brand partners, and how the platform works.",
};

// FAQ data organized by category
const faqData = {
  General: [
    {
      question: "What is DSource.AI?",
      answer:
        "DSource.AI is an AI-powered material sourcing and visualization platform designed for brands and designers. It helps you discover the right products, compare options, and move from inspiration to specification faster and more reliably.",
    },
    {
      question: "Is there a free trial?",
      answer:
        "Yes! We offer a 7-day free trial that gives you full access to all features including the AI Material Finder, AI Visualizer, and Spec Sheet Builder. No credit card required to start.",
    },
    {
      question: "How do I register to join?",
      answer:
        "Simply click the 'Sign Up' button in the top right corner of the page. You can register with your email address and start exploring DSource.AI immediately.",
    },
    {
      question: "Can I use DSource.ai for multiple projects?",
      answer:
        "Absolutely! You can create and manage multiple projects within your account. Each project can have its own collection of materials, specifications, and visualizations.",
    },
    {
      question: "Where can I get help if I'm stuck?",
      answer:
        "You can visit our Help Center for detailed guides and tutorials, or contact our support team directly through the Contact Us page. We're here to help you make the most of DSource.AI.",
    },
  ],
  "AI Tools": [
    {
      question: "What does the AI Visualizer do?",
      answer:
        "The AI Visualizer instantly turns your design ideas into 3D previews and design options. Upload an inspiration image or describe your vision, and our AI will generate realistic visualizations to help you explore possibilities.",
    },
    {
      question: "How does the AI Material Finder work?",
      answer:
        "Simply upload a photo of any interior space, and our AI identifies furniture and decor items in the image. It then matches these items with products available from local vendors, helping you find exactly what you're looking for.",
    },
    {
      question: "What is the Spec Sheet Builder?",
      answer:
        "The Spec Sheet Builder lets you collect and organize products from across the platform into professional specification documents. Save materials you like, add notes, and export ready-to-share spec sheets for your clients or team.",
    },
    {
      question: "What is the Material Marketplace on dsource.ai?",
      answer:
        "The Material Marketplace is a curated collection of interior materials and products from verified vendors. Browse by category, room type, or style to discover materials that fit your design vision.",
    },
    {
      question: "Is the AI always 100% accurate?",
      answer:
        "While our AI is highly advanced and continuously improving, it may occasionally suggest items that aren't exact matches. We recommend using AI suggestions as a starting point and verifying product details before making final decisions.",
    },
  ],
  "Brands Partners": [
    {
      question: "What are Brand Partners?",
      answer:
        "Brand Partners are verified manufacturers and suppliers who list their products on DSource.AI. They provide accurate product information, specifications, and images to help designers find the right materials.",
    },
    {
      question: "How do brands benefit from partnering with dsource.ai?",
      answer:
        "Brand Partners gain visibility among design professionals actively searching for materials. Our platform connects your products with designers at the moment of specification, driving qualified leads and sales.",
    },
    {
      question: "Can I request a specific brand to be added?",
      answer:
        "Yes! If there's a brand you'd like to see on DSource.AI, you can submit a request through our Contact Us page. We're always looking to expand our catalog with quality brands that designers want.",
    },
    {
      question: "How do you verify product information from Brand Partners?",
      answer:
        "We work directly with Brand Partners to ensure product information is accurate and up-to-date. Partners are responsible for maintaining their listings, and we conduct periodic reviews to maintain quality standards.",
    },
    {
      question: "How can a brand become a partner?",
      answer:
        "Brands interested in partnering with DSource.AI can apply through our Vendor Portal. Visit the Vendor Login page to request access and learn more about partnership opportunities.",
    },
  ],
  "How It Works": [
    {
      question: "How do I start a project?",
      answer:
        "After signing in, you can start by uploading an inspiration image to the AI Material Finder, browsing the Marketplace, or using the AI Visualizer to generate design concepts. Save items to your Spec Sheet as you discover them.",
    },
    {
      question: "How do I find materials quickly?",
      answer:
        "Use our AI Material Finder to upload any interior image and get instant product matches. You can also browse the Marketplace by category or room type, or use the search feature to find specific materials.",
    },
    {
      question: "How do I create documentation for my team or client?",
      answer:
        "Add products to your Spec Sheet as you browse. Once you've collected all the materials you need, you can organize them, add notes, and export a professional specification document to share with your team or clients.",
    },
    {
      question: "How do I save materials I like?",
      answer:
        "Click the 'Add to Spec' button on any product card to save it to your Spec Sheet. You can access your saved materials anytime from the Spec Sheet icon in the header.",
    },
    {
      question: "How do I share my project with a client or team?",
      answer:
        "Once you've built your specification sheet, you can export it as a shareable document. Share via email, download as PDF, or generate a link that allows others to view your selections.",
    },
  ],
};

const categories = Object.keys(faqData);

const slugify = (name) => name.toLowerCase().replace(/\s+/g, "-");

/** Ruled Q&A row: native details/summary — no state, no JS. */
const QuestionRow = ({ question, answer }) => (
  <details className="group border-b border-[var(--viz-line)]">
    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-4 text-sm transition-colors hover:text-[var(--viz-muted)] sm:text-base [&::-webkit-details-marker]:hidden">
      {question}
      <span
        aria-hidden="true"
        className="viz-mono shrink-0 text-sm text-[var(--viz-muted)] transition-transform duration-200 group-open:rotate-45"
      >
        +
      </span>
    </summary>
    <p className="max-w-2xl pb-5 text-sm leading-relaxed text-[var(--viz-ink)]/80 sm:text-base">
      {answer}
    </p>
  </details>
);

export default function FAQPage() {
  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pt-36 md:pb-24">
        {/* Folio masthead */}
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">FAQ</p>
            <p className="viz-label hidden sm:block">Answers · Support</p>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <h1 className="viz-serif text-4xl leading-none sm:text-5xl">
                Frequently asked questions
              </h1>
              <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
                Have questions about DSource AI tools or brand partners? Get
                answers fast.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Topic index — a typeset run of anchors down the document */}
        <nav aria-label="FAQ topics" className="mt-10 sm:mt-12">
          <p className="viz-label">Topics</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {categories.map((category) => (
              <li key={category}>
                <a
                  href={`#${slugify(category)}`}
                  className="viz-mono text-[11px] uppercase tracking-[0.08em] text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]"
                >
                  {category} ↓
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Question sections */}
        {categories.map((category) => (
          <section
            key={category}
            id={slugify(category)}
            className="mt-12 scroll-mt-24 sm:mt-16"
          >
            <div className="border-t border-[var(--viz-line)] pt-2">
              <h2 className="viz-label">{category}</h2>
            </div>
            <div className="mt-2">
              {faqData[category].map((item) => (
                <QuestionRow
                  key={item.question}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Hand-off */}
        <div className="mt-16 border-t border-[var(--viz-line)] pt-6 sm:mt-24">
          <p className="viz-serif text-xl italic text-[var(--viz-muted)]">
            Didn&rsquo;t find your answer?
          </p>
          <Link
            href="/help-center"
            className="viz-mono mt-3 inline-block text-xs tracking-[0.08em] uppercase underline decoration-[var(--viz-line)] underline-offset-4 transition-colors hover:text-[var(--viz-blue)] hover:decoration-[var(--viz-blue)]"
          >
            Visit the help center →
          </Link>
        </div>
      </div>
    </div>
  );
}
