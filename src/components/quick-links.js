import Link from "next/link";

const LinkSection = ({ heading, links }) => {
  return (
    <div>
      <h3 className="viz-label">{heading}</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              className="text-sm text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]"
              href={link.href}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const QuickLinks = () => {
  const linkSections = [
    {
      heading: "Product",
      links: [
        { label: "SnapFind", href: "/ai-material-finder/find" },
        { label: "RenderRoom", href: "/ai-visualizer" },
        { label: "QuoteBoard", href: "/spec-builder" },
        { label: "Vendor Directory", href: "/marketplace" },
      ],
    },
    {
      heading: "Support",
      links: [
        { label: "How it Works", href: "/ai-material-finder" },
        { label: "FAQ", href: "/faq" },
        { label: "Help Center", href: "/help-center" },
        { label: "Contact Us", href: "/help-center#contact" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Careers", href: "/about" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
      ],
    },
  ];

  return (
    <div
      className="viz-scope w-full px-4 py-6 sm:px-8 sm:py-8 md:px-16 md:py-12 lg:px-24"
      id="quick-links"
    >
      <div className="grid grid-cols-1 gap-6 px-4 sm:grid-cols-2 sm:gap-8 sm:px-8 md:grid-cols-3 md:px-12 lg:grid-cols-5">
        {linkSections.map((section) => (
          <LinkSection
            key={section.heading}
            heading={section.heading}
            links={section.links}
          />
        ))}
        <div className="hidden lg:block"></div>
        <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
          <Link href="/" className="block">
            <h2 className="viz-serif mb-2 text-xl sm:mb-4 sm:text-2xl">
              DSource.AI
            </h2>
            <p className="text-sm text-[var(--viz-muted)] sm:text-base">
              The ultimate platform for material sourcing and project
              visualization.
            </p>
          </Link>
        </div>
      </div>
      <div className="mt-12 mb-4 px-4 sm:mt-16 sm:mb-6 sm:px-8 md:mt-20 md:mb-8 md:px-12">
        <p className="viz-mono text-xs text-[var(--viz-muted)]">
          © 2026 DSource.AI. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default QuickLinks;
